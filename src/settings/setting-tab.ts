import {
	App,
	Notice,
	PluginSettingTab,
	Setting,
	type SettingDefinitionItem,
} from "obsidian";
import type AskfilesPlugin from "../main";
import type { AskfilesSettings, ScanMode } from "../types";
import { FolderRulesModal } from "./modals/folder-rules-modal";
import { FolderWordingModal } from "./modals/folder-wording-modal";
import { PhraseLibraryModal } from "./modals/phrase-library-modal";
import { ShortcutsModal } from "./modals/shortcuts-modal";
import { TemplatesModal } from "./modals/templates-modal";

/**
 * Declarative Plugin Setting Tab (`06-plugin-settings-page-ascii.md`).
 * Uses Obsidian 1.13.4+ `getSettingDefinitions()` API.
 * Follows all `eslint-plugin-obsidianmd` settings rules:
 * - Sentence case throughout
 * - No top-level "Askfiles Settings" or "General" heading
 * - No "settings" word in group headings
 */
export class AskfilesSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private plugin: AskfilesPlugin,
	) {
		super(app, plugin);
	}

	getControlValue<K extends keyof AskfilesSettings>(
		key: K,
	): AskfilesSettings[K] {
		return this.plugin.store.settings[key];
	}

	async setControlValue<K extends keyof AskfilesSettings>(
		key: K,
		value: AskfilesSettings[K],
	): Promise<void> {
		await this.plugin.store.update({
			[key]: value,
		});
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		const { settings } = this.plugin.store;

		const excludedListText =
			settings.folderRules
				.filter((r) => r.action === "exclude")
				.map((r) => r.path)
				.join(", ") || "None";

		const noteTypeOptions: Record<string, string> = {};
		for (const nt of settings.noteTypes) {
			noteTypeOptions[nt.name] = nt.name;
		}
		if (Object.keys(noteTypeOptions).length === 0) {
			noteTypeOptions.Reference = "Reference";
		}

		return [
			// Top-level general items
			{
				name: "Root folder",
				desc: "Starting folder for the note creator. Layout options live in the in-tab gear panel.",
				control: {
					type: "text",
					key: "rootFolder",
					defaultValue: "/",
				},
			},
			{
				name: "Excluded folders",
				desc: `${excludedListText} (see Folders below)`,
				render: (setting: Setting) => {
					setting.addButton((btn) => {
						btn.setButtonText("Manage").onClick(() => {
							new FolderRulesModal(
								this.app,
								this.plugin.store,
								this.plugin.folderEngine,
								() => this.update(),
							).open();
						});
					});
				},
			},
			{
				name: "Default note type",
				desc: "Pre-selected note type on the final naming screen.",
				control: {
					type: "dropdown",
					key: "defaultNoteType",
					defaultValue: "Reference",
					options: noteTypeOptions,
				},
			},
			{
				name: "Open after creating",
				desc: "Open the new note immediately after it is created.",
				control: {
					type: "toggle",
					key: "openAfterCreating",
					defaultValue: true,
				},
			},

			// Questions
			{
				type: "group",
				heading: "Questions",
				items: [
					{
						name: "Starting question",
						desc: "Uses phrase library by default.",
						render: (setting: Setting) => {
							setting.addButton((btn) => {
								btn.setButtonText("Phrase library").onClick(
									() => {
										new PhraseLibraryModal(
											this.app,
											this.plugin.store,
											this.plugin.phraseEngine,
											this.plugin.folderEngine,
										).open();
									},
								);
							});
						},
					},
					{
						name: "Per-folder question wording",
						desc: "Set a custom title and description for specific folders.",
						render: (setting: Setting) => {
							setting.addButton((btn) => {
								btn.setButtonText("Manage").onClick(() => {
									new FolderWordingModal(
										this.app,
										this.plugin.store,
										this.plugin.folderEngine,
									).open();
								});
							});
						},
					},
				],
			},

			// Phrase library
			{
				type: "group",
				heading: "Phrase library",
				items: [
					{
						name: "Add, edit or disable titles and descriptions",
						desc: "Manage question pools for the top level, deeper levels, and naming page.",
						render: (setting: Setting) => {
							setting.addButton((btn) => {
								btn.setButtonText("Manage").onClick(() => {
									new PhraseLibraryModal(
										this.app,
										this.plugin.store,
										this.plugin.phraseEngine,
										this.plugin.folderEngine,
									).open();
								});
							});
						},
					},
					{
						name: "Import or export library",
						desc: "Back up or share your custom question phrases as JSON.",
						render: (setting: Setting) => {
							setting.addButton((btn) => {
								btn.setButtonText("Export").onClick(() => {
									const json =
										this.plugin.phraseEngine.exportLibraryJson();
									void navigator.clipboard?.writeText(json);
									new Notice(
										"Phrase library JSON copied to clipboard.",
									);
								});
							});
							setting.addButton((btn) => {
								btn.setButtonText("Import").onClick(() => {
									new PhraseLibraryModal(
										this.app,
										this.plugin.store,
										this.plugin.phraseEngine,
										this.plugin.folderEngine,
									).open();
								});
							});
						},
					},
				],
			},

			// Templates
			{
				type: "group",
				heading: "Templates",
				items: [
					{
						name: "Template per note type",
						desc: "Map each note type to a template file in your vault.",
						render: (setting: Setting) => {
							setting.addButton((btn) => {
								btn.setButtonText("Manage").onClick(() => {
									new TemplatesModal(
										this.app,
										this.plugin.store,
										() => this.update(),
									).open();
								});
							});
						},
					},
					{
						name: "Template folder",
						desc: "Folder containing your markdown templates.",
						control: {
							type: "folder",
							key: "templateFolder",
							defaultValue: "Templates",
						},
					},
				],
			},

			// Properties
			{
				type: "group",
				heading: "Properties",
				items: [
					{
						name: "Write category, domain, subdomain to note properties",
						desc: "Only levels that were answered are written. No empty fields.",
						control: {
							type: "toggle",
							key: "writeProperties",
							defaultValue: true,
						},
					},
					{
						name: "Property names",
						desc: "Comma-separated property names for each folder level (for example: category, domain, subdomain).",
						render: (setting: Setting) => {
							setting.addText((text) => {
								text.setPlaceholder(
									"Category, domain, subdomain",
								)
									.setValue(
										settings.levelPropertyNames.join(", "),
									)
									.onChange((val) => {
										const parsed = val
											.split(",")
											.map((s) => s.trim())
											.filter(Boolean);
										if (parsed.length > 0) {
											void this.plugin.store.update({
												levelPropertyNames: parsed,
											});
										}
									});
							});
						},
					},
					{
						name: "Write as a single breadcrumb property",
						desc: "Combine the folder path into one property (for example: Knowledge/Physics/Electrical) so only the breadcrumb and note type are written.",
						control: {
							type: "toggle",
							key: "writeBreadcrumbProperty",
							defaultValue: false,
						},
					},
					{
						name: "Breadcrumb property name",
						desc: "Property name used for the single combined folder path.",
						control: {
							type: "text",
							key: "breadcrumbPropertyName",
							defaultValue: "breadcrumb",
							placeholder: "breadcrumb",
						},
					},
				],
			},

			// Folders
			{
				type: "group",
				heading: "Folders",
				items: [
					{
						name: "Scan mode",
						desc: "Include all folders and exclude exceptions, or include only ticked folders.",
						control: {
							type: "dropdown",
							key: "scanMode",
							defaultValue: "include-all" satisfies ScanMode,
							options: {
								"include-all": "Include all",
								"include-chosen": "Include only chosen",
							},
						},
					},
					{
						name: "Rules and tree picker",
						desc: "Choose which folders and subfolders appear in Askfiles.",
						render: (setting: Setting) => {
							setting.addButton((btn) => {
								btn.setButtonText("Manage").onClick(() => {
									new FolderRulesModal(
										this.app,
										this.plugin.store,
										this.plugin.folderEngine,
										() => this.update(),
									).open();
								});
							});
						},
					},
				],
			},

			// Behaviour
			{
				type: "group",
				heading: "Behaviour",
				items: [
					{
						name: "Remember last choice",
						desc: "Start where you left off on the previous note.",
						control: {
							type: "toggle",
							key: "rememberLastChoice",
							defaultValue: false,
						},
					},
					{
						name: "Quick-jump search",
						desc: "Show the bottom search line to jump straight to any folder path.",
						control: {
							type: "toggle",
							key: "quickJumpSearch",
							defaultValue: true,
						},
					},
					{
						name: "Hide empty folders",
						desc: "Off by default, because a new empty folder is often where a note should go.",
						control: {
							type: "toggle",
							key: "hideEmptyFolders",
							defaultValue: false,
						},
					},
					{
						name: "Show existing files",
						desc: "Show existing notes inside the current folder or domain so you can open them directly.",
						control: {
							type: "toggle",
							key: "showExistingFiles",
							defaultValue: false,
						},
					},
					{
						name: "Search files global",
						desc: "When typing in the search bar with existing files enabled, search all visible notes across the entire vault instead of only the current level.",
						control: {
							type: "toggle",
							key: "searchFilesGlobally",
							defaultValue: true,
						},
					},
					{
						name: "Search dropdown",
						desc: "Show the quick-jump dropdown popup list when typing in the search field.",
						control: {
							type: "toggle",
							key: "showSearchDropdown",
							defaultValue: false,
						},
					},
					{
						name: "Keyboard shortcuts",
						desc: "Customise keys used inside the note creator.",
						render: (setting: Setting) => {
							setting.addButton((btn) => {
								btn.setButtonText("Manage").onClick(() => {
									new ShortcutsModal(
										this.app,
										this.plugin.store,
									).open();
								});
							});
						},
					},
				],
			},

			// Advanced
			{
				type: "group",
				heading: "Advanced",
				items: [
					{
						name: "Reset everything",
						desc: "Restore all settings, layout overrides, rules, and phrases to their defaults.",
						render: (setting: Setting) => {
							setting.addButton((btn) => {
								btn.setButtonText("Reset")
									.setDestructive()
									.onClick(() => {
										void this.plugin.store
											.resetAllSettings()
											.then(() => {
												new Notice(
													"All settings restored to defaults.",
												);
												this.update();
											});
									});
							});
						},
					},
					{
						name: "Debug logging",
						desc: "Log diagnostic events to the developer console.",
						control: {
							type: "toggle",
							key: "debugLogging",
							defaultValue: false,
						},
					},
				],
			},
		];
	}
}
