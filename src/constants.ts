import type {
	AskfilesSettings,
	LayoutConfig,
	NoteTypeConfig,
	PhraseEntry,
} from "./types";

export const VIEW_TYPE_ASKFILES = "askfiles-view";

export const DEFAULT_LAYOUT: LayoutConfig = {
	view: "grid",
	columns: "auto",
	cardSize: "comfortable",
	phraseMode: "random",
};

export function createStarterPhrases(): PhraseEntry[] {
	return [
		{
			id: "starter-top-1",
			title: "What's today's job?",
			description: "Pick where this note belongs",
			level: "top",
			enabled: true,
			isStarter: true,
		},
		{
			id: "starter-top-2",
			title: "What are we working on?",
			description: "Choose a starting point",
			level: "top",
			enabled: true,
			isStarter: true,
		},
		{
			id: "starter-top-3",
			title: "Where does this belong?",
			description: "Start with the big picture",
			level: "top",
			enabled: true,
			isStarter: true,
		},
		{
			id: "starter-deeper-1",
			title: "What knowledge are we discussing?",
			description: "Choose a topic, or save it at this level",
			level: "deeper",
			enabled: true,
			isStarter: true,
		},
		{
			id: "starter-deeper-2",
			title: "Which area shall we dive into?",
			description: "Pick one, or stop here",
			level: "deeper",
			enabled: true,
			isStarter: true,
		},
		{
			id: "starter-naming-1",
			title: "Name your note",
			description: "Give it a title you'll recognise",
			level: "naming",
			enabled: true,
			isStarter: true,
		},
		{
			id: "starter-naming-2",
			title: "What shall we call it?",
			description: "Keep it short and clear",
			level: "naming",
			enabled: true,
			isStarter: true,
		},
	];
}

export function createStarterNoteTypes(): NoteTypeConfig[] {
	return [
		{
			id: "type-reference",
			name: "Reference",
			templatePath: "Templates/Reference.md",
		},
		{
			id: "type-idea",
			name: "Idea",
			templatePath: "Templates/Idea.md",
		},
		{
			id: "type-meeting",
			name: "Meeting",
			templatePath: "Templates/Meeting.md",
		},
		{
			id: "type-log",
			name: "Log",
			templatePath: "",
		},
	];
}

export const DEFAULT_SETTINGS: AskfilesSettings = {
	firstRunCompleted: false,
	lastVisitedFolder: "",

	rootFolder: "/",
	defaultNoteType: "Reference",
	openAfterCreating: true,

	lockFolderCreation: false,
	showExistingFiles: false,
	searchFilesGlobally: true,
	showSearchDropdown: true,
	globalLayout: { ...DEFAULT_LAYOUT },
	perFolderLayouts: {},
	showCardCounts: true,
	folderMetadata: {},

	phrasePairingMode: "paired",
	phrases: createStarterPhrases(),
	perFolderWording: {},
	rotateCounters: {},

	enableNoteTypes: true,
	templateFolder: "Templates",
	noteTypes: createStarterNoteTypes(),

	writeProperties: true,
	levelPropertyNames: ["category", "domain", "subdomain"],
	writeBreadcrumbProperty: false,
	breadcrumbPropertyName: "breadcrumb",
	typePropertyName: "type",

	scanMode: "include-all",
	autoRescan: true,
	hideDotFolders: true,
	folderRules: [],

	rememberLastChoice: false,
	quickJumpSearch: true,
	hideEmptyFolders: false,
	shortcuts: {
		focusSearch: "/",
		toggleLock: "l",
		openGearPanel: ",",
		saveHere: "s",
	},

	debugLogging: false,
};
