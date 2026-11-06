#!/usr/bin/env bash
# Prints RAM, CPU load and storage free on a webOS TV.
# Usage: ./tv-stats.sh <ares-device-name>   (or --local, run as root on the TV)
set -euo pipefail
DEVICE="${1:-}"
CMD='echo "--- memory (MB) ---"; free -m 2>/dev/null || awk "/MemTotal|MemFree|MemAvailable/" /proc/meminfo;
echo "--- load ---"; uptime 2>/dev/null || cat /proc/loadavg;
echo "--- storage ---"; df -h 2>/dev/null | grep -E "media/developer|cmn_data|Filesystem"'

if [ "$DEVICE" = "--local" ]; then
  eval "$CMD"
elif [ -z "$DEVICE" ]; then
  echo "Usage: $0 <ares-device-name>   (or --local, run as root on the TV)"
  exit 1
else
  ares-novacom -d "$DEVICE" --run "$CMD"
fi
