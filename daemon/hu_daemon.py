#!/usr/bin/env python3
"""Head-unit daemon: the bridge between the React shell and the system.

The shell is a web page, so it cannot move windows or touch hardware. It talks
to this daemon over a WebSocket instead.

App slot
--------
The screen has one "app slot": the 16:9 area at the top (SLOT_RECT). The shell
(Chromium, the only tiled window) fills the screen behind it and keeps the dock
in the strip below. The current layout is either "home" (slot empty) or the id
of the app shown in the slot. Apps that are running but not shown are parked in
Sway's scratchpad, so they keep running (phone session, video, login, ...).

Apps (APPS below):
  * "aa"       Android Auto. OpenAuto opens an X11 window titled
               "openauto-video" while a phone is connected and closes it on
               disconnect. Not launched by us (aa-supervisor runs OpenAuto).
  * web apps   e.g. "stremio": a Chromium --app window with its own profile,
               launched on first use via hu-webapp, identified by its app_id.

All other OpenAuto windows (its menu "MainWindow", "Warning" pop-ups) are hidden.

Protocol (JSON text frames on ws://localhost:8765)
--------------------------------------------------
  daemon -> shell  {"type": "state",
                    "layout": "home" | <app id>,
                    "apps": {<id>: {"title": str, "running": bool}},
                    "aa": {"connected": bool},                 (same as apps.aa.running)
                    "aaRect": {x, y, width, height},           (the app slot, keyboard closed)
                    "keyboard": {"open": bool, "available": bool, "height": int},
                    "screen": {width, height}}
  shell -> daemon  {"type": "setLayout", "layout": "home" | <app id>}
                   Opening an app that is not running launches it first.
                   {"type": "keyboard", "open": bool}
                   The shell draws its own on-screen keyboard in the bottom
                   KEYBOARD_HEIGHT px; the app in the slot is shrunk to the
                   space above it. Only for web apps (Android Auto has its own).
                   {"type": "key", "text": "a"}  or  {"type": "key", "key": "BackSpace"}
                   Type into the app in the slot: focus it, then inject the key
                   with ydotool ("key": BackSpace, Return, Tab, Left, Right).

Rectangles are in physical screen pixels (Sway runs at scale 1).
"""
import asyncio
import json
import logging
import os

import websockets

HOST, PORT = "127.0.0.1", 8765
SCREEN = {"width": 2880, "height": 1920}
# 16:9 at full width leaves a 300 px strip below for the dock.
SLOT_RECT = {"x": 0, "y": 0, "width": 2880, "height": 1620}
# The shell's keyboard panel replaces the dock and takes the bottom of the screen;
# while it is open the app is resized to the space above it.
KEYBOARD_HEIGHT = 760

# Keys are injected with ydotool: a kernel-level (uinput) virtual keyboard, so
# every app sees ordinary key presses in the normal US layout. (wtype's
# temporary per-character keymap broke punctuation in Chromium's own UI.)
YDOTOOL_ENV = {**os.environ, "YDOTOOL_SOCKET": "/run/ydotool/socket"}
KEYCODES = {"BackSpace": 14, "Tab": 15, "Return": 28, "Left": 105, "Right": 106}   # linux/input-event-codes.h
AUTO_OPEN_AA = True   # switch to Android Auto when a phone connects

def web_app(title, url, profile, host=None):
    """A Chromium --app window; its app_id is "chrome-<host>__-<profile dir>"."""
    host = host or url.split("/")[2]
    return {
        "title": title,
        "match": lambda props, app_id, t, host=host: (app_id or "").startswith(f"chrome-{host}__"),
        "launch": f"hu-webapp {profile} {url}",
    }


# Order here is the order the shell shows them in.
APPS = {
    "aa": {
        "title": "Android Auto",
        "match": lambda props, app_id, title: props.get("class") == "autoapp" and title == "openauto-video",
        "launch": None,
    },
    "stremio": web_app("Stremio", "https://web.stremio.com/", "stremio"),
    "youtube": web_app("YouTube", "https://www.youtube.com/", "google"),
    "gmail": web_app("Gmail", "https://mail.google.com/", "google"),
    "calendar": web_app("Calendar", "https://calendar.google.com/", "google"),
    "chess": web_app("Chess", "https://www.chess.com/play", "chess"),
    # A normal browser window (tabs, address bar); plain Chromium windows have app_id "chromium".
    "browser": {
        "title": "Chrome",
        "match": lambda props, app_id, title: app_id == "chromium",
        "launch": "hu-webapp browser --browser https://www.google.com/",
    },
}

log = logging.getLogger("hu-daemon")


class Daemon:
    def __init__(self):
        self.windows = {}        # app id -> Sway container id of its window
        self.layout = "home"
        self.clients = set()
        self.launching = set()   # app ids launched but whose window has not appeared yet
        self.keyboard = False
        self.type_lock = asyncio.Lock()   # keeps injected keystrokes in order

    # ---------- state ----------
    def state(self):
        return {
            "type": "state",
            "layout": self.layout,
            "apps": {app: {"title": spec["title"], "running": app in self.windows}
                     for app, spec in APPS.items()},
            "aa": {"connected": "aa" in self.windows},
            "aaRect": SLOT_RECT,
            "keyboard": {"open": self.keyboard, "available": self.keyboard_available(),
                         "height": KEYBOARD_HEIGHT},
            "screen": SCREEN,
        }

    def keyboard_available(self):
        """A keyboard makes sense for a web app shown in the slot."""
        return self.layout in self.windows and APPS[self.layout]["launch"] is not None

    def slot_rect(self):
        if self.keyboard:
            return {**SLOT_RECT, "height": SCREEN["height"] - KEYBOARD_HEIGHT}
        return SLOT_RECT

    async def broadcast(self):
        message = json.dumps(self.state())
        for ws in list(self.clients):
            try:
                await ws.send(message)
            except websockets.ConnectionClosed:
                self.clients.discard(ws)

    # ---------- sway ----------
    @staticmethod
    async def sway(command):
        proc = await asyncio.create_subprocess_exec(
            "swaymsg", command,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        out, _ = await proc.communicate()
        if proc.returncode != 0:
            log.warning("swaymsg %r failed: %s", command, out.decode().strip())

    async def place(self, app, con):
        """Show one app's window in the slot."""
        r = self.slot_rect()
        command = (f"[con_id={con}] move to workspace current, floating enable, border none, "
                   f"resize set {r['width']} {r['height']}, "
                   f"move absolute position {r['x']} {r['y']}, focus")
        # Apps (OpenAuto in particular) may resize themselves right after
        # appearing, so re-apply the placement a few times while they settle.
        for wait in (0, 0.5, 1.0, 1.5):          # applied at 0, 0.5, 1.5, 3 s
            await asyncio.sleep(wait)
            if self.windows.get(app) != con or self.layout != app:
                return
            await self.sway(command)

    async def apply_layout(self):
        for app, con in list(self.windows.items()):
            if app != self.layout:
                await self.sway(f"[con_id={con}] move scratchpad")
        if self.layout == "home":
            await self.sway("[tiling] focus")      # the shell (Chromium) is the only tiled window
        elif self.layout in self.windows:
            await self.place(self.layout, self.windows[self.layout])

    async def set_layout(self, layout):
        if layout != "home" and layout not in APPS:
            return
        if layout != "home" and layout not in self.windows:
            launch = APPS[layout]["launch"]
            if launch is None:
                layout = "home"                   # Android Auto: nothing to show without a phone
            elif layout not in self.launching:
                log.info("launching %s", layout)
                self.launching.add(layout)
                await self.sway(f"exec {launch}")
        self.layout = layout
        self.keyboard = False                     # the keyboard belongs to one app session
        log.info("layout -> %s", layout)
        await self.broadcast()
        # In the background: placement retries for a few seconds and must not
        # block the Sway event stream or other clients meanwhile.
        asyncio.create_task(self.apply_layout())

    def identify(self, con):
        props = con.get("window_properties") or {}
        app_id = con.get("app_id")
        title = con.get("name") or props.get("title")
        for app, spec in APPS.items():
            if spec["match"](props, app_id, title):
                return app
        if props.get("class") == "autoapp":
            return "openauto-other"
        return None

    async def on_window(self, change, con):
        app = self.identify(con)
        if app is None:
            return
        if app == "openauto-other":
            # OpenAuto's menu ("MainWindow"), "Warning" pop-ups etc.: the shell replaces them.
            if change in ("new", "title") and con.get("scratchpad_state", "none") == "none":
                await self.sway(f"[con_id={con['id']}] move scratchpad")
            return

        if change in ("new", "title") and self.windows.get(app) != con["id"]:
            log.info("%s window appeared (%s)", app, con["id"])
            self.windows[app] = con["id"]
            self.launching.discard(app)
            if app == "aa" and AUTO_OPEN_AA:
                await self.set_layout("aa")
            else:
                await self.broadcast()
                asyncio.create_task(self.apply_layout())
        elif change == "close" and self.windows.get(app) == con["id"]:
            log.info("%s window closed", app)
            del self.windows[app]
            if self.layout == app:
                await self.set_layout("home")
            else:
                await self.broadcast()

    async def scan_existing(self):
        """Pick up windows that already exist when the daemon starts."""
        proc = await asyncio.create_subprocess_exec(
            "swaymsg", "-r", "-t", "get_tree", stdout=asyncio.subprocess.PIPE)
        out, _ = await proc.communicate()

        def walk(node):
            yield node
            for child in node.get("nodes", []) + node.get("floating_nodes", []):
                yield from walk(child)

        for node in walk(json.loads(out)):
            if node.get("type") in ("con", "floating_con") and node.get("pid"):
                await self.on_window("new", node)

    async def watch_sway(self):
        while True:
            proc = await asyncio.create_subprocess_exec(
                "swaymsg", "-r", "-m", "-t", "subscribe", '["window"]',
                stdout=asyncio.subprocess.PIPE)
            async for line in proc.stdout:
                try:
                    event = json.loads(line)
                    await self.on_window(event.get("change"), event.get("container") or {})
                except Exception:
                    log.exception("bad sway event")
            log.warning("sway subscription ended; retrying")
            await asyncio.sleep(2)

    # ---------- on-screen keyboard (drawn by the shell, typed via ydotool) ----------
    async def set_keyboard(self, open_):
        open_ = bool(open_) and self.keyboard_available()
        if open_ == self.keyboard:
            return
        self.keyboard = open_
        log.info("keyboard %s", "open" if open_ else "closed")
        await self.broadcast()
        asyncio.create_task(self.apply_layout())   # resize the app around the keyboard

    async def type_key(self, msg):
        """Inject one key into the app in the slot.

        Tapping the keyboard focuses the shell, so first hand focus back to the
        app; Chromium keeps the caret in the text field it had focused."""
        if not self.keyboard or self.layout not in self.windows:
            return
        text, key = msg.get("text"), msg.get("key")
        if isinstance(text, str) and text and text.isascii() and text.isprintable():
            args = ["type", "--key-delay", "2", "--key-hold", "2", "--", text]
        elif key in KEYCODES:
            code = KEYCODES[key]
            args = ["key", "--key-delay", "2", f"{code}:1", f"{code}:0"]
        else:
            return
        async with self.type_lock:
            await self.sway(f"[con_id={self.windows[self.layout]}] focus")
            proc = await asyncio.create_subprocess_exec(
                "ydotool", *args, env=YDOTOOL_ENV, stderr=asyncio.subprocess.PIPE)
            _, err = await proc.communicate()
            if proc.returncode != 0:
                log.warning("ydotool %s failed: %s", args, err.decode().strip())

    # ---------- websocket ----------
    async def handle_client(self, ws):
        self.clients.add(ws)
        log.info("shell connected (%d)", len(self.clients))
        try:
            await ws.send(json.dumps(self.state()))
            async for raw in ws:
                try:
                    msg = json.loads(raw)
                except ValueError:
                    continue
                if msg.get("type") == "setLayout":
                    await self.set_layout(msg.get("layout"))
                elif msg.get("type") == "keyboard":
                    await self.set_keyboard(msg.get("open"))
                elif msg.get("type") == "key":
                    await self.type_key(msg)
        except websockets.ConnectionClosed:
            pass                                   # shell reloaded or went away
        finally:
            self.clients.discard(ws)

    async def run(self):
        await self.scan_existing()
        async with websockets.serve(self.handle_client, HOST, PORT):
            log.info("listening on ws://%s:%d", HOST, PORT)
            await self.watch_sway()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    asyncio.run(Daemon().run())
