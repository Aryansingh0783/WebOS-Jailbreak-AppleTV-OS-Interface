#!/usr/bin/env bash
# Removes the launcher, the store, the Home-key watcher and the boot
# scripts, returning the TV to LG's stock home screen. Does not un-root
# the TV or remove the Homebrew Channel itself.
set -euo pipefail
DEVICE="${1:-}"
[ -z "$DEVICE" ] && { echo "Usage: $0 <ares-device-name>"; exit 1; }

for id in com.tvhome.launcher com.tvhome.store; do
  ares-install -d "$DEVICE" -r "$id" || true
done

ares-novacom -d "$DEVICE" --run \
  "rm -f /var/lib/webosbrew/init.d/50-tv-home /var/lib/webosbrew/init.d/60-home-key /var/lib/webosbrew/homekey.py"

echo "Removed. Reboot the TV: ares-novacom -d $DEVICE --run reboot"
