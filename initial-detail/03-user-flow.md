# User Flow

## Happy path
1. The person opens the plugin's main tab.
2. A friendly question appears with the top-level folders as cards.
3. They pick one. The next page slides in with a new question and the sub-choices.
4. They repeat until they choose "Save here", or there is nothing deeper.
5. They type the note name, optionally choose a type, and confirm.
6. The note is created in the chosen folder, with properties written if enabled, and optionally opened.

## First run
1. The plugin scans the vault and builds the folder tree.
2. A single welcome screen explains the idea in a sentence or two and offers "Start".
3. Sensible defaults apply: include all folders (dot-folders hidden), grid view, auto columns, comfortable cards, random phrases, lock off.

## After the note is created
1. A brief confirmation shows the destination path.
2. Options: open the note, create another in the same place, or close.
3. If "open after creating" is on, the note opens straight away.

## Shortcuts
- **Quick jump:** type a path or folder name in the search line at the bottom and go straight to the destination.
- **Save here:** available at every level to stop early.
- **Breadcrumb:** jump back to any earlier level.
- **Remember last choice:** optionally start where the person left off.

## Edge cases to handle gracefully
- Folder with no subfolders: show a short "nothing deeper here" page offering to continue or create a folder (if unlocked).
- Folder with subfolders and its own notes: both "go deeper" and "save here" must be possible.
- Lock on: no way to create folders anywhere in the flow.
- Name already exists: tell the person clearly and let them change it.
- Folder deleted or renamed outside the plugin: rescan and update without errors.
- Very long lists: scroll plus filter.
- Excluded folders never appear. Included exceptions inside excluded folders do.

## Transitions
- Going deeper slides one way, going back slides the other.
- Animations are short and never slow down repeated use.
