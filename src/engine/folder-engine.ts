import { App, normalizePath, prepareFuzzySearch, TFile, TFolder } from "obsidian";
import { normalizeFolderPath, SettingsStore } from "../settings/store";
import type {
	DomainCardItem,
	DomainParentMatch,
	FolderCardItem,
	FolderRule,
	RuleAction,
	RuleScope,
	ScanMode,
	TreeFolderNode,
} from "../types";

export interface RuleEvaluationContext {
	scanMode: ScanMode;
	hideDotFolders: boolean;
	configDir: string;
	folderRules: FolderRule[];
}

function getPathDepth(path: string): number {
	const norm = normalizeFolderPath(path);
	if (!norm) return 0;
	return norm.split("/").length;
}

function getScopeSpecificity(scope: RuleScope): number {
	switch (scope) {
		case "folder-only":
			return 3;
		case "children-only":
			return 2;
		case "folder-and-children":
			return 1;
	}
}

export function doesRuleMatchPath(
	rule: FolderRule,
	targetPath: string,
): boolean {
	const rPath = normalizeFolderPath(rule.path);
	const tPath = normalizeFolderPath(targetPath);
	if (!rPath || !tPath) return false;

	switch (rule.scope) {
		case "folder-and-children":
			return tPath === rPath || tPath.startsWith(`${rPath}/`);
		case "children-only":
			return tPath.startsWith(`${rPath}/`);
		case "folder-only":
			return tPath === rPath;
	}
}

export function isDotOrConfigPath(
	targetPath: string,
	configDir: string,
	hideDotFolders: boolean,
): boolean {
	const norm = normalizeFolderPath(targetPath);
	if (!norm) return false;
	const normConfig = normalizeFolderPath(configDir);
	if (norm === normConfig || norm.startsWith(`${normConfig}/`)) {
		return true;
	}
	if (!hideDotFolders) return false;
	const segments = norm.split("/");
	return segments.some((seg) => seg.startsWith("."));
}

export function findWinningRule(
	targetPath: string,
	rules: FolderRule[],
): FolderRule | undefined {
	const matching = rules.filter((r) => doesRuleMatchPath(r, targetPath));
	if (matching.length === 0) return undefined;

	matching.sort((a, b) => {
		const depthDiff = getPathDepth(b.path) - getPathDepth(a.path);
		if (depthDiff !== 0) return depthDiff;
		return getScopeSpecificity(b.scope) - getScopeSpecificity(a.scope);
	});

	return matching[0];
}

export function evaluateFolderVisibility(
	targetPath: string,
	ctx: RuleEvaluationContext,
): {
	visible: boolean;
	winningRule?: FolderRule;
	isException: boolean;
} {
	const norm = normalizeFolderPath(targetPath);
	if (!norm) {
		return { visible: true, isException: false };
	}

	if (isDotOrConfigPath(norm, ctx.configDir, ctx.hideDotFolders)) {
		return { visible: false, isException: false };
	}

	const baseVisible = ctx.scanMode === "include-all";
	const winningRule = findWinningRule(norm, ctx.folderRules);

	if (!winningRule) {
		return { visible: baseVisible, isException: false };
	}

	const visible = winningRule.action === "include";
	const isException =
		visible &&
		ctx.folderRules.some(
			(r) =>
				r.id !== winningRule.id &&
				r.action === "exclude" &&
				doesRuleMatchPath(r, norm),
		);

	return {
		visible,
		winningRule,
		isException,
	};
}

export function migratePathOnRename(
	existingPath: string,
	oldPath: string,
	newPath: string,
): string {
	const normExisting = normalizeFolderPath(existingPath);
	const normOld = normalizeFolderPath(oldPath);
	const normNew = normalizeFolderPath(newPath);
	if (!normExisting || !normOld) return existingPath;

	if (normExisting === normOld) {
		return normNew;
	}
	if (normExisting.startsWith(`${normOld}/`)) {
		return `${normNew}${normExisting.slice(normOld.length)}`;
	}
	return existingPath;
}

export class FolderEngine {
	constructor(
		private app: App,
		private store: SettingsStore,
	) {}

	getEvaluationContext(
		overrideRules?: FolderRule[],
		overrideScanMode?: ScanMode,
	): RuleEvaluationContext {
		const { settings } = this.store;
		return {
			scanMode: overrideScanMode ?? settings.scanMode,
			hideDotFolders: settings.hideDotFolders,
			configDir: this.app.vault.configDir,
			folderRules: overrideRules ?? settings.folderRules,
		};
	}

	getEffectiveRootFolder(): TFolder {
		const rawRoot = normalizeFolderPath(this.store.settings.rootFolder);
		if (rawRoot) {
			const folder = this.app.vault.getFolderByPath(normalizePath(rawRoot));
			if (folder) return folder;
		}
		return this.app.vault.getRoot();
	}

	getFolderByPath(folderPath: string): TFolder | null {
		const norm = normalizeFolderPath(folderPath);
		if (!norm) {
			return this.getEffectiveRootFolder();
		}
		return this.app.vault.getFolderByPath(normalizePath(norm));
	}

	isFolderVisible(
		folderPath: string,
		ctx = this.getEvaluationContext(),
	): boolean {
		return evaluateFolderVisibility(folderPath, ctx).visible;
	}

	private hasVisibleDescendant(
		folder: TFolder,
		ctx: RuleEvaluationContext,
	): boolean {
		for (const child of folder.children) {
			if (child instanceof TFolder) {
				if (evaluateFolderVisibility(child.path, ctx).visible) {
					return true;
				}
				if (this.hasVisibleDescendant(child, ctx)) {
					return true;
				}
			}
		}
		return false;
	}

	getDirectNoteCount(folder: TFolder): number {
		let count = 0;
		for (const child of folder.children) {
			if (child instanceof TFile && child.extension === "md") {
				count++;
			}
		}
		return count;
	}

	/**
	 * Collects visible child folders for a given parent folder.
	 * - If a direct child folder is hidden ONLY by a 'folder-only' rule, its visible
	 *   children are promoted up so "keep what's inside visible" works seamlessly.
	 * - If an excluded folder contains a deeper 'include' exception, it remains
	 *   traversable so the user can reach the included subfolder.
	 */
	getVisibleSubfolders(
		parentFolder: TFolder,
		ctx = this.getEvaluationContext(),
	): TFolder[] {
		const results: TFolder[] = [];
		const hideEmpty = this.store.settings.hideEmptyFolders;

		const collectFrom = (container: TFolder): void => {
			for (const child of container.children) {
				if (!(child instanceof TFolder)) continue;
				if (
					isDotOrConfigPath(
						child.path,
						ctx.configDir,
						ctx.hideDotFolders,
					)
				) {
					continue;
				}

				const evalResult = evaluateFolderVisibility(child.path, ctx);
				if (evalResult.visible) {
					if (hideEmpty && this.isFolderCompletelyEmpty(child, ctx)) {
						continue;
					}
					results.push(child);
				} else if (
					evalResult.winningRule?.scope === "folder-only" &&
					evalResult.winningRule.action === "exclude"
				) {
					// Folder itself is hidden, but keep what is inside visible
					collectFrom(child);
				} else if (this.hasVisibleDescendant(child, ctx)) {
					// Excluded folder has an explicit deeper included exception
					results.push(child);
				}
			}
		};

		collectFrom(parentFolder);
		results.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
		return results;
	}

	private isFolderCompletelyEmpty(
		folder: TFolder,
		ctx: RuleEvaluationContext,
	): boolean {
		if (this.getDirectNoteCount(folder) > 0) return false;
		for (const child of folder.children) {
			if (child instanceof TFolder) {
				if (
					evaluateFolderVisibility(child.path, ctx).visible &&
					!this.isFolderCompletelyEmpty(child, ctx)
				) {
					return false;
				}
			}
		}
		return true;
	}

	getCardItemsForFolder(folder: TFolder): FolderCardItem[] {
		const ctx = this.getEvaluationContext();
		const subfolders = this.getVisibleSubfolders(folder, ctx);
		const metadataMap = this.store.settings.folderMetadata;
		const parentNorm = normalizeFolderPath(folder.path);

		return subfolders.map((sub) => {
			const normPath = normalizeFolderPath(sub.path);
			const meta = metadataMap[normPath];
			const childSubfolders = this.getVisibleSubfolders(sub, ctx);
			const noteCount = this.getDirectNoteCount(sub);

			let displayName = sub.name;
			if (parentNorm && normPath.startsWith(`${parentNorm}/`)) {
				const rel = normPath.slice(parentNorm.length + 1);
				if (rel.includes("/")) {
					displayName = rel.split("/").join(" › ");
				}
			} else if (!parentNorm && normPath.includes("/")) {
				displayName = normPath.split("/").join(" › ");
			}

			return {
				path: normPath,
				name: displayName,
				displayPath: normPath.split("/").join(" › "),
				visibleSubfolderCount: childSubfolders.length,
				noteCount,
				icon: meta?.icon,
				description: meta?.description,
			};
		});
	}

	/**
	 * Scans visible domain or subdomain folders at `parentRelativePath` across all visible
	 * top-level Categories so the user can drill down `Domain -> Subdomain -> ... -> Category`.
	 */
	getDomainItems(
		parentRelativePath = "",
		ctx = this.getEvaluationContext(),
	): DomainCardItem[] {
		const root = this.getEffectiveRootFolder();
		const categories = this.getVisibleSubfolders(root, ctx);
		const grouped = new Map<
			string,
			{ item: DomainCardItem; childNames: Set<string> }
		>();
		const relSegments = normalizeFolderPath(parentRelativePath)
			.split("/")
			.filter(Boolean);

		for (const cat of categories) {
			const catNorm = normalizeFolderPath(cat.path);
			const baseFolder = this.resolveRelativeVisibleSubfolder(
				cat,
				relSegments,
				ctx,
			);
			if (!baseFolder) continue;

			const children = this.getVisibleSubfolders(baseFolder, ctx);
			for (const child of children) {
				const childNorm = normalizeFolderPath(child.path);
				const grandChildren = this.getVisibleSubfolders(child, ctx);
				const noteCount = this.getDirectNoteCount(child);
				const key = child.name.toLowerCase();
				const nextRelPath = relSegments.length
					? `${relSegments.join("/")}/${child.name}`
					: child.name;

				let entry = grouped.get(key);
				if (!entry) {
					entry = {
						item: {
							domainName: child.name,
							relativePath: nextRelPath,
							parents: [],
							totalVisibleSubfolders: 0,
							totalNotes: 0,
						},
						childNames: new Set<string>(),
					};
					grouped.set(key, entry);
				}

				entry.item.parents.push({
					categoryName: cat.name,
					categoryPath: catNorm,
					domainFolderPath: childNorm,
					visibleSubfolderCount: grandChildren.length,
					noteCount,
				});
				for (const gc of grandChildren) {
					entry.childNames.add(gc.name.toLowerCase());
				}
				entry.item.totalVisibleSubfolders = entry.childNames.size;
				entry.item.totalNotes += noteCount;
			}
		}

		const items = Array.from(grouped.values()).map((e) => e.item);
		items.sort((a, b) =>
			a.domainName.localeCompare(b.domainName, undefined, {
				numeric: true,
			}),
		);
		return items;
	}

	/**
	 * Resolves all visible top-level Categories that contain `domainRelativePath`
	 * (`<Category>/<Domain>/<Subdomain>/...`).
	 */
	getCategoriesForDomainPath(
		domainRelativePath: string,
		ctx = this.getEvaluationContext(),
	): DomainParentMatch[] {
		const root = this.getEffectiveRootFolder();
		const categories = this.getVisibleSubfolders(root, ctx);
		const relSegments = normalizeFolderPath(domainRelativePath)
			.split("/")
			.filter(Boolean);
		if (relSegments.length === 0) return [];

		const matches: DomainParentMatch[] = [];
		for (const cat of categories) {
			const target = this.resolveRelativeVisibleSubfolder(
				cat,
				relSegments,
				ctx,
			);
			if (!target) continue;
			const childSubfolders = this.getVisibleSubfolders(target, ctx);
			const noteCount = this.getDirectNoteCount(target);
			matches.push({
				categoryName: cat.name,
				categoryPath: normalizeFolderPath(cat.path),
				domainFolderPath: normalizeFolderPath(target.path),
				visibleSubfolderCount: childSubfolders.length,
				noteCount,
			});
		}
		matches.sort((a, b) =>
			a.categoryName.localeCompare(b.categoryName, undefined, {
				numeric: true,
			}),
		);
		return matches;
	}

	private resolveRelativeVisibleSubfolder(
		startFolder: TFolder,
		relSegments: string[],
		ctx: RuleEvaluationContext,
	): TFolder | null {
		let current: TFolder = startFolder;
		for (const seg of relSegments) {
			const segLower = seg.toLowerCase();
			const children = this.getVisibleSubfolders(current, ctx);
			const found = children.find(
				(c) => c.name.toLowerCase() === segLower,
			);
			if (!found) return null;
			current = found;
		}
		return current;
	}


	getAllVisibleFolders(ctx = this.getEvaluationContext()): FolderCardItem[] {
		const root = this.getEffectiveRootFolder();
		const items: FolderCardItem[] = [];
		const metadataMap = this.store.settings.folderMetadata;

		const walk = (folder: TFolder): void => {
			for (const child of folder.children) {
				if (!(child instanceof TFolder)) continue;
				if (
					isDotOrConfigPath(
						child.path,
						ctx.configDir,
						ctx.hideDotFolders,
					)
				) {
					continue;
				}
				const evalResult = evaluateFolderVisibility(child.path, ctx);
				if (evalResult.visible) {
					const normPath = normalizeFolderPath(child.path);
					const meta = metadataMap[normPath];
					const visibleSubs = this.getVisibleSubfolders(child, ctx);
					const noteCount = this.getDirectNoteCount(child);
					if (
						!this.store.settings.hideEmptyFolders ||
						visibleSubs.length > 0 ||
						noteCount > 0
					) {
						items.push({
							path: normPath,
							name: child.name,
							displayPath: normPath.split("/").join(" › "),
							visibleSubfolderCount: visibleSubs.length,
							noteCount,
							icon: meta?.icon,
							description: meta?.description,
						});
					}
				}
				walk(child);
			}
		};

		walk(root);
		items.sort((a, b) =>
			a.displayPath.localeCompare(b.displayPath, undefined, {
				numeric: true,
			}),
		);
		return items;
	}

	searchQuickJump(query: string): FolderCardItem[] {
		const trimmed = query.trim();
		if (!trimmed) return [];
		const all = this.getAllVisibleFolders();
		const fuzzy = prepareFuzzySearch(trimmed);

		const scored: Array<{ item: FolderCardItem; score: number }> = [];
		for (const item of all) {
			const matchDisplay = fuzzy(item.displayPath);
			const matchPath = fuzzy(item.path);
			const best =
				matchDisplay && matchPath
					? matchDisplay.score >= matchPath.score
						? matchDisplay
						: matchPath
					: (matchDisplay ?? matchPath);
			if (best) {
				scored.push({ item, score: best.score });
			}
		}

		scored.sort((a, b) => b.score - a.score);
		return scored.slice(0, 12).map((s) => s.item);
	}

	buildVaultTreeNodes(
		overrideRules?: FolderRule[],
		overrideScanMode?: ScanMode,
	): { nodes: TreeFolderNode[]; hiddenCount: number; totalCount: number } {
		const ctx = this.getEvaluationContext(overrideRules, overrideScanMode);
		const root = this.getEffectiveRootFolder();
		let hiddenCount = 0;
		let totalCount = 0;

		const buildNode = (folder: TFolder, depth: number): TreeFolderNode | null => {
			if (
				isDotOrConfigPath(
					folder.path,
					ctx.configDir,
					ctx.hideDotFolders,
				)
			) {
				return null;
			}
			totalCount++;
			const normPath = normalizeFolderPath(folder.path);
			const evalRes = evaluateFolderVisibility(normPath, ctx);
			if (!evalRes.visible) {
				hiddenCount++;
			}

			let statusLabel: "" | "hidden" | "included (exception)" = "";
			if (!evalRes.visible) {
				statusLabel = "hidden";
			} else if (evalRes.isException) {
				statusLabel = "included (exception)";
			}

			const children: TreeFolderNode[] = [];
			const subFolders = folder.children
				.filter((c): c is TFolder => c instanceof TFolder)
				.sort((a, b) =>
					a.name.localeCompare(b.name, undefined, { numeric: true }),
				);

			for (const sub of subFolders) {
				const childNode = buildNode(sub, depth + 1);
				if (childNode) {
					children.push(childNode);
				}
			}

			const directRule = ctx.folderRules.find(
				(r) => normalizeFolderPath(r.path) === normPath,
			);

			return {
				path: normPath,
				name: folder.name,
				depth,
				visible: evalRes.visible,
				statusLabel,
				matchingRule: directRule,
				children,
			};
		};

		const topFolders = root.children
			.filter((c): c is TFolder => c instanceof TFolder)
			.sort((a, b) =>
				a.name.localeCompare(b.name, undefined, { numeric: true }),
			);

		const nodes: TreeFolderNode[] = [];
		for (const top of topFolders) {
			const node = buildNode(top, 0);
			if (node) nodes.push(node);
		}

		return { nodes, hiddenCount, totalCount };
	}

	async addOrUpdateRule(
		folderPath: string,
		action: RuleAction,
		scope: RuleScope,
	): Promise<FolderRule> {
		const norm = normalizeFolderPath(folderPath);
		const rules = [...this.store.settings.folderRules];
		const existingIdx = rules.findIndex(
			(r) => normalizeFolderPath(r.path) === norm && r.scope === scope,
		);
		const newRule: FolderRule = {
			id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			path: norm,
			action,
			scope,
		};

		if (existingIdx >= 0) {
			rules[existingIdx] = { ...rules[existingIdx]!, action, scope };
		} else {
			rules.push(newRule);
		}
		await this.store.update({ folderRules: rules });
		return newRule;
	}

	async removeRuleById(ruleId: string): Promise<void> {
		const rules = this.store.settings.folderRules.filter(
			(r) => r.id !== ruleId,
		);
		await this.store.update({ folderRules: rules });
	}

	async handleFolderRename(folder: TFolder, oldPath: string): Promise<void> {
		const newPath = normalizeFolderPath(folder.path);
		const normOld = normalizeFolderPath(oldPath);
		if (!normOld || normOld === newPath) return;

		const { settings } = this.store;
		let changed = false;

		const nextRules = settings.folderRules.map((rule) => {
			const migrated = migratePathOnRename(rule.path, normOld, newPath);
			if (migrated !== rule.path) {
				changed = true;
				return { ...rule, path: migrated };
			}
			return rule;
		});

		const nextLayouts: typeof settings.perFolderLayouts = {};
		for (const [key, val] of Object.entries(settings.perFolderLayouts)) {
			const migrated = migratePathOnRename(key, normOld, newPath);
			if (migrated !== key) changed = true;
			nextLayouts[migrated] = val;
		}

		const nextWording: typeof settings.perFolderWording = {};
		for (const [key, val] of Object.entries(settings.perFolderWording)) {
			const migrated = migratePathOnRename(key, normOld, newPath);
			if (migrated !== key) changed = true;
			nextWording[migrated] = { ...val, folderPath: migrated };
		}

		const nextMeta: typeof settings.folderMetadata = {};
		for (const [key, val] of Object.entries(settings.folderMetadata)) {
			const migrated = migratePathOnRename(key, normOld, newPath);
			if (migrated !== key) changed = true;
			nextMeta[migrated] = { ...val, folderPath: migrated };
		}

		const nextPhrases = settings.phrases.map((phrase) => {
			if (!phrase.folderPath) return phrase;
			const migrated = migratePathOnRename(
				phrase.folderPath,
				normOld,
				newPath,
			);
			if (migrated !== phrase.folderPath) {
				changed = true;
				return { ...phrase, folderPath: migrated };
			}
			return phrase;
		});

		const nextLastVisited = migratePathOnRename(
			settings.lastVisitedFolder,
			normOld,
			newPath,
		);
		if (nextLastVisited !== settings.lastVisitedFolder) {
			changed = true;
		}

		if (changed) {
			await this.store.update({
				folderRules: nextRules,
				perFolderLayouts: nextLayouts,
				perFolderWording: nextWording,
				folderMetadata: nextMeta,
				phrases: nextPhrases,
				lastVisitedFolder: nextLastVisited,
			});
		}
	}
}
