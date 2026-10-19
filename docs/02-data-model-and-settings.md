# Askfiles — Data Model and Settings Schema

All plugin settings are persisted in Obsidian's `data.json` via `this.loadData()` and `this.saveData()`. Every setting has a safe default so the plugin works immediately on first run without configuration.

---

## 1. Core TypeScript Interfaces (`src/types.ts`)

```ts
export type ViewLayoutMode = 'grid' | 'list';
export type ColumnCountOption = 'auto' | 1 | 2 | 3 | 4;
export type CardSizeOption = 'compact' | 'comfortable' | 'large';
export type PhraseSelectionMode = 'fixed' | 'random' | 'rotate';
export type PhrasePairingMode = 'paired' | 'mixed';
export type PhraseLevel = 'top' | 'deeper' | 'naming';

export type ScanMode = 'include-all' | 'include-chosen';
export type RuleAction = 'exclude' | 'include';
export type RuleScope =
  | 'folder-and-children' // This folder and everything inside it
  | 'children-only'       // Only the subfolders (keep this folder visible)
  | 'folder-only';        // Only this folder (hide it, promote/keep children visible)

export interface FolderRule {
  id: string;
  path: string;           // Normalized vault-relative folder path (e.g. "Archive" or "Archive/2024")
  action: RuleAction;
  scope: RuleScope;
}

export interface LayoutConfig {
  view: ViewLayoutMode;
  columns: ColumnCountOption;
  cardSize: CardSizeOption;
  phraseMode: PhraseSelectionMode;
}

export interface PhraseEntry {
  id: string;
  title: string;
  description: string;
  level: PhraseLevel;
  enabled: boolean;
  folderPath?: string;    // Optional per-folder restriction
  isStarter?: boolean;
}

export interface FolderWordingOverride {
  folderPath: string;     // Normalized folder path ("" or "/" for top level)
  title: string;
  description: string;
}

export interface FolderCardMetadata {
  folderPath: string;
  icon?: string;          // Optional monochrome icon ID or character
  description?: string;   // Optional short subtitle shown on card
}

export interface NoteTypeConfig {
  id: string;
  name: string;           // e.g. "Reference", "Idea", "Meeting", "Log"
  templatePath: string;   // e.g. "Templates/Reference.md" or "" for none
}

export interface KeyboardShortcutsConfig {
  focusSearch: string;    // Default: "/"
  toggleLock: string;     // Default: "l"
  openGearPanel: string;  // Default: ","
  saveHere: string;       // Default: "s"
}

export interface AskfilesSettings {
  // First-run & state
  firstRunCompleted: boolean;
  lastVisitedFolder: string;

  // General
  rootFolder: string;                   // Default: "/"
  defaultNoteType: string;              // Default: "Reference"
  openAfterCreating: boolean;           // Default: true

  // Lock & Layout (shared with In-Tab Gear Panel)
  lockFolderCreation: boolean;          // Default: false
  globalLayout: LayoutConfig;
  perFolderLayouts: Record<string, Partial<LayoutConfig>>;
  showCardCounts: boolean;              // Default: true
  folderMetadata: Record<string, FolderCardMetadata>;

  // Questions & Phrase Library
  phrasePairingMode: PhrasePairingMode; // Default: "paired"
  phrases: PhraseEntry[];
  perFolderWording: Record<string, FolderWordingOverride>;
  rotateCounters: Record<string, number>;

  // Templates & Note Types
  enableNoteTypes: boolean;             // Default: true
  templateFolder: string;               // Default: "Templates"
  noteTypes: NoteTypeConfig[];

  // Properties (Frontmatter)
  writeProperties: boolean;             // Default: true
  levelPropertyNames: string[];         // Default: ["category", "domain", "subdomain"]
  typePropertyName: string;             // Default: "type"

  // Folders (Scan, Include & Exclude)
  scanMode: ScanMode;                   // Default: "include-all"
  autoRescan: boolean;                  // Default: true
  hideDotFolders: boolean;              // Default: true
  folderRules: FolderRule[];

  // Behaviour
  rememberLastChoice: boolean;          // Default: false
  quickJumpSearch: boolean;             // Default: true
  hideEmptyFolders: boolean;            // Default: false
  shortcuts: KeyboardShortcutsConfig;

  // Advanced
  debugLogging: boolean;                // Default: false
}
```

---

## 2. Default Settings (`DEFAULT_SETTINGS`)

| Category | Key | Default Value | Rationale |
|---|---|---|---|
| **First Run** | `firstRunCompleted` | `false` | Shows the one-screen welcome message on first open. |
| **General** | `rootFolder` | `"/"` | Scans from vault root by default. |
| **General** | `defaultNoteType` | `"Reference"` | Matches `06-plugin-settings-page-ascii.md`. |
| **General** | `openAfterCreating` | `true` | Opens newly created notes immediately when toggled on. |
| **Lock** | `lockFolderCreation` | `false` | Unlocked on first run (`03-user-flow.md`). |
| **Layout** | `globalLayout.view` | `"grid"` | Borderless card grid (`03-user-flow.md`). |
| **Layout** | `globalLayout.columns` | `"auto"` | Responsive columns based on view width (`04-main-tab-ascii.md`). |
| **Layout** | `globalLayout.cardSize` | `"comfortable"` | Balanced touch and mouse target size (`05-in-tab-settings-ascii.md`). |
| **Layout** | `globalLayout.phraseMode` | `"random"` | Keeps questions lively across visits (`03-user-flow.md`). |
| **Phrases** | `phrasePairingMode` | `"paired"` | Keeps title and description tone matched (`08-phrase-library.md`). |
| **Templates** | `templateFolder` | `"Templates"` | Standard Obsidian template directory (`06-plugin-settings-page-ascii.md`). |
| **Templates** | `noteTypes` | `Reference`, `Idea`, `Meeting`, `Log` | Starter note types from `11-additional-screens-ascii.md`. |
| **Properties** | `writeProperties` | `true` | Writes answered folder levels into frontmatter (`06-plugin-settings-page-ascii.md`). |
| **Properties** | `levelPropertyNames` | `["category", "domain", "subdomain"]` | Configurable hierarchy property keys (`06-plugin-settings-page-ascii.md`). |
| **Properties** | `typePropertyName` | `"type"` | Property key for selected note type (`11-additional-screens-ascii.md`). |
| **Folders** | `scanMode` | `"include-all"` | Includes all folders on load with zero setup (`07-folder-include-exclude.md`). |
| **Folders** | `hideDotFolders` | `true` | Hides `vault.configDir` and dot-folders by default (`07-folder-include-exclude.md`). |
| **Behaviour** | `rememberLastChoice` | `false` | Starts fresh at root unless enabled (`06-plugin-settings-page-ascii.md`). |
| **Behaviour** | `quickJumpSearch` | `true` | Shows the bottom search/quick-jump bar (`06-plugin-settings-page-ascii.md`). |
| **Behaviour** | `hideEmptyFolders` | `false` | Off by default because a new empty folder is often where a note belongs (`06-plugin-settings-page-ascii.md`). |
| **Advanced** | `debugLogging` | `false` | Quiet console unless explicitly enabled (`06-plugin-settings-page-ascii.md`). |

---

## 3. Starter Phrase Library

Ships pre-loaded in `constants.ts` and can be restored at any time via **Restore starter set**:

### Top Level (`level: "top"`)
1. **What's today's job?** — *Pick where this note belongs*
2. **What are we working on?** — *Choose a starting point*
3. **Where does this belong?** — *Start with the big picture*
4. **What are we exploring today?** — *Choose a place to begin*

### Deeper Levels (`level: "deeper"`)
1. **What knowledge are we discussing?** — *Choose a topic, or save it at this level*
2. **Which area shall we dive into?** — *Pick one, or stop here*
3. **Where inside {folder} does this live?** — *Pick a subfolder, or save here*

### Naming Page (`level: "naming"`)
1. **Name your note** — *Give it a title you'll recognise*
2. **What shall we call it?** — *Keep it short and clear*
