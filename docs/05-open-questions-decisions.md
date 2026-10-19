# Askfiles — Open Questions & Architectural Decisions

This document resolves the 8 open questions listed in [10-open-questions.md](../initial-detail/10-open-questions.md) with concrete engineering defaults.

---

## Decision Matrix

### 1. Should "Type" (meeting, reference, idea, log, etc.) be a folder level or a property chosen at the end?
- **Decision**: **Property plus optional template chosen at the final naming step** (matching the brief's leaning).
- **Rationale**: Prevents users from having to duplicate `Meetings/`, `References/`, and `Ideas/` subfolders inside every single domain folder. On the final `Name your note` screen (`04-main-tab-ascii.md` & `11-additional-screens-ascii.md`), the user selects a Note Type (`Reference`, `Idea`, `Meeting`, `Log`, etc.), which writes `type: <chosen>` to frontmatter and applies the mapped template file if configured.

### 2. Should card appearance (icon, description) be stored inside each folder or in the plugin's central settings?
- **Decision**: **Stored in the plugin's central settings (`data.json` under `folderMetadata`)**, with automatic path migration when folders are renamed or moved.
- **Rationale**: Keeps the user's vault completely clean—Askfiles never litters the user's folders with hidden `.askfiles` metadata files. Because `FolderEngine` listens to `vault.on('rename')`, central path keys survive folder renames and moves seamlessly.

### 3. Should the gear open as a slide-in panel or replace the page?
- **Decision**: **Slide-in overlay panel on the right (desktop) and bottom sheet (mobile)**.
- **Rationale**: Matches `05-in-tab-settings-ascii.md` and `11-additional-screens-ascii.md`. Keeping the card grid visible behind/beside the panel allows changes to `View` (Grid/List), `Columns`, `Card size`, `Lock`, and `Phrase mode` to preview live.

### 4. When someone stops early ("Save here"), does the final step still always ask for type and template?
- **Decision**: **Yes** (matching the brief's leaning).
- **Rationale**: Whether the user stops at level 0 (`Home`), level 1 (`Knowledge`), or level 3 (`Knowledge/Physics/Optics`), clicking `Save here` transitions to the same calm `Name your note` screen where they enter the note title and optionally pick the note type/template. Only the hierarchy levels actually traversed are written to frontmatter properties.

### 5. Where does the plugin live: a full tab, a sidebar panel, or a popup, or more than one?
- **Decision**: **Full main workspace tab (`ItemView` opened in a main leaf via `workspace.getLeaf('tab')`) as the primary experience**, plus a ribbon icon and command (`Open note creator`) so it can also be dragged into a sidebar split or opened anytime.
- **Rationale**: All ASCII wireframes (`04-main-tab-ascii.md`, `05-in-tab-settings-ascii.md`) are designed around a spacious, calm main tab with responsive collapse when placed in a narrower pane or mobile screen.

### 6. Should the quick-jump search be on every page or only the first?
- **Decision**: **Present at the bottom of every browse page**, acting as a unified filter + quick-jump bar.
- **Rationale**: On the root page its placeholder reads `Search or type a path...`; on deeper pages it reads `Filter topics...` (or `Filter folders...`) while still surfacing deep path matches beneath if the user types a nested folder name or `/` path. This satisfies both `04-main-tab-ascii.md` and `11-additional-screens-ascii.md`.

### 7. Differentiation from existing plugins (QuickAdd, Templater, Modal Forms)
- **Decision**: Askfiles focuses strictly on **zero-setup, folder-driven conversational filing** (`Folders as the database`).
- **Rationale**: Unlike QuickAdd or Modal Forms—which require manual form/macro configuration before use—Askfiles works the moment it is enabled by turning the existing folder tree into a guided question flow.

### 8. Plugin ID and Naming Compliance
- **Decision**:
  - `id`: `"askfiles"`
  - `name`: `"Askfiles"`
  - `description`: `"Create notes through a calm, question-by-question flow using your vault folders as the choices."`
- **Rationale**: Complies with all rules in `manifest-and-release.md` (lowercase hyphenated ID without `obsidian` or `plugin`, name without "Plugin" or "Wizard", description ≤ 250 chars starting with an action verb and ending with a full stop).
