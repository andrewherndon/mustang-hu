#!/bin/bash
# Install the head unit on the Surface. Run from the Mac:
#   system/deploy.sh [host]          (default host: andre@mustang over Tailscale)
# Builds the React shell, installs it with the daemon, scripts, services, Sway
# config and boot settings, then restarts the daemon and shell.
# Idempotent: safe to run after every change.
set -euo pipefail
HOST=${1:-andre@100.123.180.33}
ROOT=$(cd "$(dirname "$0")/.." && pwd)

(cd "$ROOT/ui" && npm run build --silent >/dev/null)

ssh "$HOST" mkdir -p /tmp/hu-deploy
rsync -a --delete "$ROOT/daemon/" "$HOST:/tmp/hu-deploy/daemon/"
rsync -a --delete "$ROOT/ui/dist/" "$HOST:/tmp/hu-deploy/ui/"
rsync -a "$ROOT/system/" "$HOST:/tmp/hu-deploy/system/"

ssh "$HOST" bash -s <<'REMOTE'
set -euo pipefail
D=/tmp/hu-deploy
sudo install -d /opt/headunit
sudo rsync -a --delete $D/daemon/ /opt/headunit/daemon/
sudo rsync -a --delete $D/ui/ /opt/headunit/ui/
sudo find $D/system/bin -maxdepth 1 -type f -exec install -m755 {} /usr/local/bin/ \;
sudo rm -f /usr/local/bin/aa-video-watch            # replaced by hu-daemon
for unit in $D/system/systemd/*.service; do
  sudo install -m644 "$unit" /etc/systemd/system/
done
sudo systemctl daemon-reload
sudo systemctl enable --now ydotoold.service >/dev/null 2>&1

# ---- boot: no menu, quiet kernel, greetd starts the Sway session ----
sudo install -m644 $D/system/boot/loader.conf /boot/loader/loader.conf
install -m644 $D/system/boot/bash_profile ~/.bash_profile
pacman -Q greetd >/dev/null 2>&1 || sudo pacman -S --noconfirm --needed greetd >/dev/null
sudo install -m644 $D/system/boot/greetd.toml /etc/greetd/config.toml
sudo rm -f /etc/systemd/system/getty@tty1.service.d/autologin.conf   # replaced by greetd
sudo systemctl daemon-reload
sudo systemctl enable greetd.service >/dev/null 2>&1
# Kernel command line: add quiet-boot options once, then rebuild the unified
# kernel images (they embed the command line).
QUIET="quiet loglevel=3 rd.udev.log_level=3 systemd.show_status=auto"
if ! grep -q "loglevel=3" /etc/kernel/cmdline; then
  echo "$(cat /etc/kernel/cmdline) $QUIET" | sudo tee /etc/kernel/cmdline >/dev/null
  sudo linux-sp11-mkuki >/dev/null
  echo "kernel images rebuilt with: $(cat /etc/kernel/cmdline)"
fi

# ---- sway ----
install -D -m644 $D/system/sway/headunit.conf ~/.config/sway/headunit.conf
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

# ---- restart what changed (only if Sway is running) ----
if SWAYSOCK=$(ls /run/user/$(id -u)/sway-ipc.*.sock 2>/dev/null | head -1) && [ -n "$SWAYSOCK" ]; then
  export SWAYSOCK
  pkill -f aa-video-watch || true
  swaymsg reload >/dev/null
  pkill -f /opt/headunit/daemon/hu_daemon.py || true          # hu-daemon's loop restarts it
  pgrep -f "bin/hu-daemon" >/dev/null || swaymsg exec "hu-daemon > /tmp/hu-daemon.log 2>&1" >/dev/null
  pgrep -f aa-supervisor >/dev/null || swaymsg exec "aa-supervisor > /tmp/aa-supervisor.log 2>&1" >/dev/null
  pkill -f "[h]ttp.server 8080" || true                          # old one-liner server
  pkill -f "[b]in/hu-ui-server" || true
  swaymsg exec "hu-ui-server > /tmp/hu-ui-server.log 2>&1" >/dev/null
  sleep 0.5
  swaymsg exec "hu-shell > /tmp/hu-shell.log 2>&1" >/dev/null
fi
echo "deployed"
REMOTE
