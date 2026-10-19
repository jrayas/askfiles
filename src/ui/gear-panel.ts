import { App } from "obsidian";
import { SettingsStore } from "../settings/store";
import type {
	CardSizeOption,
	ColumnCountOption,
	LayoutConfig,
	PhraseSelectionMode,
	ViewLayoutMode,
} from "../types";
import { ApplyScopeChoice, ApplyToModal } from "./apply-to-modal";
import { renderLineIcon } from "./icons";

export interface GearPanelCallbacks {
	getCurrentFolderPath: () => string;
	getCurrentFolderName: () => string;
	onOpenMoreSettings: () => void;
	onClose: () => void;
}

/**
 * In-tab Gear Panel (`05-in-tab-settings-ascii.md`).
 * Slides in from the right on desktop (keeping the cards visible on the left so changes preview live)
 * and opens as a bottom sheet on narrow/mobile screens.
 */
export class GearPanel {
	private applyScope: ApplyScopeChoice = "everywhere";

	constructor(
		private app: App,
		private store: SettingsStore,
		private callbacks: GearPanelCallbacks,
	) {}

	render(container: HTMLElement): void {
		container.empty();
		const folderPath = this.callbacks.getCurrentFolderPath();
		if (this.store.hasFolderLayoutOverride(folderPath)) {
			this.applyScope = "folder";
		}

		const layout = this.store.getEffectiveLayout(folderPath);
		const isLocked = this.store.settings.lockFolderCreation;

		const header = container.createDiv({ cls: "askfiles-gear-header" });
		header.createEl("h3", {
			text: "Settings",
			cls: "askfiles-gear-title",
		});

		const closeBtn = header.createEl("button", {
			cls: "clickable-icon askfiles-gear-close",
			attr: {
				type: "button",
				"aria-label": "Close settings panel",
			},
		});
		renderLineIcon(closeBtn, "close", 16);
		closeBtn.addEventListener("click", () => this.callbacks.onClose());

		// Group 1: Folders
		const foldersGroup = container.createDiv({
			cls: "askfiles-gear-group",
		});
		foldersGroup.createDiv({
			cls: "askfiles-gear-group-label",
			text: "Folders",
		});

		const lockRow = foldersGroup.createDiv({
			cls: "askfiles-gear-row askfiles-gear-row--interactive",
			attr: {
				role: "switch",
				"aria-checked": String(isLocked),
				tabindex: "0",
			},
		});
		lockRow.createSpan({
			cls: "askfiles-gear-row-name",
			text: "Lock folder creation",
		});
		lockRow.createSpan({
			cls: "askfiles-gear-row-value",
			text: isLocked ? "● On" : "○ Off",
		});
		const toggleLock = (): void => {
			void this.store.update({
				lockFolderCreation: !this.store.settings.lockFolderCreation,
			});
		};
		lockRow.addEventListener("click", toggleLock);
		lockRow.addEventListener("keydown", (evt) => {
			if (evt.key === "Enter" || evt.key === " ") {
				evt.preventDefault();
				toggleLock();
			}
		});

		// Group 2: Layout
		const layoutGroup = container.createDiv({
			cls: "askfiles-gear-group",
		});
		layoutGroup.createDiv({
			cls: "askfiles-gear-group-label",
			text: "Layout",
		});

		this.renderSelectRow<ViewLayoutMode>(
			layoutGroup,
			"View",
			layout.view,
			[
				{ value: "grid", label: "Grid" },
				{ value: "list", label: "List" },
			],
			(val) => {
				void this.applyLayoutPatch({ view: val });
			},
		);

		this.renderSelectRow<ColumnCountOption>(
			layoutGroup,
			"Columns",
			layout.columns,
			[
				{ value: "auto", label: "Auto" },
				{ value: 1, label: "1" },
				{ value: 2, label: "2" },
				{ value: 3, label: "3" },
				{ value: 4, label: "4" },
			],
			(val) => {
				void this.applyLayoutPatch({ columns: val });
			},
		);

		this.renderSelectRow<CardSizeOption>(
			layoutGroup,
			"Card size",
			layout.cardSize,
			[
				{ value: "compact", label: "Compact" },
				{ value: "comfortable", label: "Comfortable" },
				{ value: "large", label: "Large" },
			],
			(val) => {
				void this.applyLayoutPatch({ cardSize: val });
			},
		);

		// Group 3: Titles
		const titlesGroup = container.createDiv({
			cls: "askfiles-gear-group",
		});
		titlesGroup.createDiv({
			cls: "askfiles-gear-group-label",
			text: "Titles",
		});

		this.renderSelectRow<PhraseSelectionMode>(
			titlesGroup,
			"Phrase mode",
			layout.phraseMode,
			[
				{ value: "random", label: "Random" },
				{ value: "rotate", label: "Rotate" },
				{ value: "fixed", label: "Fixed" },
			],
			(val) => {
				void this.applyLayoutPatch({ phraseMode: val });
			},
		);

		// Apply to row
		const scopeGroup = container.createDiv({
			cls: "askfiles-gear-group askfiles-gear-group--footer",
		});

		const applyRow = scopeGroup.createDiv({
			cls: "askfiles-gear-row askfiles-gear-row--interactive",
			attr: {
				role: "button",
				tabindex: "0",
			},
		});
		applyRow.createSpan({
			cls: "askfiles-gear-row-name",
			text: "Apply to",
		});
		applyRow.createSpan({
			cls: "askfiles-gear-row-value",
			text:
				this.applyScope === "folder"
					? "This folder ▾"
					: "Everywhere ▾",
		});

		const openApplyModal = (): void => {
			const modal = new ApplyToModal(
				this.app,
				this.callbacks.getCurrentFolderName(),
				this.applyScope,
				(chosenScope) => {
					this.applyScope = chosenScope;
					const currentFolder = this.callbacks.getCurrentFolderPath();
					const currentEffective =
						this.store.getEffectiveLayout(currentFolder);
					if (chosenScope === "everywhere") {
						void this.store.setLayoutEverywhere(
							currentEffective,
							true,
						);
					} else {
						void this.store.setLayoutForFolder(
							currentFolder,
							currentEffective,
						);
					}
				},
			);
			modal.open();
		};
		applyRow.addEventListener("click", openApplyModal);
		applyRow.addEventListener("keydown", (evt) => {
			if (evt.key === "Enter" || evt.key === " ") {
				evt.preventDefault();
				openApplyModal();
			}
		});

		// Links: More settings -> and Reset view
		const linksContainer = container.createDiv({
			cls: "askfiles-gear-links",
		});

		const moreSettingsBtn = linksContainer.createEl("button", {
			cls: "askfiles-gear-link",
			text: "More settings →",
			attr: { type: "button" },
		});
		moreSettingsBtn.addEventListener("click", () => {
			this.callbacks.onOpenMoreSettings();
		});

		const resetViewBtn = linksContainer.createEl("button", {
			cls: "askfiles-gear-link askfiles-gear-link--muted",
			text: "Reset view",
			attr: { type: "button" },
		});
		resetViewBtn.addEventListener("click", () => {
			void this.store.resetViewLayout(
				this.callbacks.getCurrentFolderPath(),
			);
		});
	}

	private renderSelectRow<T extends string | number>(
		parent: HTMLElement,
		label: string,
		currentValue: T,
		options: Array<{ value: T; label: string }>,
		onChange: (value: T) => void,
	): void {
		const row = parent.createDiv({ cls: "askfiles-gear-row" });
		row.createSpan({ cls: "askfiles-gear-row-name", text: label });

		const select = row.createEl("select", {
			cls: "askfiles-gear-select",
			attr: { "aria-label": label },
		});

		for (const opt of options) {
			const optEl = select.createEl("option", {
				text: opt.label,
				value: String(opt.value),
			});
			if (opt.value === currentValue) {
				optEl.selected = true;
			}
		}

		select.addEventListener("change", () => {
			const matched = options.find(
				(o) => String(o.value) === select.value,
			);
			if (matched) {
				onChange(matched.value);
			}
		});
	}

	private async applyLayoutPatch(
		patch: Partial<LayoutConfig>,
	): Promise<void> {
		const folderPath = this.callbacks.getCurrentFolderPath();
		if (this.applyScope === "folder") {
			await this.store.setLayoutForFolder(folderPath, patch);
		} else {
			await this.store.setLayoutEverywhere(patch, false);
		}
	}
}
