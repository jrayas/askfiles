import { App, Modal } from "obsidian";

export type ApplyScopeChoice = "folder" | "everywhere";

export class ApplyToModal extends Modal {
	private choice: ApplyScopeChoice;

	constructor(
		app: App,
		private folderDisplayName: string,
		initialChoice: ApplyScopeChoice,
		private onConfirm: (choice: ApplyScopeChoice) => void,
	) {
		super(app);
		this.choice = initialChoice;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("askfiles-modal", "askfiles-apply-modal");

		contentEl.createEl("h3", {
			text: "Apply to",
			cls: "askfiles-modal-title",
		});

		const optionsEl = contentEl.createDiv({
			cls: "askfiles-apply-options",
		});

		const renderRadioRow = (
			value: ApplyScopeChoice,
			label: string,
			hint?: string,
		): HTMLElement => {
			const row = optionsEl.createDiv({
				cls: "askfiles-radio-row",
				attr: {
					role: "radio",
					"aria-checked": String(this.choice === value),
					tabindex: "0",
				},
			});
			if (this.choice === value) {
				row.addClass("is-selected");
			}
			const dot = row.createSpan({
				cls: "askfiles-radio-dot",
				text: this.choice === value ? "●" : "○",
			});
			row.createSpan({ cls: "askfiles-radio-label", text: label });
			if (hint) {
				row.createSpan({
					cls: "askfiles-radio-hint",
					text: `(${hint})`,
				});
			}

			const select = (): void => {
				this.choice = value;
				for (const child of Array.from(optionsEl.children)) {
					child.removeClass("is-selected");
					child.setAttribute("aria-checked", "false");
					const d = child.querySelector(".askfiles-radio-dot");
					if (d) d.textContent = "○";
				}
				row.addClass("is-selected");
				row.setAttribute("aria-checked", "true");
				dot.textContent = "●";
			};

			row.addEventListener("click", select);
			row.addEventListener("keydown", (evt) => {
				if (evt.key === "Enter" || evt.key === " ") {
					evt.preventDefault();
					select();
				}
			});
			return row;
		};

		renderRadioRow(
			"folder",
			"This folder only",
			this.folderDisplayName || "Home",
		);
		renderRadioRow("everywhere", "Everywhere");

		contentEl.createEl("p", {
			text: "Everywhere will replace any folder-specific layouts.",
			cls: "askfiles-apply-note",
		});

		const actionsEl = contentEl.createDiv({
			cls: "askfiles-modal-actions",
		});

		const applyBtn = actionsEl.createEl("button", {
			text: "Apply",
			cls: "mod-cta askfiles-btn",
		});
		applyBtn.addEventListener("click", () => {
			this.onConfirm(this.choice);
			this.close();
		});

		const cancelBtn = actionsEl.createEl("button", {
			text: "Cancel",
			cls: "askfiles-btn",
		});
		cancelBtn.addEventListener("click", () => {
			this.close();
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
