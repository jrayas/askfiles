# Roadmap & Task Tracker

## Phase 0: Discovery, Architecture & Documentation
- [x] Read all 13 product specification files in `initial-detail/`
- [x] Migrate `.agents/skills/` to Antigravity format (`subagent: true`)
- [x] Create root `CLAUDE.md`
- [x] Write `docs/00-overview.md`
- [x] Write `docs/01-architecture.md`
- [x] Write `docs/02-data-model-and-settings.md`
- [x] Write `docs/03-folder-engine-and-rules.md`
- [x] Write `docs/04-ui-and-interaction-spec.md`
- [x] Write `docs/05-open-questions-decisions.md`
- [x] Write `docs/06-implementation-plan.md`
- [x] Initialise `tracking/` directory

---

## Phase 1: Project Scaffold, Build Pipeline & Linting Setup
- [x] Create `manifest.json` (`id: "askfiles"`, `name: "Askfiles"`, `minAppVersion: "1.13.4"`, `isDesktopOnly: false`)
- [x] Create `package.json`, `versions.json`, `.npmrc`, `version-bump.mjs`, `.gitignore`, `LICENSE`, `README.md`
- [x] Create `tsconfig.json`, `esbuild.config.mjs`, `eslint.config.mts`, `.stylelintrc.json`
- [x] Install dev dependencies (`obsidian@1.14.4`, `typescript@5.9.3`, `esbuild`, `eslint@9.39.4`, `eslint-plugin-obsidianmd@0.4.2`, `stylelint@17.16.0`, `stylelint-no-unsupported-browser-features@8.1.2`)

---

## Phase 2: Core Data Models, Settings Store & Engines
- [x] `src/types.ts` — Full TypeScript interfaces for settings, folder rules, phrases, templates, and view state
- [x] `src/constants.ts` — View type constants, starter phrases (`top`, `deeper`, `naming`), starter note types, and `DEFAULT_SETTINGS`
- [x] `src/settings/store.ts` — Reactive settings store, per-folder layout resolver, and reset helpers
- [x] `src/engine/folder-engine.ts` — Vault scanner, dot-folder/`configDir` filter, 3-scope include/exclude rule evaluator (deepest-wins), counts, fuzzy quick-jump search, and folder rename path updater
- [x] `src/engine/phrase-engine.ts` — Phrase pool selector (`fixed`, `random`, `rotate`), `paired` vs `mixed` title/description resolver, per-folder wording override, import/export/restore
- [x] `src/engine/note-creator.ts` — Filename validator & character sanitizer, duplicate detector, template loader, `vault.create()`, and `fileManager.processFrontMatter()` writer

---

## Phase 3: Monochrome Icon Set, Main Wizard View & In-Tab Gear Panel
- [x] `src/ui/icons.ts` — Matching black/white SVG line icons (`askfiles-lock-open`, `askfiles-lock-closed`, `askfiles-gear`, etc.)
- [x] `src/ui/apply-to-modal.ts` — Confirmation modal for applying layout to `This folder only` vs `Everywhere`
- [x] `src/ui/gear-panel.ts` — Slide-in right drawer (desktop) and bottom sheet (mobile) with live layout preview
- [x] `src/views/askfiles-view.ts` — Full wizard `ItemView` (Welcome, Browse, Empty Level, New Folder, Naming + Type Picker, Vanished Folder, Success, Context Menu with Undo, 2D Keyboard Navigation, Quick-Jump Search)
- [x] `src/main.ts` — Plugin entry point, view registration, commands, ribbon icon, `onLayoutReady` vault listeners

---

## Phase 4: Declarative Plugin Settings & Manage Modals
- [x] `src/settings/setting-tab.ts` — Declarative `getSettingDefinitions()` implementation
- [x] `src/settings/modals/folder-rules-modal.ts` — Vault tree picker, checkboxes, 3-scope selector, rules list, live hidden folder counter, Rescan/Save/Reset
- [x] `src/settings/modals/phrase-library-modal.ts` — Level pools, add/edit phrase form, toggle enable, import/export/restore starter set
- [x] `src/settings/modals/folder-wording-modal.ts` — Per-folder question title & description overrides manager
- [x] `src/settings/modals/templates-modal.ts` — Note type & template mapping manager
- [x] `src/settings/modals/shortcuts-modal.ts` — Keyboard shortcut customization modal

---

## Phase 5: CSS Styling, Theme Polish & Linter Verification
- [x] `styles.css` — Borderless card grid/list, monochrome corner icons, slide transitions, reduced motion, gear drawer, mobile bottom sheet, modal tables/trees
- [x] Zero errors and zero warnings on `npm run lint` (`eslint` + `stylelint --max-warnings 0`)
- [x] Clean production bundle on `npm run build`

---

## Phase 6: Isolated Obsidian CDP Testing & Acceptance Verification
- [x] Create `scripts/` CDP test vault and runner (`vault:create`, `debug:launch`, `debug`)
- [x] Create `tests/engines.test.mjs` unit tests (5/5 passing)
- [x] Verify all acceptance criteria in isolated Obsidian instance and update `tracking/acceptance-status.md`
