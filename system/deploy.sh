#!/bin/bash
# Install the daemon, scripts and Sway config on the Surface. Run from the Mac:
#   system/deploy.sh [host]          (default host: andre@mustang over Tailscale)
# Idempotent: safe to run after every change. Restarts the daemon and shell.
set -euo pipefail
HOST=${1:-andre@100.123.180.33}
ROOT=$(cd "$(dirname "$0")/.." && pwd)

ssh "$HOST" mkdir -p /tmp/hu-deploy
rsync -a --delete "$ROOT/daemon/" "$HOST:/tmp/hu-deploy/daemon/"
rsync -a "$ROOT/system/" "$HOST:/tmp/hu-deploy/system/"

ssh "$HOST" bash -s <<'REMOTE'
set -euo pipefail
sudo install -d /opt/headunit
sudo rsync -a --delete /tmp/hu-deploy/daemon/ /opt/headunit/daemon/
sudo install -m755 /tmp/hu-deploy/system/bin/* /usr/local/bin/
sudo rm -f /usr/local/bin/aa-video-watch            # replaced by hu-daemon
for unit in /tmp/hu-deploy/system/systemd/*.service; do
  sudo install -m644 "$unit" /etc/systemd/system/
done
sudo systemctl daemon-reload
sudo systemctl enable --now ydotoold.service >/dev/null 2>&1
install -D -m644 /tmp/hu-deploy/system/sway/headunit.conf ~/.config/sway/headunit.conf

# Main Sway config: drop the default status bar and earlier ad-hoc head-unit
# lines, then include headunit.conf (once).
python3 - <<'PY'
import pathlib, re
p = pathlib.Path.home() / ".config/sway/config"
s = p.read_text()
s = re.sub(r"\nbar \{.*?\n\}\n", "\n", s, flags=re.S)
start = s.find("# --- Head unit ---")
if start != -1:
    s = s[:start].rstrip() + "\n"
s = s.replace("\n# Head unit: keep OpenAuto running, recover it after the phone is unplugged\n"
              "exec aa-supervisor > /tmp/aa-supervisor.log 2>&1\n", "\n")
if "include ~/.config/sway/headunit.conf" not in s:
    s = s.rstrip() + "\n\n# Mustang head unit\ninclude ~/.config/sway/headunit.conf\n"
p.write_text(s)
PY

export SWAYSOCK=$(ls /run/user/$(id -u)/sway-ipc.*.sock | head -1)
pkill -f aa-video-watch || true
swaymsg reload >/dev/null
# (Re)start the daemon and the shell; aa-supervisor keeps running.
pkill -f /opt/headunit/daemon/hu_daemon.py || true
pgrep -f "bin/hu-daemon" >/dev/null || swaymsg exec "hu-daemon > /tmp/hu-daemon.log 2>&1" >/dev/null
pgrep -f aa-supervisor >/dev/null || swaymsg exec "aa-supervisor > /tmp/aa-supervisor.log 2>&1" >/dev/null
swaymsg exec "hu-shell > /tmp/hu-shell.log 2>&1" >/dev/null
echo "deployed"
REMOTE
