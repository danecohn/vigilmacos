# VigilTech for macOS

A full macOS customisation kit in the VigilTech look: pink `#ff0058`, plum-black, a quiet gothic streak. Free software, GNU GPL v3.

| Folder | What |
| --- | --- |
| `icons/{rose,night}/` | 4 groups of app icons (156 icons) as macOS squircles with the usual margin and shadow, 512x512 PNG: `apple/` (58 Apple apps), `system/` (28 macOS apps and volumes: Finder, Launchpad, Terminal, Activity Monitor, Time Machine, Trash, drives, AirDrop...), `apps/` (56 popular apps), `vigiltech/` (14 VigilTech apps) |
| `folders/{rose,night}/` | 18 folder icons (Documents, Downloads, Desktop, Applications, Pictures, Music, Movies, Home, Developer, Games, Projects, Archive, Shared, Private, Backups, Library, Work and a plain folder), 1024x1024 PNG with transparency |
| `wallpapers/` | 4 designs at 5120x2880, each in Night and Dawn for Dark and Light appearance: Nave, Ridge, Starfall, Rose Window |
| `avatars/` | 8 user pictures in Rose and Night |
| `sounds/` | alert sounds (`.aiff`) for System Settings > Sound |
| `themes/` | VS Code (Vigil Night, Vigil Dawn), iTerm2 colour presets, Terminal.app profiles |
| `fonts/` | Vigil Sans (Regular, Bold) |
| `scripts/` | one-line installers: icons, folder icons, sounds, font, accent colour, wallpaper |

Start with `INSTALL.md`. Rebuild everything: `node tools/macos/build.js` (Node 20+; macOS for the JPG and AIFF conversion).

Code and artwork are under the GNU GPL v3 (`LICENSE`). The font is under the SIL OFL 1.1. App names belong to their owners; the third-party icons are simplified VigilTech-style artwork for personal customisation.
