# Features: Askfiles

## 1. Question-based note creation
- Starts with a friendly opening question.
- Each page asks one question and shows the choices beneath it.
- Choices come from the folders at the current level.
- The final page is the only free-text step: naming the note.
- Optionally the person picks a note type at the end.

## 2. Optional depth
- At every level the person can **stop and save here** or **go deeper**.
- If a folder has no subfolders, no further question is forced. The flow offers to finish there (or to create a new folder if allowed).
- A folder that holds both subfolders and notes can still be chosen as the destination.

## 3. Folder trail (breadcrumb)
- Every page shows the path so far, for example Home > Knowledge > Physics.
- Every part of the trail is clickable to jump back.
- A Back control slides the person up one level.

## 4. Card layout for choices
- Choices appear as clickable items in rows and columns.
- Layouts: grid or list.
- Adjustable columns (or automatic by width) and card size (compact, comfortable, large).
- Optional extras on a card: icon, short description, folder or note count.
- Collapses sensibly on narrow screens.
- Long lists scroll within their area, with a filter box so people can type instead of hunting.

## 5. Quick jump
- A single search line lets experienced people type a path or fuzzy-match any folder at any depth, skipping the page-by-page flow.

## 6. Create new folder, with a lock
- A "+ New" option lets the person create a folder on the spot at any level.
- A **lock** toggle in the top bar disables folder creation. When locked, the "+ New" option is hidden or disabled so nothing can be created by accident or typo.
- The lock state is always visible beside the settings gear. Closed padlock means locked, open padlock means unlocked.
- The padlock and gear are a matching set of black line icons (same family, size and stroke), black in light themes and white in dark themes. State is shown by shape only, never by a colour change. Never colour emoji.
- Clicking the padlock toggles the lock.
- Lock and exclude rules are independent: the lock stops creating, exclude rules only hide existing folders.

## 7. In-tab settings (gear icon)
Quick, visual options used in the moment. Opens as a slide-in panel so the page stays visible and changes preview live.
- Lock folder creation
- Layout: view (grid or list), columns, card size
- Titles: phrase mode (fixed, random, rotate)
- Apply to: this folder only, or everywhere
- Link to more settings
- Reset view

## 8. Plugin settings page (Obsidian's own settings)
Set-once and structural options. See `06-plugin-settings-page-ascii.md`.
- General, Questions, Phrase library, Templates, Properties, Behaviour, Advanced.

## 9. Titles and descriptions library
Every page has a title (the question) and a quieter description line. People can change the wording and add their own. See `08-phrase-library.md`.
- Pools of phrases per level.
- Modes: fixed, random, rotate.
- Add, edit, disable, import and export phrases.
- Per-folder override.

## 10. Include and exclude folders
- Default: scan the whole vault on load and include everything.
- Exclude folders or subfolders the person does not want to see.
- Include exceptions inside excluded folders. The deeper rule wins.
- Each rule has a scope: folder and everything inside, only subfolders, or only this folder.
- Two scan modes: "include all then exclude" and "include only chosen".
- Dot-folders and Obsidian's own folders are hidden by default.
- Tree picker with checkboxes, live count of what will be hidden, rescan control.
- Quick right-click on a card to hide it. See `07-folder-include-exclude.md`.

## 11. Properties written to the note
- Answers can be written into the note's properties (for example category, domain, subdomain, type) so the note stays searchable if it is later moved.
- Only levels actually answered are written. No empty fields.
- Property names are configurable.

## 12. Templates and note types
- A note type chosen at the end can map to a template.
- Template folder and per-type mapping are configurable.

## 13. Convenience
- Optional "remember last choice".
- Full keyboard support: arrows across rows and columns, type to filter, Enter to confirm.
- Optional open-after-create.
- Works on desktop and mobile.

## 14. First run, feedback and errors
- First run: the vault is scanned automatically, a short welcome explains the flow in one screen, and the person can start immediately with no setup.
- After creating a note: a brief confirmation, then options to open the note, create another, or close.
- Clear, friendly messages when a name already exists, a name has characters Obsidian cannot use, or a folder has vanished.

## 15. Mobile layout
- Same flow, with cards collapsing to fewer columns, larger touch targets, and the settings panel opening as a bottom sheet or full page. See `11-additional-screens-ascii.md`.

## Out of scope for the first version
- Syncing, accounts or anything online.
- Heavy theming beyond matching the user's Obsidian theme.
- Anything that requires leaving the vault.
