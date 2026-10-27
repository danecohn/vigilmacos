#!/bin/bash
# Pink accent colour and a #ff0058 highlight colour. Log out and back in (or restart apps) to see it everywhere.
defaults write -g AppleAccentColor -int 6
defaults write -g AppleHighlightColor -string "1.000000 0.000000 0.345098 Other"
echo "Accent set to pink, highlight to #ff0058. Log out and in to apply everywhere."
echo "To undo: defaults delete -g AppleAccentColor; defaults delete -g AppleHighlightColor"
