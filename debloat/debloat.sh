#!/usr/bin/env bash
# Removes non-essential preinstalled apps and reports memory/storage use.
# Run from a PC with `ares-*` tools on PATH and a device set up via
# `ares-setup-device` (see docs/INSTALL.md), OR copy this script to the TV
# over ssh/telnet and run it there directly as root.
#
# Usage (from a PC):   ./debloat.sh <ares-device-name> [--dry-run]
# Usage (on the TV):    ./debloat.sh --local [--dry-run]
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIST="$HERE/apps-removable.txt"
DRY=0
MODE="remote"
DEVICE=""

for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    --local) MODE="local" ;;
    *) DEVICE="$a" ;;
  esac
done

run() {
  if [ "$MODE" = "local" ]; then
    eval "$1"
  else
    ares-novacom -d "$DEVICE" --run "$1"
  fi
}

if [ "$MODE" = "remote" ] && [ -z "$DEVICE" ]; then
  echo "Usage: $0 <ares-device-name> [--dry-run]   (or: $0 --local [--dry-run] when run ON the TV as root)"
  exit 1
fi

echo "== Before =="
run "free -m 2>/dev/null || cat /proc/meminfo | head -3; df -h /media/developer 2>/dev/null || df -h /tmp"

echo
echo "== Removing apps from $LIST =="
while IFS= read -r app; do
  [ -z "$app" ] && continue
  case "$app" in \#*) continue ;; esac
  echo "- $app"
  if [ "$DRY" = "1" ]; then
    echo "  (dry run, not removed)"
  else
    run "luna-send -i -n 8 -f luna://com.webos.appInstallService/dev/remove '{\"id\":\"$app\",\"subscribe\":true}'" || \
      echo "  skip: not installed or not removable"
  fi
done < "$LIST"

echo
echo "== After =="
run "free -m 2>/dev/null || cat /proc/meminfo | head -3; df -h /media/developer 2>/dev/null || df -h /tmp"
