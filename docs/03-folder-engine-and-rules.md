# Askfiles — Folder Scanner & Include/Exclude Rule Engine

This document specifies how Askfiles scans the vault folder hierarchy, evaluates include/exclude rules across all three scopes, handles deepest-rule-wins precedence, and keeps rules synchronised when folders are renamed or moved.

---

## 1. Vault Folder Scanning

1. **Source of Truth**: `this.app.vault.getRoot()` (or the configured `settings.rootFolder` resolved via `this.app.vault.getFolderByPath(normalizePath(rootFolder))`).
2. **Dot-Folder & Config Filtering**:
   - Any folder whose name starts with `.` (when `settings.hideDotFolders === true`) or whose path equals `this.app.vault.configDir` is excluded before rule evaluation.
   - Note: Never hardcode `".obsidian"`; always compare against `this.app.vault.configDir` to satisfy `obsidianmd/hardcoded-config-path`.
3. **Template Folder Exclusion (Optional)**:
   - Folders can be hidden via default or user-created exclude rules (for example `Archive`, `Attachments`).
4. **Counts Calculation**:
   - For each `TFolder`, `FolderEngine` computes:
     - `visibleSubfolderCount`: Number of immediate (or promoted) child folders visible after rule evaluation.
     - `noteCount`: Number of direct `TFile` children with `.md` extension.
   - Card subtitle displays e.g. `12 folders` (if `visibleSubfolderCount > 0`) or `30 notes` (if `visibleSubfolderCount === 0` and `noteCount > 0`).
   - If `settings.hideEmptyFolders === true`, folders with `0` visible subfolders and `0` markdown notes are omitted from the wizard choices.

---

## 2. Rule Scopes & Deepest-Wins Precedence

Each `FolderRule` consists of:
- `path`: Normalized folder path (e.g. `"Archive"`, `"Archive/2024"`, `"Knowledge/Drafts"`).
- `action`: `'exclude' | 'include'`.
- `scope`:
  1. `'folder-and-children'` — Applies `action` to `path` **and** all descendants of `path`.
  2. `'children-only'` — Keeps `path` itself untouched by this rule, and applies `action` to all descendants of `path` (`childPath.startsWith(path + '/')`).
  3. `'folder-only'` — Applies `action` **only** to `path` itself (`targetPath === path`), leaving its children unaffected by this rule.

### Evaluation Algorithm (`isFolderVisible(targetPath: string): boolean`)

For any candidate folder `targetPath`:

1. **Base Visibility**:
   - If `scanMode === 'include-all'`, `baseVisible = true`.
   - If `scanMode === 'include-chosen'`, `baseVisible = false`.
2. **Matching Rules**:
   - Collect all rules in `settings.folderRules` that apply to `targetPath`:
     - A rule on `rule.path` with `scope === 'folder-and-children'` matches `targetPath` if `targetPath === rule.path || targetPath.startsWith(rule.path + '/')`.
     - A rule on `rule.path` with `scope === 'children-only'` matches `targetPath` if `targetPath.startsWith(rule.path + '/')`.
     - A rule on `rule.path` with `scope === 'folder-only'` matches `targetPath` if `targetPath === rule.path`.
3. **Deepest-Rule-Wins Resolution**:
   - If no rules match `targetPath`, return `baseVisible`.
   - Otherwise, sort matching rules by:
     1. **Path depth** (number of `/` segments in `rule.path`, descending — deeper path wins).
     2. **Scope specificity** at the same path (`'folder-only'` > `'children-only'` > `'folder-and-children'`).
   - The highest-priority matching rule determines visibility:
     - `winningRule.action === 'include'` → `true`
     - `winningRule.action === 'exclude'` → `false`

### Handling Hidden Intermediate Folders (`folder-only` exclude or deep `include` exception)

Consider two important cases from `07-folder-include-exclude.md`:
- **Case A (`scope: 'folder-only'` exclude on `Knowledge/Sub`)**: `Knowledge/Sub` is hidden, but its children (`Knowledge/Sub/TopicA`) remain visible. When the user is inside `Knowledge`, `TopicA` is surfaced as a choice (or reachable via traversal) so "keep what's inside visible" works as promised.
- **Case B (Deep `include` exception inside excluded parent, e.g., `Archive` excluded with `folder-and-children`, `Archive/2024` included with `folder-and-children`)**:
  - `Archive` itself is marked hidden by the `Archive` rule, **unless** it has at least one visible descendant (`Archive/2024`), or `Archive › 2024` is surfaced so the user can reach `2024`.
  - Specifically: in the wizard tree, if an excluded folder `Archive` contains an included exception `Archive/2024`, we either allow traversing `Archive` (showing only `2024` inside it) or surface `Archive › 2024` directly at the parent level. Allowing traversal into `Archive` (where only `2024` is visible) **and** showing `Archive › 2024` in Quick-Jump ensures `2024` is always reachable both step-by-step and via search.

---

## 3. Interactive Tree Picker Synchronization

In the **Folders (Manage →)** modal (`07-folder-include-exclude.md`):
- Every folder in the vault tree is shown with:
  - Expand/collapse chevron (`▾` / `▸`)
  - Checkbox (`☑` / `☐`) reflecting `isFolderVisible(folder.path)`
  - Folder name
  - Right-hand status badge (`hidden`, `included (exception)`, or blank when default-included)
  - Scope menu trigger to pick between the 3 scopes (`folder-and-children`, `children-only`, `folder-only`)
- **Ticking / Unticking Behaviour**:
  - Unticking a visible folder adds/updates an `exclude` rule (`folder-and-children`) for that path (and removes redundant deeper rules if appropriate).
  - Ticking a child inside an excluded parent automatically creates an `include` exception rule (`folder-and-children`) at the child's path.
  - The **Rules summary list** and the **Tree checkboxes** read and mutate the same draft `FolderRule[]` array so they never drift out of sync.
- **Live Hidden Count**:
  - Recomputed on every change: `This will hide N folders` (counting all non-dot vault folders where `isFolderVisible(path) === false`).

---

## 4. Surviving Folder Renames and Moves

When `this.app.vault.on('rename', (file, oldPath) => ...)` fires for a `TFolder`:
- Every path reference `p` in `folderRules`, `perFolderLayouts`, `perFolderWording`, and `folderMetadata` is checked:
  - If `p === oldPath`, it is updated to `file.path`.
  - If `p.startsWith(oldPath + '/')`, its prefix `oldPath` is replaced with `file.path`.
- The updated settings are persisted immediately via `store.save()`.
