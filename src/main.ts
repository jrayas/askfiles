import { Plugin, TFolder } from "obsidian";
import { VIEW_TYPE_ASKFILES } from "./constants";
import { FolderEngine } from "./engine/folder-engine";
import { NoteCreator } from "./engine/note-creator";
import { PhraseEngine } from "./engine/phrase-engine";
import { AskfilesSettingTab } from "./settings/setting-tab";
import { SettingsStore } from "./settings/store";
import type { AskfilesSettings } from "./types";
import { AskfilesView } from "./views/askfiles-view";

export default class AskfilesPlugin extends Plugin {
	store!: SettingsStore;
	folderEngine!: FolderEngine;
	phraseEngine!: PhraseEngine;
	noteCreator!: NoteCreator;
	settingTab!: AskfilesSettingTab;

	async onload(): Promise<void> {
		const rawData =
			(await this.loadData()) as Partial<AskfilesSettings> | null;
		this.store = new SettingsStore(rawData, async (data) => {
			await this.saveData(data);
		});

		this.folderEngine = new FolderEngine(this.app, this.store);
		this.phraseEngine = new PhraseEngine(this.store);
		this.noteCreator = new NoteCreator(this.app, this.store);

		this.registerView(
			VIEW_TYPE_ASKFILES,
			(leaf) => new AskfilesView(leaf, this),
		);

		this.settingTab = new AskfilesSettingTab(this.app, this);
		this.addSettingTab(this.settingTab);

		this.addRibbonIcon("folder-plus", "Open note creator", () => {
			void this.activateView();
		});

		this.addCommand({
			id: "open-note-creator",
			name: "Open note creator",
			callback: () => {
				void this.activateView();
			},
		});

		this.addCommand({
			id: "toggle-folder-lock",
			name: "Toggle folder creation lock",
			callback: () => {
				void this.store.update({
					lockFolderCreation: !this.store.settings.lockFolderCreation,
				});
			},
		});

		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(
				this.app.vault.on("create", (file) => {
					if (
						file instanceof TFolder &&
						this.store.settings.autoRescan
					) {
						this.refreshOpenViews();
					}
				}),
			);

			this.registerEvent(
				this.app.vault.on("delete", (file) => {
					if (file instanceof TFolder) {
						this.refreshOpenViews();
					}
				}),
			);

			this.registerEvent(
				this.app.vault.on("rename", (file, oldPath) => {
					if (file instanceof TFolder) {
						void this.folderEngine
							.handleFolderRename(file, oldPath)
							.then(() => {
								this.refreshOpenViews();
							});
					}
				}),
			);
		});
	}

	onUserEnable(): void {
		void this.activateView();
	}

	async onExternalSettingsChange(): Promise<void> {
		const rawData =
			(await this.loadData()) as Partial<AskfilesSettings> | null;
		await this.store.reloadFromDisk(rawData);
	}

	async activateView(): Promise<void> {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(VIEW_TYPE_ASKFILES)[0];
		if (!leaf) {
			leaf = workspace.getLeaf("tab");
			await leaf.setViewState({
				type: VIEW_TYPE_ASKFILES,
				active: true,
			});
		}
		await workspace.revealLeaf(leaf);
	}

	openPluginSettings(): void {
		const appWithSetting = this.app as unknown as {
			setting?: {
				open: () => void;
				openTabById: (id: string) => void;
			};
		};
		if (appWithSetting.setting) {
			appWithSetting.setting.open();
			appWithSetting.setting.openTabById(this.manifest.id);
		}
	}

	private refreshOpenViews(): void {
		for (const leaf of this.app.workspace.getLeavesOfType(
			VIEW_TYPE_ASKFILES,
		)) {
			if (leaf.view instanceof AskfilesView) {
				leaf.view.handleExternalVaultChange();
			}
		}
	}
}
