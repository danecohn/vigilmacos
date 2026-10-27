// Sets the icon of a file, folder or app from a PNG.  Usage: apply-icon <path> <icon.png>   (use "-" as the icon to restore the default)
import AppKit
let a = CommandLine.arguments
guard a.count == 3 else { fputs("usage: apply-icon <path> <icon.png | ->\n", stderr); exit(2) }
let target = (a[1] as NSString).expandingTildeInPath
var image: NSImage? = nil
if a[2] != "-" { guard let i = NSImage(contentsOfFile: (a[2] as NSString).expandingTildeInPath) else { fputs("cannot read \(a[2])\n", stderr); exit(1) }; image = i }
if NSWorkspace.shared.setIcon(image, forFile: target, options: []) { print("ok  \(target)") } else { fputs("failed (macOS protects some apps): \(target)\n", stderr); exit(1) }
