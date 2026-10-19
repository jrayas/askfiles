# Askfiles — UI, Icons, and Interaction Specification

## 1. Visual Language & Theme Integration

1. **Borderless Architecture**:
   - No heavy box borders around the main view, cards, or inputs.
   - Cards use subtle background fills (`var(--background-secondary)` / `color-mix` with hover elevation to `var(--background-modifier-hover)`) and generous padding.
   - Focus rings (`var(--interactive-accent)`) appear clearly on `:focus-visible` and keyboard-selected cards.
2. **Matching Monochrome Line Icon Set (`src/ui/icons.ts`)**:
   - All three primary corner icons (`askfiles-lock-open`, `askfiles-lock-closed`, `askfiles-gear`) are custom SVG line icons drawn on a `24×24` viewBox with `stroke="currentColor"`, `stroke-width="1.75"`, `stroke-linecap="round"`, `stroke-linejoin="round"`, and `fill="none"`.
   - Because they use `currentColor` and inherit `--text-muted` (brightening to `--text-normal` on hover/focus), they are automatically black/charcoal in light themes and white/off-white in dark themes.
   - **Never** change padlock colour to red or green when locked/unlocked. Only the shackle path changes between open and closed.

---

## 2. Main Tab (`AskfilesView`) Layout

```text
┌──────────────────────────────────────────────────────────────────────┐
│ ‹ Back     Home › Knowledge                        [unlocked] [gear] │  <- Top Bar (fixed height)
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                   What knowledge are we discussing?                  │  <- Question Header
│                 Choose a topic, or save it at this level             │
│                                                                      │
│     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│     │ Physics     │  │ Maths       │  │ Chemistry   │                │  <- Scrollable Card Area
│     │ 12 notes    │  │ 18 notes    │  │ 9 notes     │                │     (Grid or List)
│     └─────────────┘  └─────────────┘  └─────────────┘                │
│     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│     │ Save here   │  │ + New       │  │             │                │
│     └─────────────┘  └─────────────┘  └─────────────┘                │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                     Search or type a path...                         │  <- Footer Filter / Quick-Jump
└──────────────────────────────────────────────────────────────────────┘
```

### Top Bar Behaviour
- **Left**:
  - Hidden on the root level (`Home`).
  - On deeper levels (and naming/new-folder screens), shows `‹ Back` button and the clickable **Breadcrumb trail** (`Home › Knowledge › Physics`). Clicking any breadcrumb segment slides back to that level.
- **Right**:
  - Always positioned in the top-right corner in fixed order: **Padlock** button, then **Gear** button.
  - Both buttons include accessible `aria-label` and `aria-pressed` attributes (`"Lock folder creation"` / `"Unlock folder creation"`, `"Open view settings"`).

### Card Area & Action Cards
- **Folder Cards**:
  - Display folder name, optional monochrome icon/symbol and description (`folderMetadata`), and optional count (`12 folders` or `30 notes`).
  - Right-clicking (or long-pressing on touch) a folder card opens an Obsidian `Menu` with:
    - `Hide this folder` (adds `exclude` rule with `folder-and-children`, shows inline/toast confirmation with `Undo`)
    - `Hide its subfolders` (adds `exclude` rule with `children-only`, with `Undo`)
    - `Open in plugin settings` (opens plugin settings / folder rules manager)
- **Special Action Cards**:
  - **`Save here`**: Present at every folder level so the user can stop at the current depth and proceed directly to the **Name your note** step for the current folder.
  - **`+ New`**: Present when `lockFolderCreation === false`. Opens the inline **New folder** creation step. Completely hidden when `lockFolderCreation === true`.

### Bottom Search / Filter Line
- At the root level (or when `/` is pressed), typing into `Search or type a path...`:
  - Filters visible cards at the current level **and** (when `settings.quickJumpSearch === true`) shows fuzzy-matched folder paths across all visible depths (`Knowledge › Physics › Optics`) using Obsidian's `prepareFuzzySearch`.
  - Arrow keys (`↑` / `↓`) highlight quick-jump matches; `Enter` jumps straight to that folder's naming or browse step.

---

## 3. Page Transitions & Reduced Motion

- Navigating deeper applies `.askfiles-stage--slide-forward` (subtle `translateX(18px)` → `0` + opacity fade over `160ms cubic-bezier(0.22, 1, 0.36, 1)`).
- Navigating back applies `.askfiles-stage--slide-back` (`translateX(-18px)` → `0` over `160ms`).
- Under `@media (prefers-reduced-motion: reduce)` or when Obsidian's reduced-motion class is active, animations are disabled (`animation: none; transition: none`).

---

## 4. In-Tab Gear Panel (`src/ui/gear-panel.ts`)

- Triggered by clicking the top-right `[gear]` icon or pressing `,` (when not typing in an input).
- **Desktop**: Slides in from the right edge over the right side of the main tab (`width: 280px`), keeping the cards visible on the left so layout changes preview live.
- **Mobile (`Platform.isMobile` or narrow container `< 600px`)**: Slides up as a bottom sheet.
- **Controls**:
  1. **Folders**: `Lock folder creation` (toggle — stays in instant sync with top-bar padlock)
  2. **Layout**:
     - `View`: `Grid` / `List`
     - `Columns`: `Auto` / `1` / `2` / `3` / `4`
     - `Card size`: `Compact` / `Comfortable` / `Large`
  3. **Titles**:
     - `Phrase mode`: `Random` / `Rotate` / `Fixed`
  4. **Scope & Actions**:
     - `Apply to`: `This folder` / `Everywhere` (selecting `Everywhere` opens the confirmation prompt noting that it will replace folder-specific layouts)
     - `More settings →`: Opens Obsidian's Settings window directly to Askfiles (`this.app.setting.open(); this.app.setting.openTabById('askfiles')`)
     - `Reset view`: Restores default layout settings (`grid`, `auto`, `comfortable`, `random`)

---

## 5. Note Naming, Validation & Creation Step

On the **Name your note** screen:
- **Title Input**: Auto-focused borderless input (`Quantum entanglement`).
- **Live Validation**:
  - **Illegal Characters**: Obsidian forbids `\ / : * ? " < > |` in filenames. If typed, an inline warning appears:
    *Some characters can't be used in note names. Use "Physics - Quantum - Spin"?* with a `[ Use this ]` button.
  - **Duplicate Note**: If `<currentFolder>/<sanitizedName>.md` already exists, an inline warning appears:
    *A note with this name already exists here. Open it instead, or choose a different name.* with `[ Open existing ]` and `[ Rename ]` actions.
  - **Vanished Folder**: If the destination folder no longer exists in `this.app.vault`, transitions to the **That folder has gone** screen (`Go back to Home` / `Rescan`).
- **Note Type Picker**:
  - Displays configured note types as selectable pills (or dropdown when more than 4 types) defaulting to `settings.defaultNoteType`.
- **Creation Pipeline (`NoteCreator.createNote`)**:
  1. Reads template content from `<templatePath>` if the chosen note type maps to an existing template file in the vault.
  2. Creates the `.md` file via `this.app.vault.create(fullPath, initialContent)`.
  3. If `settings.writeProperties === true`, calls `this.app.fileManager.processFrontMatter(file, (fm) => ...)` to write only the answered folder hierarchy levels (e.g. `category`, `domain`, `subdomain`) and `type` (if selected). Never writes empty keys.
  4. If `settings.openAfterCreating === true`, opens the new file in a workspace leaf (`this.app.workspace.getLeaf(false).openFile(file)`) and shows the confirmation state if the user returns to the Askfiles tab.

---

## 6. Keyboard Navigation Matrix

| Key | Action in Browse / Card Grid | Action in Filter / Naming Input |
|---|---|---|
| `←` `→` `↑` `↓` | Moves active focus highlight across rows and columns of cards | Moves cursor (`↑`/`↓` navigates quick-jump list when active) |
| `Enter` | Activates highlighted card (or `Save here` if default focused) | Submits note name / jumps to selected quick-jump folder |
| `Escape` | Closes Gear Panel if open; otherwise goes up one folder level | Clears filter / blurs input; second `Escape` goes up one level |
| `Backspace` | Goes up one folder level (when filter is empty) | Deletes character; if empty, goes up one folder level |
| `/` | Focuses bottom filter / quick-jump search input | Types `/` (or triggers character sanitizer in note name) |
| `s` or `S` | Immediately triggers **Save here** at current level | Types `s` |
| `l` or `L` | Toggles **Lock folder creation** | Types `l` |
| `,` | Opens/closes **In-Tab Gear Panel** | Types `,` |
| `<character>` | Auto-focuses filter box and begins filtering cards | Types into focused input |

---

## 7. Plugin Settings Page & Lint Reconciliation

In `06-plugin-settings-page-ascii.md`, the ASCII wireframe shows a top heading `Askfiles Settings` and section groups (`General`, `Questions`, `Phrase Library`, `Templates`, `Properties`, `Folders`, `Behaviour`, `Advanced`).

> [!IMPORTANT]
> **Obsidian ESLint Rule Reconciliation (`obsidianmd/settings-tab/no-problematic-settings-headings`)**:
> Obsidian's official review bot and `eslint-plugin-obsidianmd` forbid:
> 1. A top-level heading repeating the plugin name or the word "Settings".
> 2. Calling a section heading "General" as the very first heading when ungrouped items can sit at the top.
> 3. Non-sentence-case headings (e.g., `Phrase Library` must be `Phrase library`).
>
> Therefore, in `AskfilesSettingTab.getSettingDefinitions()`:
> - General settings (`Root folder`, `Excluded folders`, `Default note type`, `Open after creating`) sit at the top level of the tab without a redundant "Askfiles Settings" or "General" heading.
> - Section groups use sentence-case headings: `Questions`, `Phrase library`, `Templates`, `Properties`, `Folders`, `Behaviour`, and `Advanced`.
> - Every "Manage →" button opens a dedicated, clean Obsidian `Modal` for that subsystem (`FolderWordingModal`, `PhraseLibraryModal`, `TemplatesModal`, `FolderRulesModal`, `ShortcutsModal`).
