# Mustang head unit

A custom car head unit for a 1995 Mustang GT: a Surface Pro 11 running Arch Linux
(aarch64), Sway, Android Auto via OpenAuto, and a React "shell" UI in Chromium.

## Architecture

```
Sway (compositor, scale 1, 2880x1920 panel, no bar/borders)
├── Chromium --app (hu-shell)        the React shell — the only tiled window, fills the screen
├── OpenAuto video window            floating, placed by hu-daemon at AA_RECT (top 2880x1620, 16:9)
│     └── runs in a rootful Debian distrobox "aa-root"; fork with our patches:
│         github.com/andrewherndon/openauto  branch low-latency-video
└── hu-daemon (Python, ws://localhost:8765)
      tracks Android Auto, places/hides its window via swaymsg, talks to the shell
```

- **ui/** — Vite + React + TypeScript. The shell: home screen, dock, everything around AA.
- **daemon/hu_daemon.py** — WebSocket bridge to Sway/hardware. Protocol documented at the top of the file.
- **system/** — scripts installed to `/usr/local/bin` on the Surface, Sway config, `deploy.sh`.

## UI constraints (important for design work)

- The stage is **1440×960 CSS px** (Chromium runs at device scale factor 2 on a 2880×1920 panel, 3:2).
- When Android Auto is open, it covers the **top 1440×810** (16:9). The UI owns the
  **bottom 150 px strip (the dock)** in every layout. Rects come from the daemon (`aaRect`, physical px).
- Android Auto is a separate native window. It cannot be animated, clipped or drawn over by CSS;
  it appears/disappears instantly when the daemon moves it. Animate the shell around it instead.
- **On-screen keyboard** (`ui/src/components/Keyboard.tsx`) replaces the dock when open; the daemon
  shrinks the app above it to `screen.height - keyboard.height` and types keys into it with `wtype`.
  Only offered for web apps (Android Auto has its own keyboard).
- Touch-first: no hover states, large targets (≥ 80 px), no scrolling/zoom gestures (`touch-action: none`).
- Must work offline (car): bundle fonts/assets, no CDNs at runtime.
- Performance matters (60–120 Hz panel): prefer CSS transforms/opacity; draw fast-changing
  gauges on canvas rather than re-rendering React trees at sensor rates.

## Dev workflow

- `cd ui && npm run dev` on the Mac. The Surface's Chromium loads it over Tailscale
  (`~/.config/headunit/shell-url` = `http://100.117.223.114:5173/`), so saves hot-reload on the car screen.
- Design in a desktop browser with **`http://localhost:5173/?mock`** — mock daemon + a "Plug in phone" toggle.
- `system/deploy.sh` — install daemon/scripts/Sway config on the Surface (`andre@100.123.180.33`) and restart them.
- On the Surface: `aa-restart` (restart OpenAuto), `aa-rebuild` (rebuild/install OpenAuto from `~/src/openauto`),
  logs in `/tmp/hu-daemon.log`, `/tmp/hu-shell.log`, `/tmp/aa-supervisor.log`, `~/autoapp.log`.
