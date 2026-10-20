export type ViewLayoutMode = "grid" | "list";
export type ColumnCountOption = "auto" | 1 | 2 | 3 | 4;
export type CardSizeOption = "compact" | "comfortable" | "large";
export type PhraseSelectionMode = "fixed" | "random" | "rotate";
export type PhrasePairingMode = "paired" | "mixed";
export type PhraseLevel = "top" | "deeper" | "naming";

export type ScanMode = "include-all" | "include-chosen";
export type RuleAction = "exclude" | "include";
export type RuleScope =
	| "folder-and-children"
	| "children-only"
	| "folder-only";

export interface FolderRule {
	id: string;
	path: string;
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
	folderPath?: string;
	isStarter?: boolean;
}

export interface FolderWordingOverride {
	folderPath: string;
	title: string;
	description: string;
}

export interface FolderCardMetadata {
	folderPath: string;
	icon?: string;
	description?: string;
}

export interface NoteTypeConfig {
	id: string;
	name: string;
	templatePath: string;
}

export interface KeyboardShortcutsConfig {
	focusSearch: string;
	toggleLock: string;
	openGearPanel: string;
	saveHere: string;
}

export interface AskfilesSettings {
	firstRunCompleted: boolean;
	lastVisitedFolder: string;

	rootFolder: string;
	defaultNoteType: string;
	openAfterCreating: boolean;

	lockFolderCreation: boolean;
	showExistingFiles: boolean;
	searchFilesGlobally: boolean;
	showSearchDropdown: boolean;
	globalLayout: LayoutConfig;
	perFolderLayouts: Record<string, Partial<LayoutConfig>>;
	showCardCounts: boolean;
	folderMetadata: Record<string, FolderCardMetadata>;

	phrasePairingMode: PhrasePairingMode;
	phrases: PhraseEntry[];
	perFolderWording: Record<string, FolderWordingOverride>;
	rotateCounters: Record<string, number>;

	enableNoteTypes: boolean;
	templateFolder: string;
	noteTypes: NoteTypeConfig[];

	writeProperties: boolean;
	levelPropertyNames: string[];
	writeBreadcrumbProperty: boolean;
	breadcrumbPropertyName: string;
	typePropertyName: string;

	scanMode: ScanMode;
	autoRescan: boolean;
	hideDotFolders: boolean;
	folderRules: FolderRule[];

	rememberLastChoice: boolean;
	quickJumpSearch: boolean;
	hideEmptyFolders: boolean;
	shortcuts: KeyboardShortcutsConfig;

	debugLogging: boolean;
}

export interface FolderCardItem {
	path: string;
	name: string;
	displayPath: string;
	visibleSubfolderCount: number;
	noteCount: number;
	icon?: string;
	description?: string;
}

export interface TreeFolderNode {
	path: string;
	name: string;
	depth: number;
	visible: boolean;
	statusLabel: "" | "hidden" | "included (exception)";
	matchingRule?: FolderRule;
	children: TreeFolderNode[];
}

export interface ResolvedPhrase {
	title: string;
	description: string;
}

export type StartBrowseMode = "category" | "domain";

export interface DomainParentMatch {
	categoryName: string;
	categoryPath: string;
	domainFolderPath: string;
	visibleSubfolderCount: number;
	noteCount: number;
}

export interface DomainCardItem {
	domainName: string;
	relativePath: string;
	parents: DomainParentMatch[];
	totalVisibleSubfolders: number;
	totalNotes: number;
}

export interface NoteCardItem {
	path: string;
	basename: string;
	folderPath: string;
	folderDisplayPath?: string;
	categoryName?: string;
}


