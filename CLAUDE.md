# CLAUDE.md — Askfiles (Obsidian Plugin)

## 1. Project Summary

**Askfiles** ("ask, then file") is an Obsidian community plugin (`id: "askfiles"`, `name: "Askfiles"`) that turns note creation into a calm, question-by-question guided flow where **the vault's folders act as the database**.

- **Core Loop**: Each screen asks one human-friendly question (drawn from a configurable Phrase Library or per-folder override) and displays the folders at the current level as borderless, clickable cards. Selecting a folder narrows the next question to its subfolders. At any depth, the user can stop ("Save here") or continue until no subfolders remain, then name the note, optionally select a note type (mapping to a template), and create the note with answered hierarchy levels written into frontmatter properties.
- **Target Platforms**: Desktop and Mobile (`isDesktopOnly: false`), built against Obsidian API `1.14.x` typings with `minAppVersion: "1.13.4"`.
- **Language & Tone**: Use **British English** in all documentation, code comments, and user-facing copy. Use **sentence case** for all UI labels, command names, descriptions, and settings headings (enforced by `eslint-plugin-obsidianmd`).

---

## 2. Repository Map

- `initial-detail/` — Original product brief and ASCII wireframes (`00-README.md` to `12-acceptance-checklist.md`). Treat as the product specification.
- `docs/` — Engineering documentation, architecture, data schemas, folder/phrase engine specs, UI/UX specifications, open-question decisions, and implementation plan:
  - `docs/00-overview.md` — Product & engineering overview
  - `docs/01-architecture.md` — Module architecture, data flow, and Obsidian API integration
  - `docs/02-data-model-and-settings.md` — TypeScript interfaces, settings schema, and defaults
  - `docs/03-folder-engine-and-rules.md` — Vault scanner, include/exclude rule engine (3 scopes, deepest-wins), and rename tracking
  - `docs/04-ui-and-interaction-spec.md` — View architecture, monochrome line icons, gear drawer, settings pages, and keyboard navigation
  - `docs/05-open-questions-decisions.md` — Architectural resolutions for `initial-detail/10-open-questions.md`
  - `docs/06-implementation-plan.md` — Phased build and verification roadmap
- `tracking/` — Live project tracking and status:
  - `tracking/current-goal.md` — Active milestone, immediate objectives, and current blockers/next steps
  - `tracking/roadmap-and-tasks.md` — Phase-by-phase task breakdown and completion status
  - `tracking/acceptance-status.md` — Acceptance checklist & community review checklist status
  - `tracking/decisions-and-log.md` — Engineering decision log and progress history
- `.agents/skills/` — Specialised agent skills:
  - `obsidian-plugin-dev` — Obsidian 1.14.x API rules, `eslint-plugin-obsidianmd`, `stylelint`, declarative settings, and release standards
  - `obsidian-cdp-debugging` — Real-app verification via isolated Obsidian instance and Chrome DevTools Protocol (CDP)

---

## 3. Non-Negotiable Technical & Design Rules

### Obsidian API & Linter Compliance (`obsidian-plugin-dev`)
1. **Shipped Artefacts**: Users receive **only** `main.js`, `manifest.json`, and `styles.css`. Everything required at runtime must be bundled into those files.
2. **No Global `app`**: Always access `this.app` (or pass `app: App` explicitly). Never reference the global `app` variable.
3. **No Node/Electron APIs in Runtime Code**: Because `isDesktopOnly: false`, never import `fs`, `path`, `crypto`, `os`, or `electron` in `src/`. Use Obsidian's `Vault`, `FileManager`, `MetadataCache`, and `normalizePath()`.
4. **DOM & Styling Discipline**:
   - Never use `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval`, or `new Function`. Build DOM nodes via `createEl`, `createDiv`, `createSpan`, and `setIcon` / SVG DOM creation; clear with `el.empty()`.
   - Never assign static inline styles (`el.style.* = ...` or `setAttribute('style', ...)`). Use CSS classes in `styles.css` with Obsidian CSS variables (`--background-*`, `--text-*`, `--interactive-*`).
   - For runtime-computed values (such as dynamic grid column count), use `el.setCssProps({ '--askfiles-columns': String(cols) })` and consume `--askfiles-columns` in `styles.css`.
5. **Declarative Settings (`1.13.4+`)**:
   - Implement `getSettingDefinitions()` on `AskfilesSettingTab extends PluginSettingTab` (do not use legacy `display()`).
   - Follow Obsidian's settings lint rules: sentence case, no top-level plugin title heading inside the tab, and never include the word "settings" in group headings.
6. **Lifecycle & Resource Cleanup**:
   - Keep `onload()` lightweight; defer initial vault scanning to `this.app.workspace.onLayoutReady(...)`.
   - Never store view instances on the plugin class; register the view with `this.registerView(VIEW_TYPE_ASKFILES, (leaf) => new AskfilesView(leaf, this))` and check `leaf.view instanceof AskfilesView`.
   - Do **not** detach leaves in `onunload()`.
   - Register all vault/workspace listeners via `this.registerEvent(...)` and DOM listeners via `this.registerDomEvent(...)`.
7. **Linting Gate**:
   - `npm run lint` must run **both** ESLint (`eslint-plugin-obsidianmd` 0.4.2 `recommended`) and Stylelint (`stylelint` 17.16.0 + `stylelint-no-unsupported-browser-features` 8.1.2 with `--max-warnings 0`).
   - Avoid CSS properties flagged as partial in Chrome 138 by caniuse (e.g. `column-gap` → use `gap: <row> <column>`; multi-value `text-decoration` → use plain `underline` or `background-image` gradient; no duplicate property declarations).

### Design & UX Rules (`initial-detail/09-design-principles.md`)
1. **Borderless & Minimal**: Rely on whitespace, typography, and subtle surface hover/focus states rather than heavy borders or boxes.
2. **Matching Monochrome Line Icons**:
   - The top-right corner of the main view always displays two sibling line icons in fixed order: **Padlock** (`[unlocked]` / `[locked]`) then **Gear** (`[gear]`).
   - Both use matching stroke weight (`1.75px`–`2px`), size (`18px`), and geometry, inheriting `currentColor` (black in light themes, white in dark themes).
   - Lock state is communicated **exclusively by icon shape** (open shackle vs closed shackle), never by red/green colour changes or colour emoji.
3. **Lock vs Exclude Independence**:
   - **Lock** prevents creating new folders anywhere in the flow (hides/disables `+ New`).
   - **Exclude rules** hide existing vault folders from the wizard choices.
   - The UI and documentation must keep these two concepts clearly distinct.

### Real-App Testing & Safety (`obsidian-cdp-debugging`)
1. **Never Touch the User's Real Vault or Profile**: Always launch a separate Obsidian process with `--remote-debugging-port=9222` and `--user-data-dir=<repo>/dev/scratch/profile` pointing only at a scratch test vault in `dev/scratch/vault`.
2. **Keep `tracking/` Current**: Update `tracking/current-goal.md`, `tracking/roadmap-and-tasks.md`, and `tracking/acceptance-status.md` as milestones and tasks are completed.
