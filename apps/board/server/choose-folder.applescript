-- The system's folder chooser (D-110; chooser.ts `macChooser` runs it with osascript, never a shell).
-- argv 1: the prompt (words/server-folders.ts `chooserPrompt`); argv 2: the folder it starts in.
-- `activate` first, so the chooser opens in front of the browser. Answers the picked folder's POSIX path;
-- the person cancelling is AppleScript error -128.
on run argv
	activate
	set f to choose folder with prompt (item 1 of argv) default location (POSIX file (item 2 of argv))
	return POSIX path of f
end run
