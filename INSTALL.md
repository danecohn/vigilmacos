# Installing the VigilTech macOS kit

Everything here is optional, and everything can be undone.

## Wallpapers
`scripts/set-wallpaper.sh wallpapers/nave-night.jpg`, or System Settings > Wallpaper > Add Photo. Use the `-night` file for Dark appearance and the `-dawn` file for Light. For a slideshow and a matching screen saver: System Settings > Screen Saver > Photos or Choose Folder > the `wallpapers` folder.

## Accent and highlight colour
`scripts/set-accent.sh` sets the accent to pink and the text highlight to `#ff0058`. macOS only offers its own list of accent colours, so this uses the pink one plus a custom highlight. Log out and in.

## App icons
1. Once: `scripts/build-tool.sh` (needs the Xcode command line tools: `xcode-select --install`).
2. `scripts/apply-app-icons.sh rose` (or `night`). It goes through `scripts/apps.map` and sets the icon of every app that is installed in `/Applications` and that macOS lets you change. Add your own lines to `apps.map`.
3. One app by hand: `.bin/apply-icon "/Applications/Some App.app" icons/rose/apps/slack.png`. Restore the original with `.bin/apply-icon "/Applications/Some App.app" -`.

**Apple's built-in apps** (Safari, Mail, Messages, Photos...) are on a protected system volume, and macOS refuses to change them. Two safe ways round it: make a Shortcut with the "Open App" action and give the shortcut the icon (Shortcuts > the shortcut > Add to Dock), or make an alias to the app, give the alias the icon with `.bin/apply-icon`, and put the alias in the Dock or Applications folder. We do not recommend turning off System Integrity Protection.

By hand, without scripts: open the PNG in Preview, Edit > Select All, Copy; open the app's Get Info window, click the small icon at the top left, Paste.

## Folder icons
`scripts/apply-folder-icons.sh rose` does the standard folders in your home folder. Any other folder: `.bin/apply-icon ~/Some/Folder folders/rose/projects.png`.

## Sounds
`scripts/install-sounds.sh`, then System Settings > Sound > Alert sound.

## Your picture
System Settings > Users & Groups > click your picture > Photos or Choose, pick a file in `avatars/`.

## Font
`scripts/install-font.sh` installs Vigil Sans for apps that let you choose a font. macOS does not allow replacing the system font.

## Code and terminal themes
- VS Code: copy `themes/vscode/vigil` to `~/.vscode/extensions/vigil-theme`, restart, then Preferences > Color Theme.
- iTerm2: Settings > Profiles > Colors > Color Presets > Import, choose the two `.itermcolors` files.
- Terminal.app: `osascript themes/terminal/install-terminal-themes.applescript`, then Terminal > Settings > Profiles. (Terminal does not allow scripting its 16 ANSI colours; use iTerm2 for the full palette.)

## What macOS does not let anyone change
The menu bar icons, the system font, the cursor (without third-party hacks), and the icons of protected system apps. Everything else in the list above is fair game.
