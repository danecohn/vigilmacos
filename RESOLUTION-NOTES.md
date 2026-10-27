# 1024px PNG exports

All 312 app icons and 16 avatars now use the existing1024×1024 masters directly. The 36 folder PNGs were already 1024×1024 and remain byte-for-byte unchanged. Asset names and paths are unchanged.

No glyph definitions, colours, proportions, margins, squircle masks, shadows or lighting code changed. The old build rendered these masters at 1024px and then reduced them to 512px. This update removes that final reduction rather than enlarging a smaller image or generating replacement artwork.

Before replacing each old image, `--verify-previous` reproduced its 512px output with the original renderer and compared the complete PNG bytes. All 312 app exports and 16 avatars matched exactly. Verification logs reported 312 and 16 unchanged originals respectively. The resulting assets retain their RGBA transparency channels.

Checks:

- `node tools/macos/build.js icons --verify-previous`
- `node tools/macos/build.js avatars --verify-previous`
- `node tools/macos/verify-icon-sizes.js` — all 364 shipped icon/folder/avatar PNGs are 1024×1024 RGBA.
- Renderer source files and existing folder assets remain unchanged from 0df11670978a9a8e1f99741bac30a0550cac1c96.

CI verifies the shipped dimensions, PNG format, alpha-channel support and expected icon/folder inventory on pull requests and main. Preview/contact-sheet rendering sizes are independent of these master files.
