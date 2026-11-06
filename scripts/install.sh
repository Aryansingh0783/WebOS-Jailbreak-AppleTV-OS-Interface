#!/usr/bin/env bash
# Installs the launcher + store on a rooted TV already registered with
# ares-setup-device, wires up the Home-key redirect and boot autostart, and
# makes this launcher the one that opens after boot. Idempotent — safe to
# re-run after rebuilding.
#
# Usage: ./install.sh <ares-device-name>
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEVICE="${1:-}"

if [ -z "$DEVICE" ]; then
  echo "Usage: $0 <ares-device-name>"
  echo "Set one up first with: ares-setup-device --add <name> --info 'host=<tv-ip>'"
  exit 1
fi

command -v ares-package >/dev/null || { echo "Missing ares-package. See docs/INSTALL.md"; exit 1; }
command -v ares-install >/dev/null || { echo "Missing ares-install. See docs/INSTALL.md"; exit 1; }
command -v ares-novacom >/dev/null || { echo "Missing ares-novacom. See docs/INSTALL.md"; exit 1; }

"$HERE/scripts/build.sh"

echo "Installing apps on $DEVICE..."
ares-install -d "$DEVICE" "$HERE"/dist/com.tvhome.home_*.ipk
ares-install -d "$DEVICE" "$HERE"/dist/com.tvhome.store_*.ipk

echo "Copying boot scripts and the Home-key watcher..."
ares-novacom -d "$DEVICE" --run "mkdir -p /var/lib/webosbrew/init.d"
# ares-novacom has no file-push of its own; use ares-push if the installed
# CLI version provides it, else fall back to base64 over --run.
if command -v ares-push >/dev/null 2>&1; then
  ares-push -d "$DEVICE" "$HERE/autostart/homekey.py" "/var/lib/webosbrew/homekey.py"
  ares-push -d "$DEVICE" "$HERE/autostart/50-tv-home" "/var/lib/webosbrew/init.d/50-tv-home"
  ares-push -d "$DEVICE" "$HERE/autostart/60-home-key" "/var/lib/webosbrew/init.d/60-home-key"
else
  for pair in "homekey.py:/var/lib/webosbrew/homekey.py" \
              "50-tv-home:/var/lib/webosbrew/init.d/50-tv-home" \
              "60-home-key:/var/lib/webosbrew/init.d/60-home-key"; do
    src="${pair%%:*}"; dst="${pair##*:}"
    b64="$(base64 -w0 "$HERE/autostart/$src" 2>/dev/null || base64 "$HERE/autostart/$src")"
    ares-novacom -d "$DEVICE" --run "echo $b64 | base64 -d > $dst"
  done
fi
ares-novacom -d "$DEVICE" --run "chmod +x /var/lib/webosbrew/homekey.py /var/lib/webosbrew/init.d/50-tv-home /var/lib/webosbrew/init.d/60-home-key"

echo
echo "Done. Reboot the TV once so the boot scripts take effect:"
echo "  ares-novacom -d $DEVICE --run reboot"
echo
echo "After reboot, Home opens this launcher. To go back to LG's own home"
echo "screen temporarily, use the Input or Live TV key, or run"
echo "scripts/uninstall.sh to remove everything."
