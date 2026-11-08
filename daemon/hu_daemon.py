#!/usr/bin/env python3
"""Head-unit daemon: the bridge between the React shell and the system.

The shell is a web page, so it cannot move windows or touch hardware. It talks
to this daemon over a WebSocket instead. The daemon:

  * tracks Android Auto: OpenAuto shows phone video in an X11 window titled
    "openauto-video" while a phone is connected, and closes it on disconnect;
  * owns window placement through Sway IPC (swaymsg):
      - layout "aa":   the video window floats at the top of the screen in a
                       16:9 rectangle (AA_RECT); the shell's dock stays visible
                       in the strip below it;
      - layout "home": the video window is parked in Sway's scratchpad
                       (hidden, but OpenAuto keeps the phone session alive);
  * hides OpenAuto's own menu window ("MainWindow"), which the shell replaces;
  * broadcasts state to every connected shell and accepts layout commands.

Protocol (JSON text frames on ws://localhost:8765):
  daemon -> shell  {"type": "state", "aa": {"connected": bool},
                    "layout": "home" | "aa", "aaRect": {x, y, width, height},
                    "screen": {width, height}}
  shell -> daemon  {"type": "setLayout", "layout": "home" | "aa"}

Rectangles are in physical screen pixels (Sway runs at scale 1); the shell
converts with window.devicePixelRatio.
"""
import asyncio
import json
import logging

import websockets

HOST, PORT = "127.0.0.1", 8765
SCREEN = {"width": 2880, "height": 1920}
# Android Auto is 16:9; full width leaves a 300 px strip below for the dock.
AA_RECT = {"x": 0, "y": 0, "width": 2880, "height": 1620}
VIDEO_TITLE = "openauto-video"
AUTO_OPEN_AA = True   # switch to Android Auto when a phone connects

log = logging.getLogger("hu-daemon")


class Daemon:
    def __init__(self):
        self.video_con = None   # Sway container id of the Android Auto window
        self.layout = "home"
        self.clients = set()

    # ---------- state ----------
    def state(self):
        return {
            "type": "state",
            "aa": {"connected": self.video_con is not None},
            "layout": self.layout,
            "aaRect": AA_RECT,
            "screen": SCREEN,
        }

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

    async def apply_layout(self):
        """Put the Android Auto window where the current layout wants it."""
        con = self.video_con
        if con is None:
            return
        if self.layout == "aa":
            r = AA_RECT
            place = (f"[con_id={con}] move to workspace current, floating enable, border none, "
                     f"resize set {r['width']} {r['height']}, "
                     f"move absolute position {r['x']} {r['y']}, focus")
            # OpenAuto resizes its window to the full screen just after showing
            # it, so re-apply the placement a few times while it settles.
            for wait in (0, 0.5, 1.0, 1.5):          # applied at 0, 0.5, 1.5, 3 s
                await asyncio.sleep(wait)
                if self.video_con != con or self.layout != "aa":
                    return
                await self.sway(place)
        else:
            await self.sway(f"[con_id={con}] move scratchpad")
            await self.sway("[tiling] focus")   # the shell (Chromium) is the only tiled window

    async def set_layout(self, layout):
        if layout not in ("home", "aa"):
            return
        if layout == "aa" and self.video_con is None:
            layout = "home"           # nothing to show without a phone
        self.layout = layout
        log.info("layout -> %s", layout)
        await self.broadcast()
        # In the background: placement retries for a few seconds and must not
        # block the Sway event stream or other clients meanwhile.
        asyncio.create_task(self.apply_layout())

    async def on_window(self, change, con):
        props = con.get("window_properties") or {}
        title = con.get("name") or props.get("title")
        if props.get("class") != "autoapp":
            return
        if title != VIDEO_TITLE and change in ("new", "title"):
            # OpenAuto's own menu ("MainWindow"), its "Warning" pop-ups and any
            # other window of it: the shell replaces all of these, keep them hidden.
            if con.get("scratchpad_state", "none") == "none":
                await self.sway(f"[con_id={con['id']}] move scratchpad")
        elif title == VIDEO_TITLE and change in ("new", "title") and con["id"] != self.video_con:
            log.info("Android Auto connected (window %s)", con["id"])
            self.video_con = con["id"]
            await self.set_layout("aa" if AUTO_OPEN_AA else self.layout)
        elif change == "close" and con["id"] == self.video_con:
            log.info("Android Auto disconnected")
            self.video_con = None
            await self.set_layout("home")

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
            if node.get("type") in ("con", "floating_con") and node.get("window_properties"):
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
