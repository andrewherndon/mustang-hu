# Notes

Non-obvious findings: things that cost time to learn. One or two lines each; add to it as you go.

## Android Auto / OpenAuto

- **Touch pointer IDs must be 0–31.** Android aborts the receiving app with `Invalid pointer ID N for axis X`
  (showed up as Maps/Spotify/AA "randomly" crashing). OpenAuto now gives each finger the lowest free ID
  (fork commit `fd3dccc`, `InputDevice.cpp`).
- Resolution: 1080p (`Resolution=3`). At 1440p the phone sends no video. Keep 60 fps (30 fps was rejected).
- OpenAuto logs every frame at debug level; `~/openauto-logs.ini` (in `system/openauto/`) limits it to info.
- After `aa-restart` the phone can stay in accessory mode (`18d1:2d00`) and isn't picked up: replug it.
- Phone crash logs: enable USB debugging; the phone then shows as `18d1:2d01` (accessory + ADB) and
  `adb shell dumpsys dropbox --print system_app_native_crash` works while AA runs.
- Only touches on the AA video window reach the phone (by design, fork commit `635a016`).

## Touch (iptsd)

- Two touchscreens exist (`spi 045E:0C80 Touchscreen` raw, `IPTSD Virtual Touchscreen`); only IPTSD emits
  contacts, so no duplicates.
- No Surface Pro 11 profile in iptsd; defaults dropped fingers for ~10 ms mid-gesture (broken pinches/drags).
  Fixed with `system/touch/90-headunit.conf` → `/etc/iptsd.d/`. Live check: `sudo python3 /tmp/touchlive.py`
  (script in git history if gone).

## Android VM (Waydroid, Android 13)

- Display is fixed at 2880×1620; set with `waydroid prop set persist.waydroid.width/height` while the
  session runs (editing the cfg does nothing). No live resize; multi-window mode is unusable.
- Google sign-in hung on Waydroid #2453: remove `media.omx` from the vendor VINTF manifest (overlay).
- Launch apps with `am start -n <component>` (resolve via `cmd package resolve-activity --brief`);
  `waydroid app launch` closes and reopens the window.
- Location injection (`cmd location providers set-test-provider-location`) takes position only, no speed/bearing.
- Split view: `dumpsys activity service SystemUIService WMShell splitscreen moveToSideStage <task> 1`.
  Ratio can only be set by dragging the divider (`input swipe`); `am task resize` fights the split UI.
  Pane focus changes: logcat events `wm_set_resumed_activity` (only fires on a change).
- `ro.debuggable=1` was set for debugging; revert before the car install
  (backup `/var/lib/waydroid/waydroid_base.prop.bak-debug`, may be gone after the image switch).

## USB / power (bench, 2026-11)

- Top USB-C port = `ucsi.02` power supply, USB buses 3 (480M) + 4 (10G). Hub = Genesys `05e3:0610/0625`.
- Xilaghy 5-pin FPC ribbon: Surface sees no device in any orientation tried; no CC means no VBUS and no
  data from a Surface port. Needs a 16-pin USB 2.0 (both CC + both D± pairs) ribbon rated ≥3 A.
- Power-supply nodes: `ADP1` (Surface Connect), `BAT1`, `ucsi-source-psy-pmic_glink.ucsi.01/02`.

## UI / designs

- Designs live in `ui/src/designs/<id>/`, registered in `registry.ts`. Mock preview:
  `?mock&design=<id>` plus `&layout=<app>`, `&media`, `&aa`, `&shot` (no dev bar, no scaling).
- Generated art: sources in `ui/art-src/`, processed copies in `ui/public/art/`. `ui/tools/dither.sh` bakes
  Browserbase-style pixel art; `ui/tools/rim_fit.py` builds the perspective-correct spinning rims.

## Gotchas

- `pkill -f <pattern>` over ssh can match the ssh command itself; use `pkill -f "[x]yz"` or systemd units.
- Arch ARM mirror `arch-linux-repo.drzee.net` sometimes 403s: `sudo pacman -Sy` first.

## Before the car install

- Remove `/etc/sudoers.d/10-dev-nopasswd`; revert `ro.debuggable`; resume BitLocker on Windows.
