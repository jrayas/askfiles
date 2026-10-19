# Askfiles — Phased Implementation Plan

This document defines the step-by-step engineering plan to build, lint, test, and verify the **Askfiles** Obsidian plugin from scratch.

---

## Phase 1: Project Scaffold, Build Pipeline & Linting Setup
**Goal**: Establish a clean, zero-warning TypeScript + esbuild + ESLint + Stylelint project structure compliant with Obsidian 1.14.x (`minAppVersion: "1.13.4"`).
1. Create `package.json`, `tsconfig.json`, `esbuild.config.mjs`, `eslint.config.mts`, `.stylelintrc.json`, `version-bump.mjs`, `.npmrc`, and `.gitignore`.
2. Create `manifest.json`, `versions.json`, `LICENSE`, and `README.md`.
3. Install dependencies (`obsidian@1.14.4`, `typescript@5.9.3`, `esbuild`, `eslint@9.39.4`, `@eslint/js@9.39.4`, `typescript-eslint@8.71.2`, `eslint-plugin-obsidianmd@0.4.2`, `stylelint@17.16.0`, `stylelint-no-unsupported-browser-features@8.1.2`).
4. Verify `npm run build` and `npm run lint` run cleanly.

---

## Phase 2: Core Data Models, Settings Store & Engines
**Goal**: Implement the pure logic and Obsidian vault engines backing Askfiles.
1. **`src/types.ts` & `src/constants.ts`**:
   - Define `AskfilesSettings`, `FolderRule`, `PhraseEntry`, `LayoutConfig`, `NoteTypeConfig`, starter phrases, and default settings.
2. **`src/settings/store.ts`**:
   - Implement `SettingsStore` with reactive subscribe/notify listeners, deep-merge migration of saved data, per-folder layout lookup (`getEffectiveLayout(folderPath)`), and reset helpers.
3. **`src/engine/folder-engine.ts`**:
   - Implement vault folder tree scanning (`getRoot()`, `configDir` & dot-folder exclusion).
   - Implement `isFolderVisible(path)` with `include-all` and `include-chosen` modes, 3 scopes (`folder-and-children`, `children-only`, `folder-only`), and deepest-rule-wins precedence.
   - Implement `getVisibleChildren(folderPath)` (including promoted children when a parent has a `folder-only` exclude rule or deep `include` exception), folder/note counts, fuzzy quick-jump search (`prepareFuzzySearch`), live hidden folder count, and `handleFolderRename(folder, oldPath)`.
4. **`src/engine/phrase-engine.ts`**:
   - Implement level-based phrase selection (`top`, `deeper`, `naming`), per-folder wording override lookup, `fixed` / `random` / `rotate` modes, `paired` vs `mixed` title/description combination, and JSON import/export/restore helpers.
5. **`src/engine/note-creator.ts`**:
   - Implement filename validation (`validateNoteName`, invalid character sanitizer suggesting `" - "` replacements, duplicate file check), folder existence check, template reading, `vault.create()`, and `fileManager.processFrontMatter()` writing only answered hierarchy levels (`category`, `domain`, `subdomain`, etc.) and `type`.

---

## Phase 3: Monochrome Icon Set, Main Wizard View & In-Tab Gear Panel
**Goal**: Build the complete interactive `AskfilesView` and slide-in `GearPanel`.
1. **`src/ui/icons.ts`**:
   - Create matching SVG line icons (`askfiles-lock-open`, `askfiles-lock-closed`, `askfiles-gear`, `askfiles-chevron-left`, `askfiles-folder-plus`, `askfiles-check`) using consistent `currentColor` stroke geometry.
2. **`src/ui/gear-panel.ts` & `src/ui/apply-to-modal.ts`**:
   - Implement the right slide-in drawer (and mobile bottom sheet) with live preview for Lock, View (Grid/List), Columns, Card Size, Phrase Mode, Apply To (`This folder` / `Everywhere` confirmation modal), `More settings →`, and `Reset view`.
3. **`src/views/askfiles-view.ts`**:
   - Implement all wizard screens:
     - First-run welcome screen (`Welcome to Askfiles`, folder count, `Start ↵`)
     - Browse level screen (top bar with `‹ Back`, clickable breadcrumb trail, `[unlocked]/[locked]` + `[gear]`, question title & description, scrollable card grid/list, `Save here` card, `+ New` card when unlocked, bottom filter & quick-jump bar)
     - Empty level screen (`Nothing deeper here`, `Continue ↵`, `+ New folder` when unlocked)
     - Create new folder screen (inline folder creation + locked state guard)
     - Note naming & type picker screen (live duplicate/character warnings with one-click fixes, note type pills/dropdown, `Create note ↵`)
     - Vanished folder recovery screen (`That folder has gone`, `Go back to Home`, `Rescan`)
     - Note created success screen (`Open note ↵`, `Create another here`, `Close`)
   - Implement right-click context menu on folder cards (`Hide this folder`, `Hide its subfolders`, `Open in plugin settings`) with Undo toast/banner.
   - Implement full 2D arrow-key card navigation, shortcuts (`/`, `s`, `l`, `,`, `Escape`, `Backspace`, `Enter`), and directional page transitions (`slide-forward` / `slide-back`).

---

## Phase 4: Declarative Plugin Settings & Manage Modals
**Goal**: Implement `AskfilesSettingTab` using Obsidian 1.13.4+ `getSettingDefinitions()` and all 5 "Manage →" modals.
1. **`src/settings/setting-tab.ts`**:
   - Implement `getSettingDefinitions()` covering General, Questions, Phrase library, Templates, Properties, Folders, Behaviour, and Advanced sections.
2. **Manage Modals (`src/settings/modals/*`)**:
   - `FolderRulesModal`: Interactive vault tree picker with checkboxes, status badges (`hidden`, `included (exception)`), 3-scope selector popup, rules summary list with `✕` delete, live `This will hide N folders` counter, `Rescan now`, `Save`, and `Reset`.
   - `PhraseLibraryModal`: Mode & pairing toggles, filter input, collapsible `Top level` / `Deeper levels` / `Naming page` pools, enable/disable radio/toggle, `+ Add phrase` / edit sub-form (with optional folder target), `Import`, `Export`, and `Restore starter set`.
   - `FolderWordingModal`: Per-folder question title & description overrides table with `+ Add folder wording` and `Reset all`.
   - `TemplatesModal`: Template folder picker and per-note-type template & default radio manager with `+ Add note type`.
   - `ShortcutsModal`: Configurable key bindings for `Move between cards`, `Choose highlighted card`, `Go back one level`, `Focus the search line`, `Toggle the lock`, `Open settings panel`, and `Save here`.

---

## Phase 5: CSS Styling, Theme Polish & Stylelint Compliance
**Goal**: Craft `styles.css` to deliver the borderless, calm aesthetic across light/dark themes and desktop/mobile viewports with zero Stylelint warnings.
1. Implement CSS custom properties (`--askfiles-columns`, card size presets, monochrome icon states, slide animations, reduced-motion media queries, mobile bottom-sheet layout).
2. Run `npm run lint` (`eslint` + `stylelint --max-warnings 0`) and `npm run build` until zero errors and zero warnings remain.

---

## Phase 6: Isolated Obsidian CDP Verification & Acceptance Sign-Off
**Goal**: Verify the built plugin inside a real isolated Obsidian instance via CDP (`obsidian-cdp-debugging`) and complete the acceptance checklist.
1. Create `scripts/` test vault builder and CDP harness (`npm run vault:create`, `npm run debug:launch`, `npm run debug`).
2. Drive and screenshot all key flows (welcome screen, level traversal, lock toggle, gear panel live preview, quick-jump, duplicate/illegal char warnings, note creation + frontmatter verification, folder rules tree picker, phrase library modal, mobile viewport).
3. Update `tracking/acceptance-status.md` and `tracking/current-goal.md`.
