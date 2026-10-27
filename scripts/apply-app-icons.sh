#!/bin/bash
# Gives apps the VigilTech icons.  Usage: scripts/apply-app-icons.sh [rose|night]
# Apps inside /Applications that you can write to change. Apple's own apps live in a protected volume: macOS refuses, and this script says so.
# For those, use a Shortcuts "Open App" shortcut or an alias with the icon (see INSTALL.md).
set -u
cd "$(dirname "$0")/.."
V="${1:-rose}"
[ -x .bin/apply-icon ] || scripts/build-tool.sh
while IFS='|' read -r app icon; do
  [ -d "$app" ] || continue
  .bin/apply-icon "$app" "icons/$V/$icon.png" || true
done < scripts/apps.map
