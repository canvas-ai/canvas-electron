# CLI Interface (draft)

```bash

# Context CLI Commands

# Format for both CLI tools is
# $ context <action> <item> <parms> <opts>
# $ canvas <action> <item> <parms> <opts>
# But maybe we should eval the current <item> <action> <parms> <opts> format
# as some items may support only a subset (or a different set) of actions 

# Context CLI Commands

# Context management
context set /work/foo/bar
context show
context list # Returns all documents of a context
context list notes
context list todos --filter 'today' --tag 'work'
context list bookmarks
context list files 

# Context tree operations
context move /foo/bar /baz 
context remove /baz
context delete /baz # If baz layer is part of any other context tree , we'll fail
context copy /foo /adhoc --recursive
context rename /foo/bar baz # Renames the bar layer to baz

# Session management
context list sessions
context switch session <session_name>
context create session <session_name>
context delete session <session_name>

# Data management within the context
context add note "Note content" --title "Note Title"
context add bookmark https://example.com
context add file /path/to/file.txt
context add command 'ls -la /tmp/z'
context remove note <note_id> # Removes note from the current context
context delete note <note_id> # Deletes note from the database
context update note <note_id> --tag work --tag !personal
context add note "Another note" --context '/work/other/context/thats/not/open'
context get note 1234 # Returns a JSON document
context update note 1234 --tag foo --tag bar --tag !baz
context get note 1234 --tags # Returns the tags array
context get note 1234 --checksums # Returns the checksums array
context get note 1234 --versions # Returns the version IDs
context get note 1234 --meta # Returns the whole metadata array
context get note 1234 --version latest
context get note 1234 --version 3
context list versions 1234
context diff note 1234 --from 2 --to 3
context move note 1234 /foo/bar/baz # Moves the note from the current context to the new context

# Context information
context id
context url
context tree
context layers
context bitmaps
context filters


# Canvas CLI Commands

# Server controls
canvas start
canvas stop
canvas restart
canvas status

# Role management
canvas list roles
canvas register role /path/to/role
canvas start role <role_name>
canvas stop role <role_name>
canvas restart role <role_name>
canvas show role <role_name>

# Information and paths
canvas list apps
canvas list roles
canvas list services
canvas list sessions

# Other components
canvas list apps
canvas list identities
canvas list sessions
canvas list contexts

# Database operations
canvas query "<query>"
canvas find "<query>"

# Miscellaneous
canvas show user
canvas show storage
canvas show index

```
