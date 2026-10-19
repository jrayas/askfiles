# Acceptance & Review Checklist Status

Tracks progress against [12-acceptance-checklist.md](../initial-detail/12-acceptance-checklist.md) and the Obsidian Community Plugin review checklist.

## 1. Flow
- [x] Starting question appears with top-level folders as cards.
- [x] Each answer reveals the next question based on the folders beneath it.
- [x] "Save here" is available at every level.
- [x] A level with no subfolders shows the "nothing deeper here" page.
- [x] The final page names the note, with an optional type.
- [x] The success page appears after creation with open, create another and close.
- [x] Quick-jump search takes the person straight to a folder at any depth.

## 2. Navigation
- [x] The folder trail is visible on every page after the first and every part is clickable.
- [x] Back slides the page the other way.
- [x] Transitions are short and never slow repeated use.

## 3. Layout
- [x] Grid and list views both work.
- [x] Columns and card size are adjustable, with auto columns by default.
- [x] Long lists scroll smoothly with a filter box.
- [x] Optional icon, description and count on cards.
- [x] Narrow screens collapse sensibly and the settings panel becomes a bottom sheet.

## 4. Lock and Icons
- [x] Padlock and gear sit together in the top-right corner on every page.
- [x] They are a matching set of black line icons (white in dark themes), never colour emoji.
- [x] Closed padlock means locked, open padlock means unlocked, shown by shape only.
- [x] Clicking the padlock toggles the lock.
- [x] With the lock on, "+ New" is hidden or disabled everywhere and no folder can be created.
- [x] Lock state in the top bar and in the gear panel always agree.

## 5. In-Tab Settings (Gear)
- [x] Opens as a panel over the page and previews changes live.
- [x] Contains only: lock, view, columns, card size, phrase mode, apply to, more settings, reset view.
- [x] "Apply to" switches between this folder and everywhere.
- [x] Reset view restores layout defaults.

## 6. Plugin Settings Page
- [x] Configured for Askfiles in Obsidian Settings (`getSettingDefinitions()`).
- [x] Contains General, Questions, Phrase library, Templates, Properties, Folders, Behaviour and Advanced sections.
- [x] Each option appears in one place only, except the lock.
- [x] Manage screens exist for per-folder wording, templates, phrase library, folder rules and shortcuts.

## 7. Folders
- [x] Vault is scanned automatically on load and everything is included by default.
- [x] Dot-folders are hidden by default.
- [x] Exclude and include rules work with the three scopes and the deeper rule wins.
- [x] Both scan modes work (`Include all`, `Include only chosen`).
- [x] Tree picker with checkboxes, labels and a live "will hide N folders" count.
- [x] Rescan works, and new folders created elsewhere appear automatically.
- [x] Rules survive renames and moves.
- [x] Right-click on a card can hide a folder, with an Undo.

## 8. Phrase Library
- [x] Titles and descriptions come from per-level pools.
- [x] Fixed, random and rotate modes work.
- [x] Phrases can be added, edited, disabled, imported and exported.
- [x] Per-folder override works and the starter set can be restored.

## 9. Notes and Properties
- [x] Only answered levels are written to properties.
- [x] Property names are configurable.
- [x] Note type maps to a template when one is set.

## 10. Quality & Linter Compliance
- [x] Keyboard use works throughout.
- [x] Contrast and focus indication are good in light and dark themes.
- [x] Friendly messages for duplicate names, unusable characters and missing folders.
- [x] Works on desktop and mobile.
- [x] Default look is good with no configuration.
- [x] Wording everywhere uses the name Askfiles.
- [x] `npm run lint` passes ESLint (`obsidianmd.configs.recommended`) and Stylelint (`--max-warnings 0`).
- [x] `npm run build` produces clean production `main.js`.
