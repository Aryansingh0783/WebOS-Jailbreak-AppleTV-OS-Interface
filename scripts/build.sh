#!/usr/bin/env bash
# Packages the home launcher and store app into .ipk files with ares-package.
# Requires the webOS CLI (`npm i -g @webosose/ares-cli` or the webOS TV SDK).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$HERE/dist"
mkdir -p "$OUT"

if ! command -v ares-package >/dev/null 2>&1; then
  echo "ares-package not found. Install the webOS CLI first:"
  echo "  npm install -g @webosose/ares-cli"
  exit 1
fi

for app in home store; do
  echo "Packaging $app..."
  rm -f "$OUT"/com.tvhome."$app"*.ipk
  ares-package "$HERE/apps/$app" -o "$OUT"
done

echo
echo "Built:"
ls -la "$OUT"/*.ipk
