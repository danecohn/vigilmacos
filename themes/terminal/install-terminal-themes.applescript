-- Creates two Terminal profiles, "Vigil Night" and "Vigil Dawn". Run: osascript themes/terminal/install-terminal-themes.applescript
tell application "Terminal"
	set s to (make new settings set with properties {name:"Vigil Night"})
	tell s
		set background color to {5140, 2056, 4626}
		set normal text color to {63479, 61166, 62194}
		set bold text color to {63479, 61166, 62194}
		set cursor color to {65535, 0, 22616}
		set font name to "Menlo"
		set font size to 13
	end tell
	set s to (make new settings set with properties {name:"Vigil Dawn"})
	tell s
		set background color to {65535, 64507, 65021}
		set normal text color to {5911, 4112, 6682}
		set bold text color to {5911, 4112, 6682}
		set cursor color to {54998, 0, 19018}
		set font name to "Menlo"
		set font size to 13
	end tell
end tell
