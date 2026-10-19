import { App, Modal } from "obsidian";
import { SettingsStore } from "../../settings/store";
import type { NoteTypeConfig } from "../../types";

/**
 * Templates & Note Types Manager (`11-additional-screens-ascii.md` #11).
 */
export class TemplatesModal extends Modal {
	private addingNew = false;
	private draftName = "";
	private draftTemplatePath = "";

	constructor(
		app: App,
		private store: SettingsStore,
		private onUpdated?: () => void,
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
		contentEl.addClass("askfiles-modal", "askfiles-templates-modal");

		contentEl.createEl("h2", {
			text: "Templates",
			cls: "askfiles-modal-heading",
		});

		const { settings } = this.store;

		const tfRow = contentEl.createDiv({
			cls: "askfiles-folders-control-row",
		});
		tfRow.createSpan({
			cls: "askfiles-folders-label",
			text: "Template folder",
		});
		const tfInput = tfRow.createEl("input", {
			type: "text",
			cls: "askfiles-subform-input",
			value: settings.templateFolder,
			placeholder: "Templates/",
		});
		tfInput.addEventListener("change", () => {
			void this.store
				.update({ templateFolder: tfInput.value.trim() })
				.then(() => {
					this.onUpdated?.();
				});
		});

		const table = contentEl.createDiv({ cls: "askfiles-table" });
		const head = table.createDiv({
			cls: "askfiles-table-row askfiles-table-row--head",
		});
		head.createSpan({ cls: "askfiles-table-cell", text: "Note type" });
		head.createSpan({ cls: "askfiles-table-cell", text: "Template" });
		head.createSpan({
			cls: "askfiles-table-cell askfiles-table-cell--action",
			text: "Default",
		});
		head.createSpan({
			cls: "askfiles-table-cell askfiles-table-cell--action",
			text: "",
		});

		for (const nt of settings.noteTypes) {
			const isDefault = settings.defaultNoteType === nt.name;
			const row = table.createDiv({ cls: "askfiles-table-row" });
			row.createSpan({
				cls: "askfiles-table-cell",
				text: nt.name,
			});

			const tplCell = row.createSpan({ cls: "askfiles-table-cell" });
			const tplInput = tplCell.createEl("input", {
				type: "text",
				cls: "askfiles-subform-input",
				placeholder: "(none)",
				value: nt.templatePath,
			});
			tplInput.addEventListener("change", () => {
				const next = settings.noteTypes.map((item) =>
					item.id === nt.id
						? { ...item, templatePath: tplInput.value.trim() }
						: item,
				);
				void this.store.update({ noteTypes: next });
			});

			const defCell = row.createSpan({
				cls: "askfiles-table-cell askfiles-table-cell--action",
			});
			const defBtn = defCell.createEl("button", {
				cls: "askfiles-radio-btn",
				text: isDefault ? "●" : "○",
				attr: {
					type: "button",
					"aria-label": `Set ${nt.name} as default note type`,
				},
			});
			defBtn.addEventListener("click", () => {
				void this.store
					.update({ defaultNoteType: nt.name })
					.then(() => {
						this.onUpdated?.();
						this.render();
					});
			});

			const delCell = row.createSpan({
				cls: "askfiles-table-cell askfiles-table-cell--action",
			});
			const delBtn = delCell.createEl("button", {
				cls: "clickable-icon",
				text: "✕",
				attr: {
					type: "button",
					"aria-label": `Remove ${nt.name}`,
				},
			});
			delBtn.addEventListener("click", () => {
				const next = settings.noteTypes.filter(
					(item) => item.id !== nt.id,
				);
				void this.store.update({ noteTypes: next }).then(() => {
					this.onUpdated?.();
					this.render();
				});
			});
		}

		if (this.addingNew) {
			const box = contentEl.createDiv({ cls: "askfiles-subform" });
			box.createEl("h3", {
				text: "Add note type",
				cls: "askfiles-subform-title",
			});

			const nameRow = box.createDiv({ cls: "askfiles-subform-row" });
			nameRow.createSpan({
				cls: "askfiles-subform-label",
				text: "Note type",
			});
			const nameInput = nameRow.createEl("input", {
				type: "text",
				cls: "askfiles-subform-input",
				placeholder: "Project brief",
				value: this.draftName,
			});
			nameInput.addEventListener("input", () => {
				this.draftName = nameInput.value;
			});

			const pathRow = box.createDiv({ cls: "askfiles-subform-row" });
			pathRow.createSpan({
				cls: "askfiles-subform-label",
				text: "Template path",
			});
			const pathInput = pathRow.createEl("input", {
				type: "text",
				cls: "askfiles-subform-input",
				placeholder: "Templates/Project brief",
				value: this.draftTemplatePath,
			});
			pathInput.addEventListener("input", () => {
				this.draftTemplatePath = pathInput.value;
			});

			const actRow = box.createDiv({ cls: "askfiles-modal-actions" });
			const saveBtn = actRow.createEl("button", {
				cls: "mod-cta askfiles-btn",
				text: "Save",
				attr: { type: "button" },
			});
			saveBtn.addEventListener("click", () => {
				if (!this.draftName.trim()) return;
				const newType: NoteTypeConfig = {
					id: `type-${Date.now()}`,
					name: this.draftName.trim(),
					templatePath: this.draftTemplatePath.trim(),
				};
				void this.store
					.update({
						noteTypes: [...settings.noteTypes, newType],
					})
					.then(() => {
						this.addingNew = false;
						this.onUpdated?.();
						this.render();
					});
			});

			const cancelBtn = actRow.createEl("button", {
				cls: "askfiles-btn",
				text: "Cancel",
				attr: { type: "button" },
			});
			cancelBtn.addEventListener("click", () => {
				this.addingNew = false;
				this.render();
			});
		}

		const footer = contentEl.createDiv({
			cls: "askfiles-modal-footer",
		});
		const addBtn = footer.createEl("button", {
			cls: "mod-cta askfiles-btn",
			text: "+ add note type",
			attr: { type: "button" },
		});
		addBtn.addEventListener("click", () => {
			this.addingNew = true;
			this.draftName = "";
			this.draftTemplatePath = "";
			this.render();
		});
	}
}
