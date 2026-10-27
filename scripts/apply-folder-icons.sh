#!/bin/bash
# Gives your standard folders the VigilTech folder icons.  Usage: scripts/apply-folder-icons.sh [rose|night]
set -u
cd "$(dirname "$0")/.."
V="${1:-rose}"
[ -x .bin/apply-icon ] || scripts/build-tool.sh
set_icon() { [ -d "$1" ] && .bin/apply-icon "$1" "folders/$V/$2.png" || true; }
set_icon ~/Documents documents; set_icon ~/Downloads downloads; set_icon ~/Desktop desktop; set_icon ~/Pictures pictures
set_icon ~/Music music; set_icon ~/Movies movies; set_icon ~/Public shared; set_icon ~/Developer developer; set_icon ~/Projects projects
set_icon ~/Applications applications; set_icon ~/Library library
echo "Done. Other folders: .bin/apply-icon /path/to/folder folders/$V/<name>.png   (names are in folders.json)"
