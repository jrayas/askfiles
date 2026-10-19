import { App, Modal, Notice } from "obsidian";
import { FolderEngine } from "../../engine/folder-engine";
import { PhraseEngine } from "../../engine/phrase-engine";
import { SettingsStore } from "../../settings/store";
import type {
	PhraseEntry,
	PhraseLevel,
	PhrasePairingMode,
	PhraseSelectionMode,
} from "../../types";

/**
 * Phrase Library Manager Modal (`08-phrase-library.md`).
 * Allows configuring:
 * - Mode (`Random`, `Rotate`, `Fixed`)
 * - Titles and descriptions (`Paired`, `Mixed`)
 * - Filter phrases
 * - Collapsible level sections (`Top level`, `Deeper levels`, `Naming page`)
 * - Add / Edit / Disable phrases (with optional folder override)
 * - Import / Export JSON and Restore starter set
 */
export class PhraseLibraryModal extends Modal {
	private filterText = "";
	private editingPhrase: Partial<PhraseEntry> | null = null;
	private showImportBox = false;
	private importJsonText = "";
	private collapsedLevels = new Set<PhraseLevel>();

	constructor(
		app: App,
		private store: SettingsStore,
		private phraseEngine: PhraseEngine,
		private folderEngine: FolderEngine,
	) {
		super(app);
	}

	onOpen(): void {
		this.modalEl.addClass("askfiles-wide-modal");
		this.render();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private render(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("askfiles-modal", "askfiles-phrases-modal");

		contentEl.createEl("h2", {
			text: "Phrase library",
			cls: "askfiles-modal-heading",
		});

		const { settings } = this.store;
		const currentMode = settings.globalLayout.phraseMode;
		const currentPairing = settings.phrasePairingMode;

		// Top mode controls
		const topControls = contentEl.createDiv({
			cls: "askfiles-folders-top",
		});

		const modeRow = topControls.createDiv({
			cls: "askfiles-folders-control-row",
		});
		modeRow.createSpan({ cls: "askfiles-folders-label", text: "Mode" });
		const modeRadios = modeRow.createDiv({ cls: "askfiles-inline-radios" });
		const modes: Array<{ value: PhraseSelectionMode; label: string }> = [
			{ value: "random", label: "Random" },
			{ value: "rotate", label: "Rotate" },
			{ value: "fixed", label: "Fixed" },
		];
		for (const m of modes) {
			const active = currentMode === m.value;
			const btn = modeRadios.createEl("button", {
				cls: `askfiles-radio-btn ${active ? "is-selected" : ""}`,
				text: `${active ? "●" : "○"} ${m.label}`,
				attr: { type: "button" },
			});
			btn.addEventListener("click", () => {
				void this.store
					.setLayoutEverywhere({ phraseMode: m.value }, false)
					.then(() => this.render());
			});
		}

		const pairRow = topControls.createDiv({
			cls: "askfiles-folders-control-row",
		});
		pairRow.createSpan({
			cls: "askfiles-folders-label",
			text: "Titles and descriptions",
		});
		const pairRadios = pairRow.createDiv({ cls: "askfiles-inline-radios" });
		const pairings: Array<{ value: PhrasePairingMode; label: string }> = [
			{ value: "paired", label: "Paired" },
			{ value: "mixed", label: "Mixed" },
		];
		for (const p of pairings) {
			const active = currentPairing === p.value;
			const btn = pairRadios.createEl("button", {
				cls: `askfiles-radio-btn ${active ? "is-selected" : ""}`,
				text: `${active ? "●" : "○"} ${p.label}`,
				attr: { type: "button" },
			});
			btn.addEventListener("click", () => {
				void this.store
					.update({ phrasePairingMode: p.value })
					.then(() => this.render());
			});
		}

		// Filter bar
		const headerRow = contentEl.createDiv({
			cls: "askfiles-tree-header",
		});
		headerRow.createSpan({
			cls: "askfiles-section-subtitle",
			text: "Level",
		});
		const filterInput = headerRow.createEl("input", {
			type: "text",
			cls: "askfiles-tree-filter",
			placeholder: "Filter phrases...",
			value: this.filterText,
		});
		filterInput.addEventListener("input", () => {
			this.filterText = filterInput.value;
			this.render();
			const refocused =
				this.contentEl.querySelector<HTMLInputElement>(
					".askfiles-tree-filter",
				);
			if (refocused) {
				refocused.focus();
				const len = refocused.value.length;
				refocused.setSelectionRange(len, len);
			}
		});

		// Level sections
		const listContainer = contentEl.createDiv({
			cls: "askfiles-phrases-list",
		});

		const levels: Array<{ key: PhraseLevel; label: string }> = [
			{ key: "top", label: "Top level" },
			{ key: "deeper", label: "Deeper levels" },
			{ key: "naming", label: "Naming page" },
		];

		const filterLower = this.filterText.trim().toLowerCase();

		for (const lvl of levels) {
			const isCollapsed =
				this.collapsedLevels.has(lvl.key) && !filterLower;
			const lvlHeader = listContainer.createEl("button", {
				cls: "askfiles-level-header",
				text: `${isCollapsed ? "▸" : "▾"} ${lvl.label}`,
				attr: { type: "button" },
			});
			lvlHeader.addEventListener("click", () => {
				if (this.collapsedLevels.has(lvl.key)) {
					this.collapsedLevels.delete(lvl.key);
				} else {
					this.collapsedLevels.add(lvl.key);
				}
				this.render();
			});

			if (isCollapsed) continue;

			const matchingPhrases = settings.phrases.filter(
				(p) =>
					p.level === lvl.key &&
					(!filterLower ||
						p.title.toLowerCase().includes(filterLower) ||
						p.description.toLowerCase().includes(filterLower) ||
						(p.folderPath &&
							p.folderPath.toLowerCase().includes(filterLower))),
			);

			for (const phrase of matchingPhrases) {
				const row = listContainer.createDiv({
					cls: `askfiles-phrase-row ${phrase.enabled ? "" : "is-disabled"}`,
				});

				const toggleBtn = row.createEl("button", {
					cls: "askfiles-phrase-toggle",
					text: phrase.enabled ? "●" : "○",
					attr: {
						type: "button",
						"aria-label": phrase.enabled
							? "Disable phrase"
							: "Enable phrase",
					},
				});
				toggleBtn.addEventListener("click", () => {
					void this.phraseEngine
						.updatePhrase(phrase.id, { enabled: !phrase.enabled })
						.then(() => this.render());
				});

				const titleSpan = row.createSpan({
					cls: "askfiles-phrase-title",
					text: phrase.title,
				});
				titleSpan.addEventListener("click", () => {
					this.editingPhrase = { ...phrase };
					this.render();
				});

				row.createSpan({
					cls: "askfiles-phrase-desc",
					text: phrase.description,
				});

				if (phrase.folderPath) {
					row.createSpan({
						cls: "askfiles-phrase-badge",
						text: phrase.folderPath,
					});
				}
				if (!phrase.enabled) {
					row.createSpan({
						cls: "askfiles-phrase-off",
						text: "(off)",
					});
				}

				const editBtn = row.createEl("button", {
					cls: "askfiles-inline-btn",
					text: "Edit",
					attr: { type: "button" },
				});
				editBtn.addEventListener("click", () => {
					this.editingPhrase = { ...phrase };
					this.render();
				});
			}
		}

		// Add or Edit Phrase Form (`08-phrase-library.md` ASCII)
		if (this.editingPhrase) {
			this.renderPhraseEditor(contentEl, this.editingPhrase);
		}

		// Import / Export box if active
		if (this.showImportBox) {
			this.renderImportExportBox(contentEl);
		}

		// Bottom action bar: + Add phrase | Import | Export | Restore starter set
		const footer = contentEl.createDiv({
			cls: "askfiles-modal-footer",
		});
		const actions = footer.createDiv({
			cls: "askfiles-modal-actions",
		});

		const addBtn = actions.createEl("button", {
			cls: "mod-cta askfiles-btn",
			text: "+ add phrase",
			attr: { type: "button" },
		});
		addBtn.addEventListener("click", () => {
			this.editingPhrase = {
				title: "",
				description: "",
				level: "top",
				enabled: true,
				folderPath: "",
			};
			this.render();
		});

		const importBtn = actions.createEl("button", {
			cls: "askfiles-btn",
			text: "Import",
			attr: { type: "button" },
		});
		importBtn.addEventListener("click", () => {
			this.showImportBox = !this.showImportBox;
			this.importJsonText = "";
			this.render();
		});

		const exportBtn = actions.createEl("button", {
			cls: "askfiles-btn",
			text: "Export",
			attr: { type: "button" },
		});
		exportBtn.addEventListener("click", () => {
			this.showImportBox = true;
			this.importJsonText = this.phraseEngine.exportLibraryJson();
			void navigator.clipboard?.writeText(this.importJsonText);
			new Notice("Phrase library JSON copied to clipboard.");
			this.render();
		});

		const restoreBtn = actions.createEl("button", {
			cls: "askfiles-btn",
			text: "Restore starter set",
			attr: { type: "button" },
		});
		restoreBtn.addEventListener("click", () => {
			void this.phraseEngine.restoreStarterSet().then(() => {
				new Notice("Starter phrase set restored.");
				this.render();
			});
		});
	}

	private renderPhraseEditor(
		container: HTMLElement,
		draft: Partial<PhraseEntry>,
	): void {
		const isNew = !draft.id;
		const box = container.createDiv({ cls: "askfiles-subform" });
		box.createEl("h3", {
			text: isNew ? "Add phrase" : "Edit phrase",
			cls: "askfiles-subform-title",
		});

		const titleRow = box.createDiv({ cls: "askfiles-subform-row" });
		titleRow.createSpan({ cls: "askfiles-subform-label", text: "Title" });
		const titleInput = titleRow.createEl("input", {
			type: "text",
			cls: "askfiles-subform-input",
			placeholder: "What are we exploring today?",
			value: draft.title ?? "",
		});
		titleInput.addEventListener("input", () => {
			draft.title = titleInput.value;
		});

		const descRow = box.createDiv({ cls: "askfiles-subform-row" });
		descRow.createSpan({
			cls: "askfiles-subform-label",
			text: "Description",
		});
		const descInput = descRow.createEl("input", {
			type: "text",
			cls: "askfiles-subform-input",
			placeholder: "Choose a place to begin",
			value: draft.description ?? "",
		});
		descInput.addEventListener("input", () => {
			draft.description = descInput.value;
		});

		const levelRow = box.createDiv({ cls: "askfiles-subform-row" });
		levelRow.createSpan({ cls: "askfiles-subform-label", text: "Level" });
		const levelSelect = levelRow.createEl("select", {
			cls: "askfiles-gear-select",
		});
		const levelOpts: Array<{ value: PhraseLevel; label: string }> = [
			{ value: "top", label: "Top level" },
			{ value: "deeper", label: "Deeper levels" },
			{ value: "naming", label: "Naming page" },
		];
		for (const opt of levelOpts) {
			const o = levelSelect.createEl("option", {
				value: opt.value,
				text: opt.label,
			});
			if ((draft.level ?? "top") === opt.value) {
				o.selected = true;
			}
		}
		levelSelect.addEventListener("change", () => {
			draft.level = levelSelect.value as PhraseLevel;
		});

		const folderRow = box.createDiv({ cls: "askfiles-subform-row" });
		folderRow.createSpan({
			cls: "askfiles-subform-label",
			text: "Only for folder (optional)",
		});
		const folderSelect = folderRow.createEl("select", {
			cls: "askfiles-gear-select",
		});
		folderSelect.createEl("option", { value: "", text: "(Any folder)" });
		for (const f of this.folderEngine.getAllVisibleFolders()) {
			const o = folderSelect.createEl("option", {
				value: f.path,
				text: f.displayPath,
			});
			if (draft.folderPath === f.path) {
				o.selected = true;
			}
		}
		folderSelect.addEventListener("change", () => {
			draft.folderPath = folderSelect.value || undefined;
		});

		const btnRow = box.createDiv({ cls: "askfiles-modal-actions" });
		const saveBtn = btnRow.createEl("button", {
			cls: "mod-cta askfiles-btn",
			text: "Save",
			attr: { type: "button" },
		});
		saveBtn.addEventListener("click", () => {
			const title = (draft.title ?? "").trim();
			if (!title) {
				new Notice("Please enter a question title.");
				return;
			}
			const savePromise = draft.id
				? this.phraseEngine.updatePhrase(draft.id, {
						title,
						description: (draft.description ?? "").trim(),
						level: draft.level ?? "top",
						folderPath: draft.folderPath,
					})
				: this.phraseEngine.addPhrase({
						title,
						description: (draft.description ?? "").trim(),
						level: draft.level ?? "top",
						enabled: true,
						folderPath: draft.folderPath,
					});
			void savePromise.then(() => {
				this.editingPhrase = null;
				this.render();
			});
		});

		if (draft.id) {
			const deleteBtn = btnRow.createEl("button", {
				cls: "askfiles-btn",
				text: "Delete",
				attr: { type: "button" },
			});
			deleteBtn.addEventListener("click", () => {
				const id = draft.id!;
				void this.phraseEngine.deletePhrase(id).then(() => {
					this.editingPhrase = null;
					this.render();
				});
			});
		}

		const cancelBtn = btnRow.createEl("button", {
			cls: "askfiles-btn",
			text: "Cancel",
			attr: { type: "button" },
		});
		cancelBtn.addEventListener("click", () => {
			this.editingPhrase = null;
			this.render();
		});
	}

	private renderImportExportBox(container: HTMLElement): void {
		const box = container.createDiv({ cls: "askfiles-subform" });
		box.createEl("h3", {
			text: "Import / export library JSON",
			cls: "askfiles-subform-title",
		});
		const area = box.createEl("textarea", {
			cls: "askfiles-json-textarea",
			placeholder: "Paste exported phrase library JSON here...",
		});
		area.value = this.importJsonText;
		area.addEventListener("input", () => {
			this.importJsonText = area.value;
		});

		const btnRow = box.createDiv({ cls: "askfiles-modal-actions" });
		const applyImportBtn = btnRow.createEl("button", {
			cls: "mod-cta askfiles-btn",
			text: "Import JSON",
			attr: { type: "button" },
		});
		applyImportBtn.addEventListener("click", () => {
			void this.phraseEngine
				.importLibraryJson(this.importJsonText)
				.then(({ count }) => {
					new Notice(`Imported ${count} phrases.`);
					this.showImportBox = false;
					this.render();
				})
				.catch((err: unknown) => {
					new Notice(
						err instanceof Error
							? err.message
							: "Failed to import JSON.",
					);
				});
		});

		const closeBtn = btnRow.createEl("button", {
			cls: "askfiles-btn",
			text: "Close",
			attr: { type: "button" },
		});
		closeBtn.addEventListener("click", () => {
			this.showImportBox = false;
			this.render();
		});
	}
}
