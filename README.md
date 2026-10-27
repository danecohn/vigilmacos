# VigilTech for macOS

A full macOS customisation kit in the VigilTech look: pink `#ff0058`, plum-black, a quiet gothic streak. Free software, GNU GPL v3.

| Folder | What |
| --- | --- |
| `icons/{rose,night}/` | 4 groups of app icons (156 icons) as macOS squircles with the usual margin and shadow, 1024x1024 PNG: `apple/` (58 Apple apps), `system/` (28 macOS apps and volumes: Finder, Launchpad, Terminal, Activity Monitor, Time Machine, Trash, drives, AirDrop...), `apps/` (56 popular apps), `vigiltech/` (14 VigilTech apps) |
| `folders/{rose,night}/` | 18 folder icons (Documents, Downloads, Desktop, Applications, Pictures, Music, Movies, Home, Developer, Games, Projects, Archive, Shared, Private, Backups, Library, Work and a plain folder), 1024x1024 PNG with transparency |
| `wallpapers/` | 4 designs at 5120x2880, each in Night and Dawn for Dark and Light appearance: Nave, Ridge, Starfall, Rose Window |
| `avatars/` | 8 user pictures in Rose and Night, 1024x1024 PNG |
| `sounds/` | alert sounds (`.aiff`) for System Settings > Sound |
| `themes/` | VS Code (Vigil Night, Vigil Dawn), iTerm2 colour presets, Terminal.app profiles |
| `fonts/` | Vigil Sans (Regular, Bold) |
| `scripts/` | one-line installers: icons, folder icons, sounds, font, accent colour, wallpaper |

Start with `INSTALL.md`. Rebuild everything: `node tools/macos/build.js` (Node 20+; macOS for the JPG and AIFF conversion).

Code and artwork are under the GNU GPL v3 (`LICENSE`). The font is under the SIL OFL 1.1. App names belong to their owners; the third-party icons are simplified VigilTech-style artwork for personal customisation.

All app icons, folders and avatars are supplied as 1024×1024 PNGs. The app icon and avatar renderer already creates 1024px masters; this update removes the final 512px reduction without changing shapes, colours, margins, shadows or transparency. Run `node tools/macos/verify-icon-sizes.js` to check the shipped files. During a size-only upgrade, add `--verify-previous` to the icons/avatars build command to verify the old output against the same renderer before replacing it.
