#!/usr/bin/env bash
# Checks a TV model/firmware pair against the webosbrew compatibility list
# and tells you plainly whether rooting is known to work. It does not root
# anything -- see docs/ROOTING.md for that.
set -euo pipefail

MODEL="${1:-}"
FW="${2:-}"

if [ -z "$MODEL" ]; then
  echo "Usage: $0 <model e.g. 49UK7500PTA> [firmware e.g. 04.40.25]"
  echo
  echo "Find these on the TV: Settings > All Settings > General > About This TV."
  exit 1
fi

echo "Checking webosbrew's device list for: $MODEL ${FW:+(firmware $FW)}"
echo "Live list: https://www.webosbrew.org/devices/"
echo

if command -v curl >/dev/null 2>&1; then
  PAGE="$(curl -fsSL --max-time 15 https://www.webosbrew.org/devices/ 2>/dev/null || true)"
  if [ -n "$PAGE" ] && echo "$PAGE" | grep -qi "$MODEL"; then
    echo "✔ '$MODEL' appears on the compatibility page. Open the link above"
    echo "  and confirm your exact firmware version is listed as supported"
    echo "  before you touch anything -- the same model can be rootable on"
    echo "  one firmware and not another."
  else
    echo "✘ Could not confirm '$MODEL' on the compatibility page (or the"
    echo "  page couldn't be fetched from here). This does NOT mean rooting"
    echo "  is impossible -- check the live page yourself, and check the"
    echo "  model/firmware pair exactly as LG prints them."
  fi
else
  echo "curl is not available in this shell; open the link above in a browser."
fi

echo
echo "Next: docs/ROOTING.md"
