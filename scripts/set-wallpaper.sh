#!/bin/bash
# Sets the desktop picture on every display.  Usage: scripts/set-wallpaper.sh wallpapers/nave-night.jpg
set -e
f="$(cd "$(dirname "${1:?give a wallpaper path}")" && pwd)/$(basename "$1")"
osascript -e "tell application \"System Events\" to tell every desktop to set picture to \"$f\""
echo "Wallpaper set to $f"
