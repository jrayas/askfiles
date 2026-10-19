import { App, Modal } from "obsidian";
import { FolderEngine } from "../../engine/folder-engine";
import { normalizeFolderPath, SettingsStore } from "../../settings/store";
import type {
	FolderRule,
	RuleAction,
	RuleScope,
	ScanMode,
	TreeFolderNode,
} from "../../types";

/**
 * Interactive Folder Scan, Include & Exclude Manager (`07-folder-include-exclude.md`).
 * Provides:
 * - Scan mode radio toggle (`Include all` vs `Include only chosen`)
 * - Auto-rescan toggle + `[ Rescan now ]`
 * - Vault tree picker with checkboxes, expand/collapse chevrons, status labels (`hidden`, `included (exception)`), and 3-scope popover
 * - Synchronised Rules Summary list with `✕` delete and `+ Add rule`
 * - Live count `This will hide N folders` with `[ Save ]` and `[ Reset ]`
 */
export class FolderRulesModal extends Modal {
	private draftScanMode: ScanMode;
	private draftAutoRescan: boolean;
	private draftRules: FolderRule[];
	private filterText = "";
	private collapsedPaths = new Set<string>();
	private activeScopeMenuPath: string | null = null;

	constructor(
		app: App,
		private store: SettingsStore,
		private folderEngine: FolderEngine,
		private onSaved?: () => void,
	) {
		super(app);
		this.draftScanMode = store.settings.scanMode;
		this.draftAutoRescan = store.settings.autoRescan;
		this.draftRules = store.settings.folderRules.map((r) => ({ ...r }));
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
		contentEl.addClass("askfiles-modal", "askfiles-folders-modal");

		contentEl.createEl("h2", {
			text: "Folders",
			cls: "askfiles-modal-heading",
		});

		// Top controls row: Scan mode & Auto-rescan
		const topControls = contentEl.createDiv({
			cls: "askfiles-folders-top",
		});

		const scanRow = topControls.createDiv({
			cls: "askfiles-folders-control-row",
		});
		scanRow.createSpan({
			cls: "askfiles-folders-label",
			text: "Scan mode",
		});
		const scanRadios = scanRow.createDiv({
			cls: "askfiles-inline-radios",
		});
		this.renderRadioOption(
			scanRadios,
			"Include all",
			this.draftScanMode === "include-all",
			() => {
				this.draftScanMode = "include-all";
				this.render();
			},
		);
		this.renderRadioOption(
			scanRadios,
			"Include only chosen",
			this.draftScanMode === "include-chosen",
			() => {
				this.draftScanMode = "include-chosen";
				this.render();
			},
		);

		const rescanRow = topControls.createDiv({
			cls: "askfiles-folders-control-row",
		});
		rescanRow.createSpan({
			cls: "askfiles-folders-label",
			text: "Auto-rescan",
		});
		const rescanControls = rescanRow.createDiv({
			cls: "askfiles-inline-radios",
		});
		const autoToggle = rescanControls.createEl("button", {
			cls: "askfiles-radio-btn",
			text: this.draftAutoRescan ? "● On" : "○ Off",
			attr: { type: "button" },
		});
		autoToggle.addEventListener("click", () => {
			this.draftAutoRescan = !this.draftAutoRescan;
			this.render();
		});

		const rescanBtn = rescanControls.createEl("button", {
			cls: "askfiles-btn",
			text: "Rescan now",
			attr: { type: "button" },
		});
		rescanBtn.addEventListener("click", () => {
			this.render();
		});

		const dotRow = topControls.createDiv({
			cls: "askfiles-folders-control-row askfiles-folders-control-row--muted",
		});
		dotRow.createSpan({
			cls: "askfiles-folders-label",
			text: "Hidden by default",
		});
		dotRow.createSpan({
			cls: "askfiles-folders-muted",
			text: `${this.app.vault.configDir}, other dot-folders`,
		});

		// Vault tree header + filter
		const treeHeader = contentEl.createDiv({
			cls: "askfiles-tree-header",
		});
		treeHeader.createSpan({
			cls: "askfiles-section-subtitle",
			text: "Vault tree",
		});
		const filterInput = treeHeader.createEl("input", {
			type: "text",
			cls: "askfiles-tree-filter",
			placeholder: "Filter folders...",
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

		// Build tree with draft rules
		const { nodes, hiddenCount } = this.folderEngine.buildVaultTreeNodes(
			this.draftRules,
			this.draftScanMode,
		);

		const treeContainer = contentEl.createDiv({
			cls: "askfiles-tree-container",
		});

		if (nodes.length === 0) {
			treeContainer.createDiv({
				cls: "askfiles-empty-note",
				text: "No folders found in vault.",
			});
		} else {
			for (const node of nodes) {
				this.renderTreeNode(treeContainer, node);
			}
		}

		if (this.draftScanMode === "include-chosen") {
			contentEl.createDiv({
				cls: "askfiles-folders-hint",
				text: "Nothing is shown except ticked folders.",
			});
		}

		// Rules summary section
		const rulesSection = contentEl.createDiv({
			cls: "askfiles-rules-summary",
		});
		const rulesHeader = rulesSection.createDiv({
			cls: "askfiles-tree-header",
		});
		rulesHeader.createSpan({
			cls: "askfiles-section-subtitle",
			text: "Rules",
		});
		rulesHeader.createSpan({
			cls: "askfiles-folders-muted",
			text: "The deeper rule wins.",
		});

		const rulesList = rulesSection.createDiv({
			cls: "askfiles-rules-list",
		});
		if (this.draftRules.length === 0) {
			rulesList.createDiv({
				cls: "askfiles-empty-note",
				text: "No folder rules configured yet. Tick or untick folders above to create rules.",
			});
		} else {
			for (const rule of this.draftRules) {
				const rRow = rulesList.createDiv({
					cls: "askfiles-rule-row",
				});
				rRow.createSpan({
					cls: "askfiles-rule-path",
					text: rule.path.split("/").join(" › "),
				});
				rRow.createSpan({
					cls: "askfiles-rule-action",
					text: rule.action === "exclude" ? "Exclude" : "Include",
				});
				rRow.createSpan({
					cls: "askfiles-rule-scope",
					text: this.formatScopeLabel(rule.scope),
				});
				const delBtn = rRow.createEl("button", {
					cls: "clickable-icon askfiles-rule-remove",
					text: "✕",
					attr: {
						type: "button",
						"aria-label": `Remove rule for ${rule.path}`,
					},
				});
				delBtn.addEventListener("click", () => {
					this.draftRules = this.draftRules.filter(
						(r) => r.id !== rule.id,
					);
					this.render();
				});
			}
		}

		// Footer: live count + Save / Reset
		const footer = contentEl.createDiv({
			cls: "askfiles-modal-footer",
		});
		footer.createSpan({
			cls: "askfiles-hide-count",
			text: `This will hide ${hiddenCount} ${hiddenCount === 1 ? "folder" : "folders"}`,
		});

		const footerBtns = footer.createDiv({
			cls: "askfiles-modal-actions",
		});
		const saveBtn = footerBtns.createEl("button", {
			cls: "mod-cta askfiles-btn",
			text: "Save",
			attr: { type: "button" },
		});
		saveBtn.addEventListener("click", () => {
			void this.store
				.update({
					scanMode: this.draftScanMode,
					autoRescan: this.draftAutoRescan,
					folderRules: this.draftRules,
				})
				.then(() => {
					this.onSaved?.();
					this.close();
				});
		});

		const resetBtn = footerBtns.createEl("button", {
			cls: "askfiles-btn",
			text: "Reset",
			attr: { type: "button" },
		});
		resetBtn.addEventListener("click", () => {
			this.draftScanMode = "include-all";
			this.draftRules = [];
			this.render();
		});
	}

	private renderTreeNode(
		container: HTMLElement,
		node: TreeFolderNode,
	): void {
		const filter = this.filterText.trim().toLowerCase();
		if (filter && !this.nodeMatchesFilter(node, filter)) {
			return;
		}

		const isCollapsed = this.collapsedPaths.has(node.path) && !filter;
		const row = container.createDiv({
			cls: "askfiles-tree-row",
		});
		row.setCssProps({
			"--askfiles-tree-indent": `${node.depth * 20}px`,
		});

		const left = row.createDiv({ cls: "askfiles-tree-left" });

		// Expand / collapse chevron
		if (node.children.length > 0) {
			const chevron = left.createEl("button", {
				cls: "askfiles-tree-chevron",
				text: isCollapsed ? "▸" : "▾",
				attr: {
					type: "button",
					"aria-label": isCollapsed
						? `Expand ${node.name}`
						: `Collapse ${node.name}`,
				},
			});
			chevron.addEventListener("click", () => {
				if (this.collapsedPaths.has(node.path)) {
					this.collapsedPaths.delete(node.path);
				} else {
					this.collapsedPaths.add(node.path);
				}
				this.render();
			});
		} else {
			left.createSpan({ cls: "askfiles-tree-chevron-spacer" });
		}

		// Checkbox
		const checkbox = left.createEl("input", {
			type: "checkbox",
			cls: "askfiles-tree-checkbox",
		});
		checkbox.checked = node.visible;
		checkbox.addEventListener("change", () => {
			this.toggleFolderNode(node, checkbox.checked);
			this.render();
		});

		const nameBtn = left.createEl("button", {
			cls: "askfiles-tree-name",
			text: node.name,
			attr: {
				type: "button",
				title: "Click to configure rule scope",
			},
		});
		nameBtn.addEventListener("click", () => {
			this.activeScopeMenuPath =
				this.activeScopeMenuPath === node.path ? null : node.path;
			this.render();
		});

		const right = row.createDiv({ cls: "askfiles-tree-right" });
		if (node.statusLabel) {
			right.createSpan({
				cls: `askfiles-tree-status ${node.statusLabel === "hidden" ? "is-hidden" : "is-exception"}`,
				text: node.statusLabel,
			});
		}

		const scopeBtn = right.createEl("button", {
			cls: "askfiles-tree-scope-btn",
			text: "Scope ▾",
			attr: { type: "button" },
		});
		scopeBtn.addEventListener("click", () => {
			this.activeScopeMenuPath =
				this.activeScopeMenuPath === node.path ? null : node.path;
			this.render();
		});

		if (this.activeScopeMenuPath === node.path) {
			this.renderInlineScopeEditor(container, node);
		}

		if (!isCollapsed) {
			for (const child of node.children) {
				this.renderTreeNode(container, child);
			}
		}
	}

	private renderInlineScopeEditor(
		container: HTMLElement,
		node: TreeFolderNode,
	): void {
		const existing = this.draftRules.find(
			(r) => normalizeFolderPath(r.path) === node.path,
		);
		let selectedScope: RuleScope =
			existing?.scope ?? "folder-and-children";
		let selectedAction: RuleAction =
			existing?.action ?? (node.visible ? "exclude" : "include");

		const panel = container.createDiv({
			cls: "askfiles-scope-popover",
		});
		panel.createDiv({
			cls: "askfiles-scope-title",
			text: node.name,
		});

		const scopes: Array<{ value: RuleScope; label: string }> = [
			{
				value: "folder-and-children",
				label: "This folder and everything inside",
			},
			{
				value: "children-only",
				label: "Only the subfolders (keep this folder visible)",
			},
			{
				value: "folder-only",
				label: "Only this folder (keep what's inside visible)",
			},
		];

		const scopeOptionsEl = panel.createDiv({
			cls: "askfiles-scope-options",
		});
		for (const sc of scopes) {
			this.renderRadioOption(
				scopeOptionsEl,
				sc.label,
				selectedScope === sc.value,
				() => {
					selectedScope = sc.value;
					for (const child of Array.from(scopeOptionsEl.children)) {
						child.removeClass("is-selected");
					}
				},
			);
		}

		const actionRow = panel.createDiv({
			cls: "askfiles-scope-action-row",
		});
		actionRow.createSpan({ text: "Action" });
		const actionSelect = actionRow.createEl("select", {
			cls: "askfiles-gear-select",
		});
		actionSelect.createEl("option", {
			value: "exclude",
			text: "Exclude",
		}).selected = selectedAction === "exclude";
		actionSelect.createEl("option", {
			value: "include",
			text: "Include",
		}).selected = selectedAction === "include";
		actionSelect.addEventListener("change", () => {
			selectedAction =
				actionSelect.value === "include" ? "include" : "exclude";
		});

		const applyBtn = actionRow.createEl("button", {
			cls: "mod-cta askfiles-btn",
			text: "Apply",
			attr: { type: "button" },
		});
		applyBtn.addEventListener("click", () => {
			this.upsertDraftRule(node.path, selectedAction, selectedScope);
			this.activeScopeMenuPath = null;
			this.render();
		});
	}

	private toggleFolderNode(node: TreeFolderNode, checked: boolean): void {
		const targetAction: RuleAction = checked ? "include" : "exclude";
		// Remove any existing direct rule on this path
		this.draftRules = this.draftRules.filter(
			(r) => normalizeFolderPath(r.path) !== node.path,
		);

		// Check what visibility would be without a direct rule on this path
		const ctxWithoutDirect = this.folderEngine.getEvaluationContext(
			this.draftRules,
			this.draftScanMode,
		);
		const naturalVisible = this.folderEngine.isFolderVisible(
			node.path,
			ctxWithoutDirect,
		);

		if (naturalVisible !== checked) {
			this.upsertDraftRule(
				node.path,
				targetAction,
				"folder-and-children",
			);
		}
	}

	private upsertDraftRule(
		folderPath: string,
		action: RuleAction,
		scope: RuleScope,
	): void {
		const norm = normalizeFolderPath(folderPath);
		const idx = this.draftRules.findIndex(
			(r) => normalizeFolderPath(r.path) === norm,
		);
		if (idx >= 0) {
			this.draftRules[idx] = {
				...this.draftRules[idx]!,
				action,
				scope,
			};
		} else {
			this.draftRules.push({
				id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
				path: norm,
				action,
				scope,
			});
		}
	}

	private nodeMatchesFilter(node: TreeFolderNode, filter: string): boolean {
		if (
			node.name.toLowerCase().includes(filter) ||
			node.path.toLowerCase().includes(filter)
		) {
			return true;
		}
		return node.children.some((c) => this.nodeMatchesFilter(c, filter));
	}

	private formatScopeLabel(scope: RuleScope): string {
		switch (scope) {
			case "folder-and-children":
				return "Folder + subfolders";
			case "children-only":
				return "Only subfolders";
			case "folder-only":
				return "Only this folder";
		}
	}

	private renderRadioOption(
		container: HTMLElement,
		label: string,
		selected: boolean,
		onSelect: () => void,
	): HTMLElement {
		const btn = container.createEl("button", {
			cls: `askfiles-radio-btn ${selected ? "is-selected" : ""}`,
			text: `${selected ? "●" : "○"} ${label}`,
			attr: {
				type: "button",
				"aria-pressed": String(selected),
			},
		});
		btn.addEventListener("click", onSelect);
		return btn;
	}
}
