#!/bin/bash
# Adds the VigilTech alert sounds to System Settings > Sound > Alert sound.
set -e
cd "$(dirname "$0")/.."
mkdir -p ~/Library/Sounds && cp sounds/*.aiff ~/Library/Sounds/ && echo "Installed. Pick one in System Settings > Sound."
