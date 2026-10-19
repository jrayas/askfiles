import { App, Modal } from "obsidian";
import { DEFAULT_SETTINGS } from "../../constants";
import { SettingsStore } from "../../settings/store";
import type { KeyboardShortcutsConfig } from "../../types";

/**
 * Keyboard shortcuts manager (`11-additional-screens-ascii.md` #13).
 */
export class ShortcutsModal extends Modal {
	constructor(
		app: App,
		private store: SettingsStore,
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
		contentEl.addClass("askfiles-modal", "askfiles-shortcuts-modal");

		contentEl.createEl("h2", {
			text: "Keyboard shortcuts",
			cls: "askfiles-modal-heading",
		});

		const { shortcuts } = this.store.settings;

		const list = contentEl.createDiv({ cls: "askfiles-table" });

		this.renderStaticRow(list, "Move between cards", "← ↑ → ↓");
		this.renderStaticRow(list, "Choose highlighted card", "Enter");
		this.renderStaticRow(
			list,
			"Go back one level",
			"Escape or Backspace on empty filter",
		);

		this.renderEditableShortcutRow(
			list,
			"Focus the search line",
			"focusSearch",
			shortcuts.focusSearch,
		);
		this.renderEditableShortcutRow(
			list,
			"Toggle the lock",
			"toggleLock",
			shortcuts.toggleLock.toUpperCase(),
		);
		this.renderEditableShortcutRow(
			list,
			"Open settings panel",
			"openGearPanel",
			shortcuts.openGearPanel,
		);
		this.renderEditableShortcutRow(
			list,
			"Save here",
			"saveHere",
			shortcuts.saveHere.toUpperCase(),
		);

		contentEl.createEl("p", {
			cls: "askfiles-folders-muted",
			text: "All shortcuts can be changed.",
		});

		const footer = contentEl.createDiv({ cls: "askfiles-modal-footer" });
		const resetBtn = footer.createEl("button", {
			cls: "askfiles-btn",
			text: "Restore defaults",
			attr: { type: "button" },
		});
		resetBtn.addEventListener("click", () => {
			void this.store
				.update({
					shortcuts: { ...DEFAULT_SETTINGS.shortcuts },
				})
				.then(() => this.render());
		});

		const closeBtn = footer.createEl("button", {
			cls: "mod-cta askfiles-btn",
			text: "Done",
			attr: { type: "button" },
		});
		closeBtn.addEventListener("click", () => this.close());
	}

	private renderStaticRow(
		container: HTMLElement,
		label: string,
		keys: string,
	): void {
		const row = container.createDiv({ cls: "askfiles-table-row" });
		row.createSpan({ cls: "askfiles-table-cell", text: label });
		row.createSpan({
			cls: "askfiles-table-cell askfiles-folders-muted",
			text: keys,
		});
	}

	private renderEditableShortcutRow(
		container: HTMLElement,
		label: string,
		key: keyof KeyboardShortcutsConfig,
		value: string,
	): void {
		const row = container.createDiv({ cls: "askfiles-table-row" });
		row.createSpan({ cls: "askfiles-table-cell", text: label });
		const cell = row.createSpan({ cls: "askfiles-table-cell" });
		const input = cell.createEl("input", {
			type: "text",
			cls: "askfiles-shortcut-input",
			value,
			attr: {
				maxlength: "1",
				"aria-label": label,
			},
		});
		input.addEventListener("change", () => {
			const val = input.value.trim();
			if (!val) return;
			void this.store.update({
				shortcuts: {
					...this.store.settings.shortcuts,
					[key]: val.toLowerCase(),
				},
			});
		});
	}
}
