# Acceptance Checklist (Askfiles)

Plain-language description of what "done" looks like. Use it to check the finished plugin against the brief.

## Flow
- [ ] Starting question appears with top-level folders as cards.
- [ ] Each answer reveals the next question based on the folders beneath it.
- [ ] "Save here" is available at every level.
- [ ] A level with no subfolders shows the "nothing deeper here" page.
- [ ] The final page names the note, with an optional type.
- [ ] The success page appears after creation with open, create another and close.
- [ ] Quick-jump search takes the person straight to a folder at any depth.

## Navigation
- [ ] The folder trail is visible on every page after the first and every part is clickable.
- [ ] Back slides the page the other way.
- [ ] Transitions are short and never slow repeated use.

## Layout
- [ ] Grid and list views both work.
- [ ] Columns and card size are adjustable, with auto columns by default.
- [ ] Long lists scroll smoothly with a filter box.
- [ ] Optional icon, description and count on cards.
- [ ] Narrow screens collapse sensibly and the settings panel becomes a bottom sheet.

## Lock and icons
- [ ] Padlock and gear sit together in the top-right corner on every page.
- [ ] They are a matching set of black line icons (white in dark themes), never colour emoji.
- [ ] Closed padlock means locked, open padlock means unlocked, shown by shape only.
- [ ] Clicking the padlock toggles the lock.
- [ ] With the lock on, "+ New" is hidden or disabled everywhere and no folder can be created.
- [ ] Lock state in the top bar and in the gear panel always agree.

## In-tab settings (gear)
- [ ] Opens as a panel over the page and previews changes live.
- [ ] Contains only: lock, view, columns, card size, phrase mode, apply to, more settings, reset view.
- [ ] "Apply to" switches between this folder and everywhere.
- [ ] Reset view restores layout defaults.

## Plugin settings page
- [ ] Titled Askfiles Settings.
- [ ] Contains General, Questions, Phrase Library, Templates, Properties, Folders, Behaviour and Advanced.
- [ ] Each option appears in one place only, except the lock.
- [ ] Manage screens exist for per-folder wording, templates, phrase library, folder rules and shortcuts.

## Folders
- [ ] Vault is scanned automatically on load and everything is included by default.
- [ ] Dot-folders are hidden by default.
- [ ] Exclude and include rules work with the three scopes and the deeper rule wins.
- [ ] Both scan modes work.
- [ ] Tree picker with checkboxes, labels and a live "will hide N folders" count.
- [ ] Rescan works, and new folders created elsewhere appear automatically.
- [ ] Rules survive renames and moves.
- [ ] Right-click on a card can hide a folder, with an Undo.

## Phrase library
- [ ] Titles and descriptions come from per-level pools.
- [ ] Fixed, random and rotate modes work.
- [ ] Phrases can be added, edited, disabled, imported and exported.
- [ ] Per-folder override works and the starter set can be restored.

## Notes and properties
- [ ] Only answered levels are written to properties.
- [ ] Property names are configurable.
- [ ] Note type maps to a template when one is set.

## Quality
- [ ] Keyboard use works throughout.
- [ ] Contrast and focus indication are good in light and dark themes.
- [ ] Friendly messages for duplicate names, unusable characters and missing folders.
- [ ] Works on desktop and mobile.
- [ ] Default look is good with no configuration.
- [ ] Wording everywhere uses the name Askfiles.
