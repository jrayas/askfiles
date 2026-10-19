import {
	ItemView,
	Keymap,
	Menu,
	TFile,
	WorkspaceLeaf,
} from "obsidian";
import { VIEW_TYPE_ASKFILES } from "../constants";
import { FolderEngine } from "../engine/folder-engine";
import { NoteCreator } from "../engine/note-creator";
import { PhraseEngine } from "../engine/phrase-engine";
import type AskfilesPlugin from "../main";
import { normalizeFolderPath } from "../settings/store";
import type {
	DomainCardItem,
	FolderCardItem,
	FolderRule,
	ResolvedPhrase,
	StartBrowseMode,
} from "../types";
import { GearPanel } from "../ui/gear-panel";
import { renderLineIcon } from "../ui/icons";

type WizardStep =
	| "welcome"
	| "browse"
	| "pick-category"
	| "empty"
	| "new-folder"
	| "naming"
	| "vanished"
	| "success";

type SlideDirection = "none" | "forward" | "back";

interface UndoBannerState {
	message: string;
	ruleId: string;
}

export class AskfilesView extends ItemView {
	private step: WizardStep = "browse";
	private startBrowseMode: StartBrowseMode = "category";
	private domainRelativePath = "";
	private currentFolderPath = "";
	private filterQuery = "";
	private activeCardIndex = 0;
	private activeQuickJumpIndex = 0;
	private gearOpen = false;
	private slideDirection: SlideDirection = "none";

	// Naming step state
	private draftNoteName = "";
	private selectedNoteType = "";

	// New folder step state
	private draftFolderName = "";
	private newFolderError = "";

	// Created note state
	private lastCreatedFile: TFile | null = null;
	private lastCreatedDisplayPath = "";

	// Cached phrase for current step so typing in filter doesn't re-roll random phrases
	private currentPhraseKey = "";
	private currentPhrase: ResolvedPhrase = { title: "", description: "" };

	// Undo hide folder banner
	private undoBanner: UndoBannerState | null = null;

	private gearPanel: GearPanel;
	private unsubscribeSettings: (() => void) | null = null;

	constructor(
		leaf: WorkspaceLeaf,
		private plugin: AskfilesPlugin,
	) {
		super(leaf);
		this.gearPanel = new GearPanel(this.app, this.plugin.store, {
			getCurrentFolderPath: () => this.currentFolderPath,
			getCurrentFolderName: () => this.getCurrentFolderDisplayName(),
			onOpenMoreSettings: () => {
				this.gearOpen = false;
				this.plugin.openPluginSettings();
				this.renderView();
			},
			onClose: () => {
				this.gearOpen = false;
				this.renderView();
			},
		});
	}

	private get folderEngine(): FolderEngine {
		return this.plugin.folderEngine;
	}

	private get phraseEngine(): PhraseEngine {
		return this.plugin.phraseEngine;
	}

	private get noteCreator(): NoteCreator {
		return this.plugin.noteCreator;
	}

	getViewType(): string {
		return VIEW_TYPE_ASKFILES;
	}

	getDisplayText(): string {
		return "Askfiles";
	}

	getIcon(): string {
		return "folder-Search";
	}

	async onOpen(): Promise<void> {
		const { settings } = this.plugin.store;
		this.selectedNoteType = settings.defaultNoteType || "Reference";

		if (!settings.firstRunCompleted) {
			this.step = "welcome";
			this.currentFolderPath = "";
		} else if (
			settings.rememberLastChoice &&
			settings.lastVisitedFolder &&
			this.folderEngine.getFolderByPath(settings.lastVisitedFolder)
		) {
			this.currentFolderPath = normalizeFolderPath(
				settings.lastVisitedFolder,
			);
			this.step = "browse";
		} else {
			this.currentFolderPath = this.getRootBasePath();
			this.step = "browse";
		}

		this.unsubscribeSettings = this.plugin.store.subscribe(() => {
			this.currentPhraseKey = "";
			this.renderView();
		});

		this.registerDomEvent(window, "keydown", (evt: KeyboardEvent) => {
			if (this.app.workspace.getMostRecentLeaf() !== this.leaf) {
				return;
			}
			if (document.body.querySelector(".modal-container, .menu")) {
				return;
			}
			this.handleKeydown(evt);
		});

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", (leaf) => {
				if (leaf === this.leaf) {
					this.restoreStepFocus();
				}
			}),
		);

		this.renderView();
		return Promise.resolve();
	}

	async onClose(): Promise<void> {
		if (this.unsubscribeSettings) {
			this.unsubscribeSettings();
			this.unsubscribeSettings = null;
		}
		this.contentEl.empty();
		return Promise.resolve();
	}

	public handleExternalVaultChange(): void {
		if (
			this.currentFolderPath &&
			!this.folderEngine.getFolderByPath(this.currentFolderPath)
		) {
			this.step = "vanished";
		}
		this.renderView();
	}

	private getRootBasePath(): string {
		const root = this.folderEngine.getEffectiveRootFolder();
		return normalizeFolderPath(root.path);
	}

	private isAtRootLevel(): boolean {
		if (this.startBrowseMode === "domain" && this.domainRelativePath) {
			return false;
		}
		return (
			normalizeFolderPath(this.currentFolderPath) ===
			this.getRootBasePath()
		);
	}

	private getCurrentFolderDisplayName(): string {
		if (this.isAtRootLevel()) return "Home";
		if (
			this.startBrowseMode === "domain" &&
			this.domainRelativePath &&
			this.step !== "naming"
		) {
			const relParts = this.domainRelativePath
				.split("/")
				.filter(Boolean);
			return relParts[relParts.length - 1] ?? "Home";
		}
		const norm = normalizeFolderPath(this.currentFolderPath);
		const parts = norm.split("/").filter(Boolean);
		return parts[parts.length - 1] ?? "Home";
	}

	private getBreadcrumbSegments(): Array<{
		label: string;
		path: string;
		isDomainRelative?: boolean;
	}> {
		const rootPath = this.getRootBasePath();
		const segments: Array<{
			label: string;
			path: string;
			isDomainRelative?: boolean;
		}> = [{ label: "Home", path: rootPath }];

		if (this.startBrowseMode === "domain" && this.domainRelativePath) {
			const relParts = this.domainRelativePath
				.split("/")
				.filter(Boolean);
			let accumRel = "";
			for (const part of relParts) {
				accumRel = accumRel ? `${accumRel}/${part}` : part;
				segments.push({
					label: part,
					path: accumRel,
					isDomainRelative: true,
				});
			}
			if (this.step === "naming" && this.currentFolderPath) {
				const norm = normalizeFolderPath(this.currentFolderPath);
				let rel = norm;
				if (rootPath && norm.startsWith(`${rootPath}/`)) {
					rel = norm.slice(rootPath.length + 1);
				}
				const catName = rel.split("/").filter(Boolean)[0];
				if (catName) {
					segments.push({
						label: catName,
						path: this.domainRelativePath,
						isDomainRelative: true,
					});
				}
			}
			return segments;
		}

		const norm = normalizeFolderPath(this.currentFolderPath);
		if (!norm || norm === rootPath) {
			return segments;
		}

		let rel = norm;
		if (rootPath && norm.startsWith(`${rootPath}/`)) {
			rel = norm.slice(rootPath.length + 1);
		}
		const parts = rel.split("/").filter(Boolean);
		let accum = rootPath;
		for (const part of parts) {
			accum = accum ? `${accum}/${part}` : part;
			segments.push({ label: part, path: accum });
		}
		return segments;
	}

	private navigateToFolder(
		folderPath: string,
		direction: SlideDirection = "forward",
	): void {
		const norm = normalizeFolderPath(folderPath);
		const folder = this.folderEngine.getFolderByPath(norm);
		if (!folder) {
			this.step = "vanished";
			this.slideDirection = direction;
			this.renderView();
			return;
		}

		this.domainRelativePath = "";
		this.currentFolderPath = norm;
		this.filterQuery = "";
		this.activeCardIndex = 0;
		this.activeQuickJumpIndex = 0;
		this.slideDirection = direction;

		const visibleChildren = this.folderEngine.getVisibleSubfolders(folder);
		if (visibleChildren.length === 0 && !this.isAtRootLevel()) {
			this.step = "empty";
		} else {
			this.step = "browse";
		}

		if (this.plugin.store.settings.rememberLastChoice) {
			void this.plugin.store.update({ lastVisitedFolder: norm });
		}

		this.renderView();
	}

	private navigateToDomainRelativePath(
		relPath: string,
		direction: SlideDirection = "forward",
	): void {
		const normRel = normalizeFolderPath(relPath);
		this.domainRelativePath = normRel;
		this.filterQuery = "";
		this.activeCardIndex = 0;
		this.activeQuickJumpIndex = 0;
		this.slideDirection = direction;

		if (!normRel) {
			this.currentFolderPath = this.getRootBasePath();
			this.step = "browse";
			this.renderView();
			return;
		}

		const childDomains = this.folderEngine.getDomainItems(normRel);
		if (childDomains.length > 0) {
			this.step = "browse";
		} else {
			this.step = "pick-category";
		}
		this.renderView();
	}

	private navigateUpOneLevel(): void {
		if (this.startBrowseMode === "domain" && this.domainRelativePath) {
			if (this.step === "naming" || this.step === "new-folder") {
				this.step = "pick-category";
				this.activeCardIndex = 0;
				this.slideDirection = "back";
				this.renderView();
				return;
			}

			if (this.step === "pick-category") {
				const childDomains = this.folderEngine.getDomainItems(
					this.domainRelativePath,
				);
				if (childDomains.length > 0) {
					this.step = "browse";
					this.activeCardIndex = 0;
					this.slideDirection = "back";
					this.renderView();
					return;
				}
			}

			const relParts = this.domainRelativePath
				.split("/")
				.filter(Boolean);
			relParts.pop();
			const parentRel = relParts.join("/");
			this.domainRelativePath = parentRel;
			this.step = "browse";
			this.activeCardIndex = 0;
			this.slideDirection = "back";
			this.renderView();
			return;
		}

		if (this.step === "pick-category") {
			this.domainRelativePath = "";
			this.step = "browse";
			this.slideDirection = "back";
			this.renderView();
			return;
		}

		if (this.step === "naming" || this.step === "new-folder") {
			const folder = this.folderEngine.getFolderByPath(
				this.currentFolderPath,
			);
			if (!folder) {
				this.step = "vanished";
			} else {
				const subs = this.folderEngine.getVisibleSubfolders(folder);
				this.step =
					subs.length === 0 && !this.isAtRootLevel()
						? "empty"
						: "browse";
			}
			this.slideDirection = "back";
			this.renderView();
			return;
		}

		const crumbs = this.getBreadcrumbSegments();
		if (crumbs.length > 1) {
			const parentCrumb = crumbs[crumbs.length - 2]!;
			this.navigateToFolder(parentCrumb.path, "back");
		}
	}

	private openNamingStep(targetFolderPath = this.currentFolderPath): void {
		this.currentFolderPath = normalizeFolderPath(targetFolderPath);
		this.step = "naming";
		this.slideDirection = "forward";
		this.selectedNoteType =
			this.selectedNoteType ||
			this.plugin.store.settings.defaultNoteType ||
			"Reference";
		this.renderView();
	}

	private openNewFolderStep(): void {
		this.draftFolderName = "";
		this.newFolderError = "";
		this.step = "new-folder";
		this.slideDirection = "forward";
		this.renderView();
	}

	private getStepPhrase(): ResolvedPhrase {
		const level =
			this.step === "naming"
				? "naming"
				: this.step === "pick-category"
					? "top"
					: this.isAtRootLevel()
						? this.startBrowseMode === "domain"
							? "deeper"
							: "top"
						: "deeper";
		const key = `${this.step}:${level}:${this.startBrowseMode}:${this.domainRelativePath}:${this.currentFolderPath}:${this.plugin.store.getEffectiveLayout(this.currentFolderPath).phraseMode}`;
		if (this.currentPhraseKey !== key) {
			this.currentPhraseKey = key;
			this.currentPhrase = this.phraseEngine.resolvePhraseForStep(
				level,
				this.currentFolderPath,
				true,
			);
		}
		return this.currentPhrase;
	}


	public renderView(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("askfiles-root");
		contentEl.setAttribute("tabindex", "-1");

		const layout = this.plugin.store.getEffectiveLayout(
			this.currentFolderPath,
		);
		const colsValue =
			layout.columns === "auto" ? "auto" : String(layout.columns);
		contentEl.setCssProps({
			"--askfiles-col-count": colsValue === "auto" ? "3" : colsValue,
		});

		const shell = contentEl.createDiv({
			cls: `askfiles-shell askfiles-size--${layout.cardSize} askfiles-layout--${layout.view}`,
		});
		if (layout.columns !== "auto") {
			shell.addClass("askfiles-cols--fixed");
		}

		// Top bar (shown on all screens except welcome/success, or corner icons everywhere)
		this.renderTopBar(shell);

		// Undo banner (when right-click hiding a folder)
		if (this.undoBanner) {
			this.renderUndoBanner(shell, this.undoBanner);
		}

		// Main stage with directional slide animation
		const stage = shell.createDiv({ cls: "askfiles-stage" });
		if (this.slideDirection === "forward") {
			stage.addClass("askfiles-stage--slide-forward");
		} else if (this.slideDirection === "back") {
			stage.addClass("askfiles-stage--slide-back");
		}
		this.slideDirection = "none";

		switch (this.step) {
			case "welcome":
				this.renderWelcomeStep(stage);
				break;
			case "browse":
				this.renderBrowseStep(stage);
				break;
			case "pick-category":
				this.renderPickCategoryStep(stage);
				break;
			case "empty":
				this.renderEmptyStep(stage);
				break;
			case "new-folder":
				this.renderNewFolderStep(stage);
				break;
			case "naming":
				this.renderNamingStep(stage);
				break;
			case "vanished":
				this.renderVanishedStep(stage);
				break;
			case "success":
				this.renderSuccessStep(stage);
				break;
		}

		// Slide-in Gear Panel (or mobile bottom sheet)
		if (this.gearOpen) {
			const backdrop = shell.createDiv({
				cls: "askfiles-gear-backdrop",
			});
			backdrop.addEventListener("click", () => {
				this.gearOpen = false;
				this.renderView();
			});

			const drawer = shell.createDiv({ cls: "askfiles-gear-drawer" });
			this.gearPanel.render(drawer);
		} else {
			this.restoreStepFocus();
		}
	}

	private restoreStepFocus(): void {
		const activeEl = document.activeElement;
		if (
			activeEl instanceof HTMLInputElement ||
			activeEl instanceof HTMLTextAreaElement ||
			activeEl instanceof HTMLSelectElement
		) {
			if (this.contentEl.contains(activeEl)) {
				return;
			}
		}

		if (this.step === "browse" || this.step === "pick-category") {
			window.setTimeout(() => {
				const focusedCard =
					this.contentEl.querySelector<HTMLButtonElement>(
						".askfiles-card.is-focused",
					) ??
					this.contentEl.querySelector<HTMLButtonElement>(
						".askfiles-card",
					);
				if (focusedCard) {
					focusedCard.focus({ preventScroll: true });
				} else {
					this.contentEl.focus({ preventScroll: true });
				}
			}, 0);
		}
	}

	private renderTopBar(shell: HTMLElement): void {
		const topBar = shell.createDiv({ cls: "askfiles-topbar" });
		const navLeft = topBar.createDiv({ cls: "askfiles-topbar-left" });

		const showBackAndTrail =
			this.step !== "welcome" &&
			this.step !== "success" &&
			(!this.isAtRootLevel() ||
				this.step === "pick-category" ||
				this.step === "naming" ||
				this.step === "new-folder" ||
				this.step === "vanished");

		if (showBackAndTrail) {
			const backBtn = navLeft.createEl("button", {
				cls: "askfiles-back-btn",
				attr: {
					type: "button",
					"aria-label": "Go back one level",
				},
			});
			renderLineIcon(backBtn, "chevron-left", 15);
			backBtn.createSpan({ text: "Back", cls: "askfiles-back-text" });
			backBtn.addEventListener("click", () => this.navigateUpOneLevel());

			const trailEl = navLeft.createEl("nav", {
				cls: "askfiles-breadcrumbs",
				attr: { "aria-label": "Folder trail" },
			});
			const crumbs = this.getBreadcrumbSegments();
			crumbs.forEach((crumb, idx) => {
				if (idx > 0) {
					trailEl.createSpan({
						cls: "askfiles-breadcrumb-sep",
						text: "›",
					});
				}
				const crumbBtn = trailEl.createEl("button", {
					cls: "askfiles-breadcrumb-item",
					text: crumb.label,
					attr: { type: "button" },
				});
				if (
					idx === crumbs.length - 1 &&
					(this.step === "browse" ||
						this.step === "pick-category" ||
						this.step === "empty")
				) {
					crumbBtn.addClass("is-current");
				}
				crumbBtn.addEventListener("click", () => {
					if (idx === 0) {
						this.domainRelativePath = "";
						this.navigateToFolder(crumb.path, "back");
					} else if (crumb.isDomainRelative) {
						this.navigateToDomainRelativePath(crumb.path, "back");
					} else {
						this.navigateToFolder(crumb.path, "back");
					}
				});
			});
		} else if (this.step === "browse" && this.filterQuery.trim()) {
			const trailEl = navLeft.createEl("nav", {
				cls: "askfiles-breadcrumbs",
				attr: { "aria-label": "Folder trail" },
			});
			trailEl.createSpan({
				cls: "askfiles-breadcrumb-item is-current",
				text: "Home",
			});
		}

		// Corner icons: Lock first, then Gear, always in top-right in same position
		const cornerIcons = topBar.createDiv({
			cls: "askfiles-corner-icons",
		});
		const isLocked = this.plugin.store.settings.lockFolderCreation;

		const lockBtn = cornerIcons.createEl("button", {
			cls: "askfiles-corner-btn",
			attr: {
				type: "button",
				"aria-label": isLocked
					? "Unlock folder creation"
					: "Lock folder creation",
				"aria-pressed": String(isLocked),
				title: isLocked
					? "Folder creation is locked (click to unlock)"
					: "Folder creation is unlocked (click to lock)",
			},
		});
		renderLineIcon(
			lockBtn,
			isLocked ? "lock-closed" : "lock-open",
			18,
		);
		lockBtn.addEventListener("click", () => {
			void this.plugin.store.update({
				lockFolderCreation: !this.plugin.store.settings.lockFolderCreation,
			});
		});

		const gearBtn = cornerIcons.createEl("button", {
			cls: `askfiles-corner-btn ${this.gearOpen ? "is-active" : ""}`,
			attr: {
				type: "button",
				"aria-label": "Open in-tab settings",
				"aria-expanded": String(this.gearOpen),
				title: "Settings",
			},
		});
		renderLineIcon(gearBtn, "gear", 18);
		gearBtn.addEventListener("click", () => {
			this.gearOpen = !this.gearOpen;
			this.renderView();
		});
	}

	private renderUndoBanner(
		shell: HTMLElement,
		banner: UndoBannerState,
	): void {
		const bar = shell.createDiv({ cls: "askfiles-undo-banner" });
		const textWrap = bar.createDiv({ cls: "askfiles-undo-text" });
		textWrap.createDiv({
			cls: "askfiles-undo-title",
			text: banner.message,
		});
		textWrap.createDiv({
			cls: "askfiles-undo-sub",
			text: "It won't appear in Askfiles.",
		});

		const undoBtn = bar.createEl("button", {
			cls: "askfiles-undo-btn",
			text: "Undo",
			attr: { type: "button" },
		});
		undoBtn.addEventListener("click", () => {
			const ruleId = banner.ruleId;
			this.undoBanner = null;
			void this.folderEngine.removeRuleById(ruleId);
		});
	}

	private renderWelcomeStep(stage: HTMLElement): void {
		const pluginName = this.plugin.manifest.name;
		const wrap = stage.createDiv({ cls: "askfiles-center-screen" });
		wrap.createEl("h1", {
			cls: "askfiles-question-title",
			text: `Welcome to ${pluginName}`,
		});
		wrap.createEl("p", {
			cls: "askfiles-question-desc",
			text: "Answer a few simple questions and your note finds its place in your folders.",
		});

		const allFolders = this.folderEngine.getAllVisibleFolders();
		wrap.createEl("p", {
			cls: "askfiles-welcome-count",
			text: `We found ${allFolders.length} ${allFolders.length === 1 ? "folder" : "folders"} in your vault.`,
		});

		const startBtn = wrap.createEl("button", {
			cls: "askfiles-primary-action",
			text: "Start ↵",
			attr: { type: "button" },
		});
		startBtn.addEventListener("click", () => {
			this.step = "browse";
			this.slideDirection = "forward";
			void this.plugin.store.update({ firstRunCompleted: true });
		});

		wrap.createEl("p", {
			cls: "askfiles-welcome-footnote",
			text: "You can change anything later.",
		});

		window.setTimeout(() => startBtn.focus(), 10);
	}

	private renderPickCategoryStep(stage: HTMLElement): void {
		if (!this.domainRelativePath) {
			this.step = "browse";
			this.renderBrowseStep(stage);
			return;
		}

		const categories = this.folderEngine.getCategoriesForDomainPath(
			this.domainRelativePath,
		);
		if (categories.length === 0) {
			this.step = "browse";
			this.domainRelativePath = "";
			this.renderBrowseStep(stage);
			return;
		}

		const { settings } = this.plugin.store;
		const phrase = this.getStepPhrase();
		const displayDomainTrail = this.domainRelativePath
			.split("/")
			.filter(Boolean)
			.join(" › ");

		const header = stage.createDiv({ cls: "askfiles-question-header" });
		header.createEl("h1", {
			cls: "askfiles-question-title",
			text: phrase.title,
		});
		header.createEl("p", {
			cls: "askfiles-question-desc",
			text: `Choose a category for ${displayDomainTrail}`,
		});

		if (this.activeCardIndex >= categories.length) {
			this.activeCardIndex = Math.max(0, categories.length - 1);
		}

		const scroller = stage.createDiv({ cls: "askfiles-card-scroller" });
		const gridEl = scroller.createDiv({ cls: "askfiles-card-grid" });

		categories.forEach((parent, idx) => {
			const isSelected = idx === this.activeCardIndex;
			const cardEl = gridEl.createEl("button", {
				cls: `askfiles-card ${isSelected ? "is-focused" : ""}`,
				attr: {
					type: "button",
					"data-folder-path": parent.domainFolderPath,
				},
			});
			const titleRow = cardEl.createDiv({
				cls: "askfiles-card-title-row",
			});
			titleRow.createSpan({
				cls: "askfiles-card-name",
				text: parent.categoryName,
			});

			if (settings.showCardCounts) {
				let countText = "";
				if (parent.visibleSubfolderCount > 0) {
					countText = `${parent.visibleSubfolderCount} ${parent.visibleSubfolderCount === 1 ? "folder" : "folders"}`;
				} else if (parent.noteCount > 0) {
					countText = `${parent.noteCount} ${parent.noteCount === 1 ? "note" : "notes"}`;
				}
				if (countText) {
					cardEl.createDiv({
						cls: "askfiles-card-meta",
						text: countText,
					});
				}
			}

			cardEl.addEventListener("click", () => {
				this.activeCardIndex = idx;
				this.openNamingStep(parent.domainFolderPath);
			});
		});
	}

	private renderBrowseStep(stage: HTMLElement): void {
		const folder = this.folderEngine.getFolderByPath(
			this.currentFolderPath,
		);
		if (!folder) {
			this.renderVanishedStep(stage);
			return;
		}

		const { settings } = this.plugin.store;
		const isLocked = settings.lockFolderCreation;
		const phrase = this.getStepPhrase();
		const atRoot = this.isAtRootLevel();

		const header = stage.createDiv({ cls: "askfiles-question-header" });
		header.createEl("h1", {
			cls: "askfiles-question-title",
			text: phrase.title,
		});
		if (phrase.description) {
			header.createEl("p", {
				cls: "askfiles-question-desc",
				text: isLocked
					? phrase.description.replace(
							/,\s*or save it at this level/i,
							"",
						)
					: phrase.description,
			});
		}

		// Home page toggle pill: Category | Domain
		if (atRoot) {
			const toggleWrap = header.createDiv({
				cls: "askfiles-home-mode-pills",
				attr: {
					role: "group",
					"aria-label": "Start browsing by category or domain",
				},
			});

			const catBtn = toggleWrap.createEl("button", {
				cls: `askfiles-type-pill ${this.startBrowseMode === "category" ? "is-selected" : ""}`,
				text: "Category",
				attr: {
					type: "button",
					"aria-pressed": String(this.startBrowseMode === "category"),
				},
			});
			catBtn.addEventListener("click", () => {
				if (this.startBrowseMode !== "category") {
					this.startBrowseMode = "category";
					this.domainRelativePath = "";
					this.activeCardIndex = 0;
					this.currentPhraseKey = "";
					this.renderView();
				}
			});

			const domBtn = toggleWrap.createEl("button", {
				cls: `askfiles-type-pill ${this.startBrowseMode === "domain" ? "is-selected" : ""}`,
				text: "Domain",
				attr: {
					type: "button",
					"aria-pressed": String(this.startBrowseMode === "domain"),
				},
			});
			domBtn.addEventListener("click", () => {
				if (this.startBrowseMode !== "domain") {
					this.startBrowseMode = "domain";
					this.domainRelativePath = "";
					this.activeCardIndex = 0;
					this.currentPhraseKey = "";
					this.renderView();
				}
			});
		}

		const trimmedQuery = this.filterQuery.trim().toLowerCase();

		// Build interactive card descriptors (folder cards OR domain cards + "Save here" + optional "+ New")
		type ActionCard =
			| { kind: "folder"; item: FolderCardItem }
			| { kind: "domain"; domain: DomainCardItem }
			| { kind: "save-here" }
			| { kind: "new-folder" };

		const actionCards: ActionCard[] = [];

		if (
			this.startBrowseMode === "domain" &&
			(atRoot || this.domainRelativePath.length > 0)
		) {
			const rawDomains = this.folderEngine.getDomainItems(
				this.domainRelativePath,
			);
			const filteredDomains = trimmedQuery
				? rawDomains.filter((d) =>
						d.domainName.toLowerCase().includes(trimmedQuery),
					)
				: rawDomains;
			for (const domain of filteredDomains) {
				actionCards.push({ kind: "domain", domain });
			}
			if (!atRoot || rawDomains.length === 0 || !trimmedQuery) {
				actionCards.push({ kind: "save-here" });
			}
		} else {
			const rawCards = this.folderEngine.getCardItemsForFolder(folder);
			const filteredCards = trimmedQuery
				? rawCards.filter(
						(c) =>
							c.name.toLowerCase().includes(trimmedQuery) ||
							(c.description &&
								c.description
									.toLowerCase()
									.includes(trimmedQuery)),
					)
				: rawCards;
			for (const item of filteredCards) {
				actionCards.push({ kind: "folder", item });
			}
			if (!atRoot || rawCards.length === 0 || !trimmedQuery) {
				actionCards.push({ kind: "save-here" });
			}
		}

		if (!isLocked) {
			actionCards.push({ kind: "new-folder" });
		}

		if (this.activeCardIndex >= actionCards.length) {
			this.activeCardIndex = Math.max(0, actionCards.length - 1);
		}

		// Quick-jump results when typing in the search bar at root or with quickJumpSearch enabled
		const showQuickJumpResults =
			settings.quickJumpSearch && trimmedQuery.length > 0;
		const quickJumpMatches = showQuickJumpResults
			? this.folderEngine.searchQuickJump(this.filterQuery)
			: [];

		// Card scroller
		const scroller = stage.createDiv({ cls: "askfiles-card-scroller" });
		const gridEl = scroller.createDiv({ cls: "askfiles-card-grid" });

		actionCards.forEach((entry, idx) => {
			const isSelected = idx === this.activeCardIndex && !trimmedQuery;
			if (entry.kind === "folder") {
				const { item } = entry;
				const cardEl = gridEl.createEl("button", {
					cls: `askfiles-card ${isSelected ? "is-focused" : ""}`,
					attr: {
						type: "button",
						"data-folder-path": item.path,
					},
				});

				const titleRow = cardEl.createDiv({
					cls: "askfiles-card-title-row",
				});
				if (item.icon) {
					titleRow.createSpan({
						cls: "askfiles-card-icon",
						text: item.icon,
					});
				}
				titleRow.createSpan({
					cls: "askfiles-card-name",
					text: item.name,
				});

				if (item.description) {
					cardEl.createDiv({
						cls: "askfiles-card-desc",
						text: item.description,
					});
				}

				if (settings.showCardCounts) {
					const countText = this.formatFolderCount(item);
					if (countText) {
						cardEl.createDiv({
							cls: "askfiles-card-meta",
							text: countText,
						});
					}
				}

				cardEl.addEventListener("click", () => {
					this.activeCardIndex = idx;
					this.navigateToFolder(item.path, "forward");
				});

				cardEl.addEventListener("contextmenu", (evt) => {
					evt.preventDefault();
					this.openCardContextMenu(evt, item);
				});
			} else if (entry.kind === "domain") {
				const { domain } = entry;
				const cardEl = gridEl.createEl("button", {
					cls: `askfiles-card ${isSelected ? "is-focused" : ""}`,
					attr: {
						type: "button",
						"data-domain-name": domain.domainName,
						"data-domain-path": domain.relativePath,
					},
				});

				const titleRow = cardEl.createDiv({
					cls: "askfiles-card-title-row",
				});
				titleRow.createSpan({
					cls: "askfiles-card-name",
					text: domain.domainName,
				});

				if (settings.showCardCounts) {
					let countText = "";
					if (domain.totalVisibleSubfolders > 0) {
						countText = `${domain.totalVisibleSubfolders} ${domain.totalVisibleSubfolders === 1 ? "folder" : "folders"}`;
					} else if (domain.totalNotes > 0) {
						countText = `${domain.totalNotes} ${domain.totalNotes === 1 ? "note" : "notes"}`;
					}
					if (countText) {
						cardEl.createDiv({
							cls: "askfiles-card-meta",
							text: countText,
						});
					}
				}

				cardEl.addEventListener("click", () => {
					this.activeCardIndex = idx;
					this.navigateToDomainRelativePath(
						domain.relativePath,
						"forward",
					);
				});
			} else if (entry.kind === "save-here") {
				const cardEl = gridEl.createEl("button", {
					cls: `askfiles-card askfiles-card--action ${isSelected ? "is-focused" : ""}`,
					attr: {
						type: "button",
						"data-action": "save-here",
					},
				});
				cardEl.createDiv({
					cls: "askfiles-card-name",
					text: "Save here",
				});
				cardEl.createDiv({
					cls: "askfiles-card-meta",
					text: this.isAtRootLevel()
						? "Create note in vault root"
						: `Save in ${this.getCurrentFolderDisplayName()}`,
				});
				cardEl.addEventListener("click", () => {
					if (
						this.startBrowseMode === "domain" &&
						this.domainRelativePath
					) {
						this.activeCardIndex = 0;
						this.step = "pick-category";
						this.slideDirection = "forward";
						this.renderView();
					} else {
						this.openNamingStep(this.currentFolderPath);
					}
				});
			}
 else if (entry.kind === "new-folder") {
				const cardEl = gridEl.createEl("button", {
					cls: `askfiles-card askfiles-card--action askfiles-card--new ${isSelected ? "is-focused" : ""}`,
					attr: {
						type: "button",
						"data-action": "new-folder",
					},
				});
				cardEl.createDiv({
					cls: "askfiles-card-name",
					text: "+ New",
				});
				cardEl.createDiv({
					cls: "askfiles-card-meta",
					text: "Create a folder",
				});
				cardEl.addEventListener("click", () => {
					this.openNewFolderStep();
				});
			}
		});

		// Quick-jump matches panel when user types in the search line
		if (showQuickJumpResults && quickJumpMatches.length > 0) {
			const qjSection = scroller.createDiv({
				cls: "askfiles-quickjump-results",
			});
			qjSection.createDiv({
				cls: "askfiles-quickjump-heading",
				text: "Quick jump",
			});

			if (this.activeQuickJumpIndex >= quickJumpMatches.length) {
				this.activeQuickJumpIndex = 0;
			}

			quickJumpMatches.forEach((match, qIdx) => {
				const row = qjSection.createEl("button", {
					cls: `askfiles-quickjump-item ${qIdx === this.activeQuickJumpIndex ? "is-focused" : ""}`,
					attr: {
						type: "button",
						"data-quickjump-path": match.path,
					},
				});
				row.createSpan({
					cls: "askfiles-quickjump-path",
					text: match.displayPath,
				});
				const countLabel = this.formatFolderCount(match);
				if (countLabel) {
					row.createSpan({
						cls: "askfiles-quickjump-meta",
						text: countLabel,
					});
				}
				row.addEventListener("click", () => {
					this.navigateToFolder(match.path, "forward");
				});
			});

			qjSection.createDiv({
				cls: "askfiles-quickjump-hint",
				text: "↑ ↓ to choose     ↵ to go there",
			});
		}

		// Footer search / filter line
		const footer = stage.createDiv({ cls: "askfiles-footer-bar" });
		const placeholder = this.isAtRootLevel()
			? "Search or type a path..."
			: "Filter topics...";
		const searchInput = footer.createEl("input", {
			type: "text",
			cls: "askfiles-search-input",
			placeholder,
			value: this.filterQuery,
			attr: {
				"aria-label": placeholder,
			},
		});

		searchInput.addEventListener("input", () => {
			this.filterQuery = searchInput.value;
			this.activeQuickJumpIndex = 0;
			this.renderView();
			const nextInput = this.contentEl.querySelector<HTMLInputElement>(
				".askfiles-search-input",
			);
			if (nextInput) {
				nextInput.focus();
				const len = nextInput.value.length;
				nextInput.setSelectionRange(len, len);
			}
		});
	}

	private renderEmptyStep(stage: HTMLElement): void {
		const isLocked = this.plugin.store.settings.lockFolderCreation;
		const folderName = this.getCurrentFolderDisplayName();

		const wrap = stage.createDiv({ cls: "askfiles-center-screen" });
		wrap.createEl("h1", {
			cls: "askfiles-question-title",
			text: "Nothing deeper here",
		});
		wrap.createEl("p", {
			cls: "askfiles-question-desc",
			text: `Save your note in ${folderName}`,
		});

		const actions = wrap.createDiv({ cls: "askfiles-inline-actions" });
		const continueBtn = actions.createEl("button", {
			cls: "askfiles-primary-action",
			text: "Continue ↵",
			attr: { type: "button" },
		});
		continueBtn.addEventListener("click", () => {
			this.openNamingStep(this.currentFolderPath);
		});

		if (!isLocked) {
			const newFolderBtn = actions.createEl("button", {
				cls: "askfiles-secondary-action",
				text: "+ new folder",
				attr: { type: "button" },
			});
			newFolderBtn.addEventListener("click", () => {
				this.openNewFolderStep();
			});
		}

		window.setTimeout(() => continueBtn.focus(), 10);
	}

	private renderNewFolderStep(stage: HTMLElement): void {
		const isLocked = this.plugin.store.settings.lockFolderCreation;
		const parentName = this.getCurrentFolderDisplayName();

		const wrap = stage.createDiv({ cls: "askfiles-center-screen" });

		if (isLocked) {
			wrap.createEl("p", {
				cls: "askfiles-warning-message",
				text: "This folder doesn't exist, and folder creation is locked.",
			});
			const actions = wrap.createDiv({ cls: "askfiles-inline-actions" });
			const unlockBtn = actions.createEl("button", {
				cls: "askfiles-primary-action",
				text: "Unlock to create it",
				attr: { type: "button" },
			});
			unlockBtn.addEventListener("click", () => {
				void this.plugin.store.update({ lockFolderCreation: false });
			});

			const backBtn = actions.createEl("button", {
				cls: "askfiles-secondary-action",
				text: "Go back",
				attr: { type: "button" },
			});
			backBtn.addEventListener("click", () => this.navigateUpOneLevel());
			return;
		}

		wrap.createEl("h1", {
			cls: "askfiles-question-title",
			text: "New folder",
		});
		wrap.createEl("p", {
			cls: "askfiles-question-desc",
			text: `Add a new place inside ${parentName}`,
		});

		const input = wrap.createEl("input", {
			type: "text",
			cls: "askfiles-title-input",
			placeholder: "Folder name",
			value: this.draftFolderName,
			attr: { "aria-label": "New folder name" },
		});

		const errorEl = wrap.createDiv({
			cls: "askfiles-warning-box",
		});
		if (this.newFolderError) {
			errorEl.createEl("p", {
				cls: "askfiles-warning-message",
				text: this.newFolderError,
			});
		}

		const submitFolder = async (): Promise<void> => {
			try {
				const created = await this.noteCreator.createSubfolder(
					this.currentFolderPath,
					input.value,
				);
				this.draftFolderName = "";
				this.newFolderError = "";
				this.navigateToFolder(created.path, "forward");
			} catch (err) {
				this.newFolderError =
					err instanceof Error
						? err.message
						: "Could not create folder.";
				this.renderView();
			}
		};

		input.addEventListener("input", () => {
			this.draftFolderName = input.value;
		});
		input.addEventListener("keydown", (evt) => {
			if (evt.key === "Enter") {
				evt.preventDefault();
				evt.stopPropagation();
				void submitFolder();
			}
		});

		const createBtn = wrap.createEl("button", {
			cls: "askfiles-primary-action",
			text: "Create folder ↵",
			attr: { type: "button" },
		});
		createBtn.addEventListener("click", () => {
			void submitFolder();
		});

		window.setTimeout(() => input.focus(), 10);
	}

	private renderNamingStep(stage: HTMLElement): void {
		const { settings } = this.plugin.store;
		const phrase = this.getStepPhrase();

		const wrap = stage.createDiv({ cls: "askfiles-center-screen" });
		wrap.createEl("h1", {
			cls: "askfiles-question-title",
			text: phrase.title,
		});
		if (phrase.description) {
			wrap.createEl("p", {
				cls: "askfiles-question-desc",
				text: phrase.description,
			});
		}

		const input = wrap.createEl("input", {
			type: "text",
			cls: "askfiles-title-input",
			placeholder: "Untitled note",
			value: this.draftNoteName,
			attr: { "aria-label": "Note title" },
		});

		const validationContainer = wrap.createDiv({
			cls: "askfiles-validation-area",
		});

		const renderValidationState = (): void => {
			validationContainer.empty();
			const validation = this.noteCreator.validateNoteName(
				this.currentFolderPath,
				this.draftNoteName,
			);

			if (validation.targetFolderMissing) {
				this.step = "vanished";
				this.renderView();
				return;
			}

			if (validation.hasIllegalChars) {
				const box = validationContainer.createDiv({
					cls: "askfiles-warning-box",
				});
				box.createEl("p", {
					cls: "askfiles-warning-message",
					text: "Some characters can't be used in note names.",
				});
				const suggestionRow = box.createDiv({
					cls: "askfiles-warning-actions",
				});
				suggestionRow.createSpan({
					text: `Use "${validation.suggestedSafeName}"?`,
				});
				const useBtn = suggestionRow.createEl("button", {
					cls: "askfiles-inline-btn",
					text: "Use this",
					attr: { type: "button" },
				});
				useBtn.addEventListener("click", () => {
					this.draftNoteName = validation.suggestedSafeName;
					input.value = this.draftNoteName;
					renderValidationState();
					input.focus();
				});
			} else if (validation.duplicateExists && validation.existingFile) {
				const existingFile = validation.existingFile;
				const box = validationContainer.createDiv({
					cls: "askfiles-warning-box",
				});
				box.createEl("p", {
					cls: "askfiles-warning-message",
					text: "A note with this name already exists here.",
				});
				box.createEl("p", {
					cls: "askfiles-warning-sub",
					text: "Open it instead, or choose a different name.",
				});
				const actRow = box.createDiv({
					cls: "askfiles-warning-actions",
				});
				const openExistingBtn = actRow.createEl("button", {
					cls: "askfiles-inline-btn",
					text: "Open existing",
					attr: { type: "button" },
				});
				openExistingBtn.addEventListener("click", (evt) => {
					void this.app.workspace
						.getLeaf(Keymap.isModEvent(evt))
						.openFile(existingFile);
				});

				const renameBtn = actRow.createEl("button", {
					cls: "askfiles-inline-btn",
					text: "Rename",
					attr: { type: "button" },
				});
				renameBtn.addEventListener("click", () => {
					input.focus();
					input.select();
				});
			}
		};

		renderValidationState();

		input.addEventListener("input", () => {
			this.draftNoteName = input.value;
			renderValidationState();
		});

		// Note Type Picker (`04-main-tab-ascii.md` & `11-additional-screens-ascii.md`)
		if (settings.enableNoteTypes && settings.noteTypes.length > 0) {
			const typeSection = wrap.createDiv({
				cls: "askfiles-type-section",
			});
			typeSection.createSpan({
				cls: "askfiles-type-label",
				text: "Type",
			});

			const pillsWrap = typeSection.createDiv({
				cls: "askfiles-type-pills",
			});

			for (const nt of settings.noteTypes) {
				const isSelected = nt.name === this.selectedNoteType;
				const pill = pillsWrap.createEl("button", {
					cls: `askfiles-type-pill ${isSelected ? "is-selected" : ""}`,
					text: nt.name,
					attr: {
						type: "button",
						"aria-pressed": String(isSelected),
					},
				});
				pill.addEventListener("click", () => {
					this.selectedNoteType = nt.name;
					this.renderView();
				});
			}
		}

		const submitCreateNote = async (): Promise<void> => {
			const check = this.noteCreator.validateNoteName(
				this.currentFolderPath,
				this.draftNoteName,
			);
			if (!check.valid) {
				renderValidationState();
				return;
			}
			const file = await this.noteCreator.createNote({
				folderPath: this.currentFolderPath,
				noteTitle: this.draftNoteName,
				noteType: settings.enableNoteTypes ? this.selectedNoteType : "",
			});
			this.lastCreatedFile = file;
			const folderTrail = this.currentFolderPath
				? this.currentFolderPath.split("/").join(" › ")
				: "Home";
			this.lastCreatedDisplayPath = `${folderTrail} › ${file.basename}`;
			this.draftNoteName = "";
			this.step = "success";
			this.slideDirection = "forward";
			this.renderView();

			if (settings.openAfterCreating) {
				await this.app.workspace.getLeaf(false).openFile(file);
			}
		};

		input.addEventListener("keydown", (evt) => {
			if (evt.key === "Enter") {
				evt.preventDefault();
				evt.stopPropagation();
				void submitCreateNote();
			}
		});

		const createBtn = wrap.createEl("button", {
			cls: "askfiles-primary-action",
			text: "Create note ↵",
			attr: { type: "button" },
		});
		createBtn.addEventListener("click", () => {
			void submitCreateNote();
		});

		window.setTimeout(() => {
			input.focus();
			const len = input.value.length;
			input.setSelectionRange(len, len);
		}, 10);
	}

	private renderVanishedStep(stage: HTMLElement): void {
		const pluginName = this.plugin.manifest.name;
		const wrap = stage.createDiv({ cls: "askfiles-center-screen" });
		wrap.createEl("h1", {
			cls: "askfiles-question-title",
			text: "That folder has gone",
		});
		wrap.createEl("p", {
			cls: "askfiles-question-desc",
			text: `It may have been moved or renamed outside ${pluginName}.`,
		});

		const actions = wrap.createDiv({ cls: "askfiles-inline-actions" });
		const homeBtn = actions.createEl("button", {
			cls: "askfiles-primary-action",
			text: "Go back to home",
			attr: { type: "button" },
		});
		homeBtn.addEventListener("click", () => {
			this.navigateToFolder(this.getRootBasePath(), "back");
		});

		const rescanBtn = actions.createEl("button", {
			cls: "askfiles-secondary-action",
			text: "Rescan",
			attr: { type: "button" },
		});
		rescanBtn.addEventListener("click", () => {
			const exists = this.folderEngine.getFolderByPath(
				this.currentFolderPath,
			);
			if (exists) {
				this.navigateToFolder(this.currentFolderPath, "none");
			} else {
				this.navigateToFolder(this.getRootBasePath(), "back");
			}
		});
	}

	private renderSuccessStep(stage: HTMLElement): void {
		const wrap = stage.createDiv({ cls: "askfiles-center-screen" });
		wrap.createEl("h1", {
			cls: "askfiles-question-title",
			text: "Note created",
		});
		wrap.createEl("p", {
			cls: "askfiles-success-path",
			text: this.lastCreatedDisplayPath,
		});

		const actions = wrap.createDiv({ cls: "askfiles-inline-actions" });
		const openBtn = actions.createEl("button", {
			cls: "askfiles-primary-action",
			text: "Open note ↵",
			attr: { type: "button" },
		});
		openBtn.addEventListener("click", (evt) => {
			if (this.lastCreatedFile) {
				void this.app.workspace
					.getLeaf(Keymap.isModEvent(evt))
					.openFile(this.lastCreatedFile);
			}
		});

		const anotherBtn = actions.createEl("button", {
			cls: "askfiles-secondary-action",
			text: "Create another here",
			attr: { type: "button" },
		});
		anotherBtn.addEventListener("click", () => {
			this.openNamingStep(this.currentFolderPath);
		});

		const closeBtn = actions.createEl("button", {
			cls: "askfiles-secondary-action",
			text: "Close",
			attr: { type: "button" },
		});
		closeBtn.addEventListener("click", () => {
			this.navigateToFolder(this.getRootBasePath(), "back");
		});

		window.setTimeout(() => openBtn.focus(), 10);
	}

	private formatFolderCount(item: FolderCardItem): string {
		if (item.visibleSubfolderCount > 0) {
			return `${item.visibleSubfolderCount} ${item.visibleSubfolderCount === 1 ? "folder" : "folders"}`;
		}
		if (item.noteCount > 0) {
			return `${item.noteCount} ${item.noteCount === 1 ? "note" : "notes"}`;
		}
		return "";
	}

	private openCardContextMenu(
		evt: MouseEvent,
		item: FolderCardItem,
	): void {
		const menu = new Menu();

		menu.addItem((mi) => {
			mi.setTitle("Hide this folder")
				.setIcon("eye-off")
				.onClick(() => {
					void this.hideFolderWithUndo(
						item.path,
						item.name,
						"folder-and-children",
					);
				});
		});

		menu.addItem((mi) => {
			mi.setTitle("Hide its subfolders")
				.setIcon("folder-minus")
				.onClick(() => {
					void this.hideFolderWithUndo(
						item.path,
						`${item.name} subfolders`,
						"children-only",
					);
				});
		});

		menu.addSeparator();

		menu.addItem((mi) => {
			mi.setTitle("Open in plugin settings")
				.setIcon("settings")
				.onClick(() => {
					this.plugin.openPluginSettings();
				});
		});

		menu.showAtMouseEvent(evt);
	}

	private async hideFolderWithUndo(
		folderPath: string,
		displayName: string,
		scope: FolderRule["scope"],
	): Promise<void> {
		const addedRule = await this.folderEngine.addOrUpdateRule(
			folderPath,
			"exclude",
			scope,
		);
		this.undoBanner = {
			message: `Hidden "${displayName}"`,
			ruleId: addedRule.id,
		};
		this.renderView();
	}

	private handleKeydown(evt: KeyboardEvent): void {
		const target = evt.target as HTMLElement | null;
		const inTextInput =
			target instanceof HTMLInputElement ||
			target instanceof HTMLTextAreaElement ||
			target instanceof HTMLSelectElement;

		if (evt.key === "Escape") {
			if (this.gearOpen) {
				evt.preventDefault();
				this.gearOpen = false;
				this.renderView();
				return;
			}
			if (this.filterQuery) {
				evt.preventDefault();
				this.filterQuery = "";
				this.renderView();
				return;
			}
			if (!this.isAtRootLevel() || this.step !== "browse") {
				evt.preventDefault();
				this.navigateUpOneLevel();
				return;
			}
		}

		// When inside the bottom search input on browse screen
		if (
			inTextInput &&
			target?.classList.contains("askfiles-search-input") &&
			this.step === "browse"
		) {
			if (evt.key === "Backspace" && !this.filterQuery) {
				evt.preventDefault();
				this.navigateUpOneLevel();
				return;
			}
			if (this.filterQuery.trim()) {
				const matches = this.folderEngine.searchQuickJump(
					this.filterQuery,
				);
				if (evt.key === "ArrowDown" && matches.length > 0) {
					evt.preventDefault();
					this.activeQuickJumpIndex =
						(this.activeQuickJumpIndex + 1) % matches.length;
					this.renderView();
					return;
				}
				if (evt.key === "ArrowUp" && matches.length > 0) {
					evt.preventDefault();
					this.activeQuickJumpIndex =
						(this.activeQuickJumpIndex - 1 + matches.length) %
						matches.length;
					this.renderView();
					return;
				}
				if (evt.key === "Enter" && matches.length > 0) {
					evt.preventDefault();
					const chosen = matches[this.activeQuickJumpIndex] ?? matches[0];
					if (chosen) {
						this.navigateToFolder(chosen.path, "forward");
					}
					return;
				}
			}
			return;
		}

		if (inTextInput) {
			return;
		}

		const { shortcuts } = this.plugin.store.settings;
		const keyLower = evt.key.toLowerCase();

		if (evt.key === shortcuts.focusSearch && this.step === "browse") {
			evt.preventDefault();
			const searchInput =
				this.contentEl.querySelector<HTMLInputElement>(
					".askfiles-search-input",
				);
			searchInput?.focus();
			return;
		}

		if (
			keyLower === shortcuts.toggleLock.toLowerCase() &&
			!evt.metaKey &&
			!evt.ctrlKey &&
			!evt.altKey
		) {
			evt.preventDefault();
			void this.plugin.store.update({
				lockFolderCreation:
					!this.plugin.store.settings.lockFolderCreation,
			});
			return;
		}

		if (
			evt.key === shortcuts.openGearPanel &&
			!evt.metaKey &&
			!evt.ctrlKey &&
			!evt.altKey
		) {
			evt.preventDefault();
			this.gearOpen = !this.gearOpen;
			this.renderView();
			return;
		}

		if (
			keyLower === shortcuts.saveHere.toLowerCase() &&
			this.step === "browse" &&
			!evt.metaKey &&
			!evt.ctrlKey &&
			!evt.altKey
		) {
			evt.preventDefault();
			if (
				this.startBrowseMode === "domain" &&
				this.domainRelativePath
			) {
				this.activeCardIndex = 0;
				this.step = "pick-category";
				this.slideDirection = "forward";
				this.renderView();
			} else {
				this.openNamingStep(this.currentFolderPath);
			}
			return;
		}

		if (
			evt.key === "Backspace" &&
			(this.step === "browse" || this.step === "pick-category")
		) {
			evt.preventDefault();
			this.navigateUpOneLevel();
			return;
		}

		// 2D Arrow navigation across cards in browse and pick-category steps
		if (this.step === "browse" || this.step === "pick-category") {
			const cards = Array.from(
				this.contentEl.querySelectorAll<HTMLButtonElement>(
					".askfiles-card",
				),
			);
			if (cards.length === 0) return;

			if (evt.key === "ArrowRight") {
				evt.preventDefault();
				this.activeCardIndex =
					(this.activeCardIndex + 1) % cards.length;
				this.updateCardFocusDom(cards);
			} else if (evt.key === "ArrowLeft") {
				evt.preventDefault();
				this.activeCardIndex =
					(this.activeCardIndex - 1 + cards.length) % cards.length;
				this.updateCardFocusDom(cards);
			} else if (evt.key === "ArrowDown" || evt.key === "ArrowUp") {
				evt.preventDefault();
				const step = this.estimateGridColumns(cards);
				const delta = evt.key === "ArrowDown" ? step : -step;
				const next = this.activeCardIndex + delta;
				if (next >= 0 && next < cards.length) {
					this.activeCardIndex = next;
					this.updateCardFocusDom(cards);
				}
			} else if (evt.key === "Enter") {
				evt.preventDefault();
				const activeCard = cards[this.activeCardIndex];
				activeCard?.click();
			}
		}
	}


	private estimateGridColumns(cards: HTMLButtonElement[]): number {
		if (cards.length <= 1) return 1;
		const firstTop = cards[0]!.getBoundingClientRect().top;
		let cols = 0;
		for (const card of cards) {
			if (Math.abs(card.getBoundingClientRect().top - firstTop) < 10) {
				cols++;
			} else {
				break;
			}
		}
		return Math.max(1, cols);
	}

	private updateCardFocusDom(cards: HTMLButtonElement[]): void {
		cards.forEach((c, idx) => {
			if (idx === this.activeCardIndex) {
				c.addClass("is-focused");
				c.focus();
			} else {
				c.removeClass("is-focused");
			}
		});
	}
}
