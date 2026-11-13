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
                    "volume": {"level": 0..1, "muted": bool},     (default PipeWire output)
                    "brightness": 0..1,                          (panel backlight)
                    "androidApps": [{pkg, title, icon}],          (installed in Waydroid)
                    "media": {source, package, app, title, artist, album, playing} | null,
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
                   {"type": "setVolume", "level": 0..1} / {"type": "setMute", "muted": bool}
                   {"type": "setBrightness", "level": 0..1}
                   {"type": "launchAndroid", "pkg": "com.google.android.youtube"}
                   Start Android if needed, open the app and show Android in the slot.
                   {"type": "media", "action": "play-pause" | "next" | "previous"}
                   Control whatever Android is playing (Spotify, YouTube, ...).
Volume and brightness are also polled, so changes from the hardware volume
buttons (bound in Sway) reach the shell.

Rectangles are in physical screen pixels (Sway runs at scale 1).
"""
import asyncio
import json
import logging
import os
import time

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
BACKLIGHT = "backlight"            # /sys/class/backlight/<name>
MIN_BRIGHTNESS = 0.03              # never let the screen go fully dark
POLL_SECONDS = 1.0

# Android (Waydroid): installed apps come from the .desktop shortcuts Waydroid
# writes for every app; their icons are served by hu-ui-server at /android-icons/.
ANDROID_DESKTOP_DIR = os.path.expanduser("~/.local/share/applications")
ANDROID_HIDDEN = {"com.android.documentsui", "com.android.gallery3d", "org.lineageos.jelly",
                  "org.lineageos.recorder", "org.lineageos.etar", "com.android.contacts"}
ANDROID_POLL_SECONDS = 2.0

KEYCODES = {"BackSpace": 14, "Tab": 15, "Return": 28, "Left": 105, "Right": 106}   # linux/input-event-codes.h
AUTO_OPEN_AA = True   # switch to Android Auto when a phone connects

def web_app(title, url, profile):
    """A Chromium --app window. Its app_id is "chrome-<host>__<path>-<profile>",
    with "/" in the path turned into "_" and no port (e.g. www.chess.com/play
    -> "chrome-www.chess.com__play-Default"), so match on host and path."""
    rest = url.split("://", 1)[1]
    host, _, path = rest.partition("/")
    host = host.split(":")[0]                    # Chromium leaves the port out
    prefix = f"chrome-{host}__{path.replace('/', '_')}"
    return {
        "title": title,
        "match": lambda props, app_id, t, prefix=prefix: (app_id or "").startswith(prefix),
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
    "chess": web_app("Chess.com", "https://www.chess.com/play", "chess"),
    # Offline chess vs Stockfish (ui/chess/), served by hu-ui-server on the Surface.
    "chess-offline": web_app("Chess", "http://localhost:8080/chess/", "chess-offline"),
    # Five in a row (gomoku), offline too (ui/gomoku/).
    "gomoku": web_app("Five in a Row", "http://localhost:8080/gomoku/", "gomoku"),
    # Android apps (Google Maps, ...) in Waydroid, GPU-accelerated; one window for all of Android.
    "android": {
        "title": "Android",
        "match": lambda props, app_id, title: app_id == "Waydroid",
        "launch": "hu-android",
    },
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
        # The app most recently asked for and when: some apps (Waydroid) show a
        # splash window, close it and open the real one; that window should
        # still be shown even though the layout fell back to "home" meanwhile.
        self.wanted = (None, 0.0)
        self.scanning = False    # picking up existing windows at startup (no auto-open)
        self.volume = {"level": 0.0, "muted": False}
        self.brightness = 1.0
        self.max_brightness = int(open(f"/sys/class/backlight/{BACKLIGHT}/max_brightness").read())
        self.type_lock = asyncio.Lock()   # keeps injected keystrokes in order
        self.android_apps = []            # [{"pkg", "title", "icon"}]
        self.launch_seq = 0               # newest Android launch request wins
        self.media = None                 # what Android is playing, if anything

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
            "volume": self.volume,
            "brightness": self.brightness,
            "androidApps": self.android_apps,
            "media": self.media,
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

    async def window_rect(self, con):
        """Current rect of a Sway container, or None if not visible."""
        proc = await asyncio.create_subprocess_exec(
            "swaymsg", "-r", "-t", "get_tree", stdout=asyncio.subprocess.PIPE)
        out, _ = await proc.communicate()
        stack = [json.loads(out)]
        while stack:
            n = stack.pop()
            if n.get("id") == con:
                return n["rect"] if n.get("visible") else None
            stack += n.get("nodes", []) + n.get("floating_nodes", [])
        return None

    async def place(self, app, con):
        """Show one app's window in the slot."""
        r = self.slot_rect()
        command = (f"[con_id={con}] move to workspace current, floating enable, border none, "
                   f"resize set {r['width']} {r['height']}, "
                   f"move absolute position {r['x']} {r['y']}, focus")
        # Apps (OpenAuto in particular) may resize themselves right after
        # appearing, so re-apply the placement a few times while they settle.
        # Only touch the window when it is not already exactly in place: every
        # move/resize is a configure event, which Android (Waydroid) reacts to
        # with a visible glitch (its notification shade flashes).
        for wait in (0, 0.5, 1.0, 1.5):          # checked at 0, 0.5, 1.5, 3 s
            await asyncio.sleep(wait)
            if self.windows.get(app) != con or self.layout != app:
                return
            cur = await self.window_rect(con)
            if cur and all(cur[k] == r[k] for k in ("x", "y", "width", "height")):
                continue
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
        self.wanted = (layout, time.monotonic())
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
            wanted_app, wanted_at = self.wanted
            if app == "aa" and AUTO_OPEN_AA and not self.scanning:
                await self.set_layout("aa")
            elif app == wanted_app and time.monotonic() - wanted_at < 30 and self.layout == "home":
                await self.set_layout(app)
            else:
                await self.broadcast()
                asyncio.create_task(self.apply_layout())
        elif change == "close" and self.windows.get(app) == con["id"]:
            log.info("%s window closed", app)
            del self.windows[app]
            if self.layout == app:
                wanted = self.wanted
                await self.set_layout("home")
                self.wanted = wanted                  # a replacement window may follow
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

        self.scanning = True      # a daemon restart is not a new phone connection
        for node in walk(json.loads(out)):
            if node.get("type") in ("con", "floating_con") and node.get("pid"):
                await self.on_window("new", node)
        self.scanning = False

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

    # ---------- volume (PipeWire via wpctl) and brightness (logind) ----------
    @staticmethod
    async def cmd(*args):
        proc = await asyncio.create_subprocess_exec(
            *args, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        out, err = await proc.communicate()
        if proc.returncode != 0:
            log.warning("%s failed: %s", args, err.decode().strip())
        return out.decode().strip()

    async def read_volume(self):
        out = await self.cmd("wpctl", "get-volume", "@DEFAULT_AUDIO_SINK@")   # "Volume: 0.45 [MUTED]"
        try:
            return {"level": min(float(out.split()[1]), 1.0), "muted": "MUTED" in out}
        except (IndexError, ValueError):
            return self.volume

    def read_brightness(self):
        raw = int(open(f"/sys/class/backlight/{BACKLIGHT}/brightness").read())
        return round(raw / self.max_brightness, 3)

    async def set_volume(self, level):
        level = max(0.0, min(1.0, float(level)))
        await self.cmd("wpctl", "set-volume", "@DEFAULT_AUDIO_SINK@", f"{level:.3f}")
        if level > 0 and self.volume["muted"]:
            await self.cmd("wpctl", "set-mute", "@DEFAULT_AUDIO_SINK@", "0")
        await self.refresh_controls()

    async def set_mute(self, muted):
        await self.cmd("wpctl", "set-mute", "@DEFAULT_AUDIO_SINK@", "1" if muted else "0")
        await self.refresh_controls()

    async def set_brightness(self, level):
        level = max(MIN_BRIGHTNESS, min(1.0, float(level)))
        # logind lets the active session's user set the backlight without root.
        await self.cmd("busctl", "call", "org.freedesktop.login1", "/org/freedesktop/login1/session/auto",
                       "org.freedesktop.login1.Session", "SetBrightness", "ssu",
                       "backlight", BACKLIGHT, str(round(level * self.max_brightness)))
        await self.refresh_controls()

    async def refresh_controls(self):
        volume, brightness = await self.read_volume(), self.read_brightness()
        if volume != self.volume or brightness != self.brightness:
            self.volume, self.brightness = volume, brightness
            await self.broadcast()

    async def poll_controls(self):
        while True:
            try:
                await self.refresh_controls()
            except Exception:
                log.exception("polling volume/brightness failed")
            await asyncio.sleep(POLL_SECONDS)

    # ---------- Android apps and media (Waydroid) ----------
    @staticmethod
    def read_android_apps():
        apps = []
        try:
            names = sorted(os.listdir(ANDROID_DESKTOP_DIR))
        except FileNotFoundError:
            return apps
        for name in names:
            if not (name.startswith("waydroid.") and name.endswith(".desktop")):
                continue
            pkg = name[len("waydroid."):-len(".desktop")]
            if pkg in ANDROID_HIDDEN:
                continue
            title = pkg
            with open(os.path.join(ANDROID_DESKTOP_DIR, name), errors="replace") as f:
                for line in f:
                    if line.startswith("Name="):
                        title = line[5:].strip()
                        break
            apps.append({"pkg": pkg, "title": title, "icon": f"/android-icons/{pkg}.png"})
        return sorted(apps, key=lambda a: a["title"].lower())

    async def android_shell(self, *args, timeout=8):
        proc = await asyncio.create_subprocess_exec(
            "sudo", "-n", "waydroid", "shell", "--", *args,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
        try:
            out, _ = await asyncio.wait_for(proc.communicate(), timeout)
        except asyncio.TimeoutError:
            proc.kill()
            return ""
        return out.decode(errors="replace")

    def parse_media(self, dump):
        """Pick the playing (else most recently active) session from `dumpsys media_session`."""
        sessions, cur = [], None
        for raw in dump.splitlines():
            line = raw.strip()
            if line.startswith("package="):
                cur = {"package": line[8:], "state": None, "description": None, "active": False}
                sessions.append(cur)
            elif cur is None:
                continue
            elif line.startswith("active="):
                cur["active"] = line.endswith("true")
            elif line.startswith("state=PlaybackState {state="):
                cur["state"] = int(line.split("state=")[2].split(",")[0])
            elif line.startswith("metadata:") and "description=" in line:
                cur["description"] = line.split("description=", 1)[1]
        sessions = [x for x in sessions if x["description"] and x["description"] != "null"]
        if not sessions:
            return None
        x = sorted(sessions, key=lambda x: (x["state"] != 3, not x["active"]))[0]   # 3 = STATE_PLAYING
        parts = [p.strip() for p in x["description"].split(",")]
        titles = {a["pkg"]: a["title"] for a in self.android_apps}
        return {"source": "android", "package": x["package"], "app": titles.get(x["package"], x["package"]),
                "title": parts[0], "artist": parts[1] if len(parts) > 1 else "",
                "album": parts[2] if len(parts) > 2 else "", "playing": x["state"] == 3}

    async def poll_android(self):
        while True:
            try:
                apps = self.read_android_apps()
                media = None
                if "android" in self.windows:
                    media = self.parse_media(await self.android_shell("dumpsys", "media_session"))
                if apps != self.android_apps or media != self.media:
                    self.android_apps, self.media = apps, media
                    await self.broadcast()
            except Exception:
                log.exception("polling Android failed")
            await asyncio.sleep(ANDROID_POLL_SECONDS)

    async def resumed_android_package(self):
        out = await self.android_shell("dumpsys", "activity", "activities", timeout=4)
        for line in out.splitlines():
            if "mResumedActivity" in line or "topResumedActivity" in line:
                for word in line.split():
                    if "/" in word:
                        return word.split("/")[0]
        return None

    async def start_android_app(self, pkg):
        """Bring an app to the front inside Android. (`waydroid app launch`
        would close and reopen the whole Android window, which flashes the
        notification shade and briefly shows the wrong size.)"""
        comp = getattr(self, "_components", {}).get(pkg)
        if not comp:
            out = await self.android_shell("cmd", "package", "resolve-activity", "--brief",
                                           "-c", "android.intent.category.LAUNCHER", pkg)
            lines = [l.strip() for l in out.splitlines() if "/" in l]
            comp = lines[-1] if lines else None
            if comp:
                self._components = {**getattr(self, "_components", {}), pkg: comp}
        if comp:
            await self.android_shell("am", "start", "-n", comp)
        else:
            await self.cmd("waydroid", "app", "launch", pkg)    # fallback

    async def launch_android(self, pkg):
        """Open an Android app: start Android if needed, open the app and show
        Android once that app is in front (not the previous one). Rapid taps:
        only the newest request is carried out."""
        if not any(a["pkg"] == pkg for a in self.android_apps):
            return
        self.launch_seq += 1
        mine = self.launch_seq
        if "android" not in self.windows:
            await self.set_layout("android")              # starts Waydroid (hu-android)
            for _ in range(120):                           # first boot can take ~20 s
                if "android" in self.windows or mine != self.launch_seq:
                    break
                await asyncio.sleep(0.5)
            await asyncio.sleep(2)
        if mine != self.launch_seq:
            return                                         # a newer tap took over
        await self.start_android_app(pkg)
        for _ in range(12):                                # up to ~3 s
            if mine != self.launch_seq:
                return
            if await self.resumed_android_package() == pkg:
                break
            await asyncio.sleep(0.25)
        if mine == self.launch_seq and self.layout != "android":
            await self.set_layout("android")

    async def media_control(self, action):
        if action in ("play-pause", "next", "previous") and "android" in self.windows:
            await self.android_shell("cmd", "media_session", "dispatch", action)
            await asyncio.sleep(0.4)
            self.media = self.parse_media(await self.android_shell("dumpsys", "media_session"))
            await self.broadcast()

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
                elif msg.get("type") == "setVolume" and isinstance(msg.get("level"), (int, float)):
                    await self.set_volume(msg["level"])
                elif msg.get("type") == "setMute":
                    await self.set_mute(bool(msg.get("muted")))
                elif msg.get("type") == "launchAndroid" and isinstance(msg.get("pkg"), str):
                    asyncio.create_task(self.launch_android(msg["pkg"]))
                elif msg.get("type") == "media":
                    await self.media_control(msg.get("action"))
                elif msg.get("type") == "setBrightness" and isinstance(msg.get("level"), (int, float)):
                    await self.set_brightness(msg["level"])
        except websockets.ConnectionClosed:
            pass                                   # shell reloaded or went away
        finally:
            self.clients.discard(ws)

    async def run(self):
        await self.scan_existing()
        await self.refresh_controls()
        asyncio.create_task(self.poll_controls())
        self.android_apps = self.read_android_apps()
        asyncio.create_task(self.poll_android())
        async with websockets.serve(self.handle_client, HOST, PORT):
            log.info("listening on ws://%s:%d", HOST, PORT)
            await self.watch_sway()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    asyncio.run(Daemon().run())
