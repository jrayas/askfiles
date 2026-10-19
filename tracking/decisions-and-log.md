# Engineering Decisions & Progress Log

## 2026-10-19 — Initial Architecture, Documentation & Project Setup

### Context
Reviewed all 13 specification files in `initial-detail/` (`00-README.md` to `12-acceptance-checklist.md`) and the two migrated skills in `.agents/skills/` (`obsidian-plugin-dev` and `obsidian-cdp-debugging`).

### Key Architectural Decisions Recorded
1. **Target API & Declarative Settings (`ADR-001`)**:
   - Target `obsidian@1.14.4` typings with `minAppVersion: "1.13.4"` and `isDesktopOnly: false`.
   - Use `getSettingDefinitions()` on `PluginSettingTab` as required for `minAppVersion >= 1.13.0` (`eslint-plugin-obsidianmd` rule `prefer-setting-definitions` and `no-deprecated-display`).
   - Reconcile `06-plugin-settings-page-ascii.md` with Obsidian's settings heading lint rules: place general settings at the top without a redundant "Askfiles Settings" or "General" heading, and use sentence case for all group headings (`Questions`, `Phrase library`, `Templates`, `Properties`, `Folders`, `Behaviour`, `Advanced`).
2. **Note Type as Property + Template (`ADR-002`)**:
   - Resolved Open Question #1: Note Type (`Reference`, `Idea`, `Meeting`, `Log`, etc.) is selected on the final `Name your note` step, writing to frontmatter (`type`) and applying an optional mapped template file.
3. **Centralised Folder Metadata with Rename Tracking (`ADR-003`)**:
   - Resolved Open Question #2: Store per-folder card icons/descriptions, layout overrides, wording overrides, and include/exclude rules centrally in `data.json`, and subscribe to `vault.on('rename')` to automatically migrate paths when folders are renamed or moved.
4. **Monochrome SVG Line Icons (`ADR-004`)**:
   - Custom matching SVG line icon set (`askfiles-lock-open`, `askfiles-lock-closed`, `askfiles-gear`) using `stroke="currentColor"` so icons automatically adapt to light/dark themes and communicate lock state strictly through shackle geometry.

---

## 2026-10-19 — Full Plugin Implementation, Linter Verification & Isolated CDP Testing

### Completed Work
1. **Core Engines & Store (`src/engine/`, `src/settings/store.ts`)**:
   - Built `FolderEngine` with dot-folder/`vault.configDir` filtering, `include-all` & `include-chosen` scan modes, 3-scope deepest-rule-wins evaluator (`folder-and-children`, `children-only`, `folder-only`), fuzzy quick-jump search (`prepareFuzzySearch`), tree node builder with live hidden folder counter, and `handleFolderRename` path migration.
   - Built `PhraseEngine` with `fixed`, `random`, and `rotate` modes, `paired` vs `mixed` title/description resolution, per-folder wording override, JSON import/export, and starter set restore.
   - Built `NoteCreator` with illegal filename character sanitization (`Physics: Quantum / Spin` → `Physics - Quantum - Spin`), duplicate note detection, template loading, `vault.create()`, and `fileManager.processFrontMatter()`.
2. **UI & Settings (`src/ui/`, `src/views/`, `src/settings/`)**:
   - Built `AskfilesView` covering Welcome, Browse (Grid & List), Empty Level (`Nothing deeper here`), New Folder, Naming + Note Type pills, Vanished Folder, Success confirmation, right-click card context menu with inline `Undo`, 2D keyboard navigation, and Quick-Jump search.
   - Built `GearPanel` slide-in right drawer (desktop) and bottom sheet (mobile/narrow pane) with `ApplyToModal` confirmation (`This folder only` vs `Everywhere`).
   - Built declarative `AskfilesSettingTab` (`getSettingDefinitions()`) and all 5 `Manage →` modals (`FolderRulesModal`, `PhraseLibraryModal`, `FolderWordingModal`, `TemplatesModal`, `ShortcutsModal`).
3. **CSS Specificity & Responsive Container Queries (`styles.css`)**:
   - Used `.askfiles-root button.askfiles-...` and `.askfiles-wide-modal button.askfiles-...` specificity `(0, 2, 1)` to cleanly override Obsidian's default `button:not(.clickable-icon)` background/shadow without `!important`, preserving the borderless aesthetic (`09-design-principles.md`).
   - Added `container-type: inline-size` and `@container (max-width: 600px)` alongside `@media (max-width: 600px)` so both narrow split panes on desktop and mobile screens collapse cleanly to 2 columns and render the Gear drawer as a bottom sheet.
4. **Verification Summary**:
   - `tsc -noEmit -skipLibCheck && node esbuild.config.mjs production`: **0 errors** (`main.js` generated).
   - `eslint . && stylelint --max-warnings 0 styles.css`: **0 errors, 0 warnings**.
   - `node --test tests/*.test.mjs`: **5/5 passing**.
   - Live CDP verification in isolated Obsidian `1.14.4` (`scripts/cdp-debug.mjs`): verified zero console errors, captured and inspected 10 screenshots (`dev/scratch/01-welcome.png` through `09-mobile-bottom-sheet.png`), verified note creation with frontmatter + template, quick-jump search, deepest-rule-wins folder rules, and folder rename migration, then stopped the isolated Obsidian instance.
