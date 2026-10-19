import { App, Modal } from "obsidian";
import { FolderEngine } from "../../engine/folder-engine";
import { normalizeFolderPath, SettingsStore } from "../../settings/store";
import type { FolderWordingOverride } from "../../types";

/**
 * Per-folder question wording manager (`11-additional-screens-ascii.md` #10).
 */
export class FolderWordingModal extends Modal {
	private addingNew = false;
	private draftFolder = "";
	private draftTitle = "";
	private draftDescription = "";

	constructor(
		app: App,
		private store: SettingsStore,
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
		contentEl.addClass("askfiles-modal", "askfiles-wording-modal");

		contentEl.createEl("h2", {
			text: "Per-folder question wording",
			cls: "askfiles-modal-heading",
		});

		const table = contentEl.createDiv({ cls: "askfiles-table" });
		const header = table.createDiv({
			cls: "askfiles-table-row askfiles-table-row--head",
		});
		header.createSpan({ cls: "askfiles-table-cell", text: "Folder" });
		header.createSpan({ cls: "askfiles-table-cell", text: "Title" });
		header.createSpan({ cls: "askfiles-table-cell", text: "Description" });
		header.createSpan({
			cls: "askfiles-table-cell askfiles-table-cell--action",
			text: "",
		});

		// Default Home row
		const homeOverride = this.store.settings.perFolderWording["/"];
		const homeRow = table.createDiv({ cls: "askfiles-table-row" });
		homeRow.createSpan({
			cls: "askfiles-table-cell",
			text: "Home (top level)",
		});
		homeRow.createSpan({
			cls: "askfiles-table-cell askfiles-folders-muted",
			text: homeOverride?.title || "Uses phrase library",
		});
		homeRow.createSpan({
			cls: "askfiles-table-cell askfiles-folders-muted",
			text: homeOverride?.description || "Uses phrase library",
		});
		const homeAct = homeRow.createSpan({
			cls: "askfiles-table-cell askfiles-table-cell--action",
		});
		if (homeOverride) {
			const clearHome = homeAct.createEl("button", {
				cls: "clickable-icon",
				text: "✕",
				attr: { type: "button" },
			});
			clearHome.addEventListener("click", () => {
				const next = { ...this.store.settings.perFolderWording };
				delete next["/"];
				void this.store
					.update({ perFolderWording: next })
					.then(() => this.render());
			});
		}

		// Configured folder rows
		const entries = Object.values(
			this.store.settings.perFolderWording,
		).filter((e) => e.folderPath && e.folderPath !== "/");

		for (const entry of entries) {
			const row = table.createDiv({ cls: "askfiles-table-row" });
			row.createSpan({
				cls: "askfiles-table-cell",
				text: entry.folderPath.split("/").join(" › "),
			});
			row.createSpan({
				cls: "askfiles-table-cell",
				text: entry.title || "(uses default)",
			});
			row.createSpan({
				cls: "askfiles-table-cell",
				text: entry.description || "",
			});
			const act = row.createSpan({
				cls: "askfiles-table-cell askfiles-table-cell--action",
			});
			const delBtn = act.createEl("button", {
				cls: "clickable-icon",
				text: "✕",
				attr: {
					type: "button",
					"aria-label": `Remove override for ${entry.folderPath}`,
				},
			});
			delBtn.addEventListener("click", () => {
				const next = { ...this.store.settings.perFolderWording };
				delete next[entry.folderPath];
				void this.store
					.update({ perFolderWording: next })
					.then(() => this.render());
			});
		}

		if (this.addingNew) {
			this.renderAddForm(contentEl);
		}

		const footer = contentEl.createDiv({
			cls: "askfiles-modal-footer",
		});
		const addBtn = footer.createEl("button", {
			cls: "mod-cta askfiles-btn",
			text: "+ add folder wording",
			attr: { type: "button" },
		});
		addBtn.addEventListener("click", () => {
			this.addingNew = true;
			this.draftFolder = "";
			this.draftTitle = "";
			this.draftDescription = "";
			this.render();
		});

		const resetBtn = footer.createEl("button", {
			cls: "askfiles-btn",
			text: "Reset all",
			attr: { type: "button" },
		});
		resetBtn.addEventListener("click", () => {
			void this.store
				.update({ perFolderWording: {} })
				.then(() => this.render());
		});
	}

	private renderAddForm(container: HTMLElement): void {
		const box = container.createDiv({ cls: "askfiles-subform" });
		box.createEl("h3", {
			text: "Add folder wording",
			cls: "askfiles-subform-title",
		});

		const folderRow = box.createDiv({ cls: "askfiles-subform-row" });
		folderRow.createSpan({
			cls: "askfiles-subform-label",
			text: "Folder",
		});
		const folderSelect = folderRow.createEl("select", {
			cls: "askfiles-gear-select",
		});
		folderSelect.createEl("option", {
			value: "/",
			text: "Home (top level)",
		});
		for (const f of this.folderEngine.getAllVisibleFolders()) {
			folderSelect.createEl("option", {
				value: f.path,
				text: f.displayPath,
			});
		}
		this.draftFolder = folderSelect.value;
		folderSelect.addEventListener("change", () => {
			this.draftFolder = folderSelect.value;
		});

		const titleRow = box.createDiv({ cls: "askfiles-subform-row" });
		titleRow.createSpan({ cls: "askfiles-subform-label", text: "Title" });
		const titleInput = titleRow.createEl("input", {
			type: "text",
			cls: "askfiles-subform-input",
			placeholder: "What knowledge are we discussing?",
			value: this.draftTitle,
		});
		titleInput.addEventListener("input", () => {
			this.draftTitle = titleInput.value;
		});

		const descRow = box.createDiv({ cls: "askfiles-subform-row" });
		descRow.createSpan({
			cls: "askfiles-subform-label",
			text: "Description",
		});
		const descInput = descRow.createEl("input", {
			type: "text",
			cls: "askfiles-subform-input",
			placeholder: "Choose a topic, or save here",
			value: this.draftDescription,
		});
		descInput.addEventListener("input", () => {
			this.draftDescription = descInput.value;
		});

		const actions = box.createDiv({ cls: "askfiles-modal-actions" });
		const saveBtn = actions.createEl("button", {
			cls: "mod-cta askfiles-btn",
			text: "Save",
			attr: { type: "button" },
		});
		saveBtn.addEventListener("click", () => {
			if (!this.draftTitle.trim()) return;
			const key =
				this.draftFolder === "/"
					? "/"
					: normalizeFolderPath(this.draftFolder);
			const entry: FolderWordingOverride = {
				folderPath: key,
				title: this.draftTitle.trim(),
				description: this.draftDescription.trim(),
			};
			void this.store
				.update({
					perFolderWording: {
						...this.store.settings.perFolderWording,
						[key]: entry,
					},
				})
				.then(() => {
					this.addingNew = false;
					this.render();
				});
		});

		const cancelBtn = actions.createEl("button", {
			cls: "askfiles-btn",
			text: "Cancel",
			attr: { type: "button" },
		});
		cancelBtn.addEventListener("click", () => {
			this.addingNew = false;
			this.render();
		});
	}
}
