#!/bin/bash
# Installs Vigil Sans for your user (apps can use it; macOS does not let you replace the system font).
set -e
cd "$(dirname "$0")/.."
mkdir -p ~/Library/Fonts && cp fonts/VigilSans-*.ttf ~/Library/Fonts/ && echo "Installed Vigil Sans."
