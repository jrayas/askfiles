import {
	createStarterNoteTypes,
	createStarterPhrases,
	DEFAULT_LAYOUT,
	DEFAULT_SETTINGS,
} from "../constants";
import type { AskfilesSettings, LayoutConfig } from "../types";

export type SettingsListener = (settings: AskfilesSettings) => void;

export function normalizeFolderPath(rawPath: string): string {
	const trimmed = rawPath.trim().replace(/^\/+|\/+$/g, "");
	return trimmed;
}

export function mergeSettings(
	raw: Partial<AskfilesSettings> | null | undefined,
): AskfilesSettings {
	const base: AskfilesSettings = {
		...DEFAULT_SETTINGS,
		globalLayout: { ...DEFAULT_LAYOUT },
		perFolderLayouts: {},
		folderMetadata: {},
		phrases: createStarterPhrases(),
		perFolderWording: {},
		rotateCounters: {},
		noteTypes: createStarterNoteTypes(),
		levelPropertyNames: [...DEFAULT_SETTINGS.levelPropertyNames],
		folderRules: [],
		shortcuts: { ...DEFAULT_SETTINGS.shortcuts },
	};

	if (!raw || typeof raw !== "object") {
		return base;
	}

	return {
		...base,
		...raw,
		globalLayout: {
			...DEFAULT_LAYOUT,
			...(raw.globalLayout ?? {}),
		},
		perFolderLayouts: { ...(raw.perFolderLayouts ?? {}) },
		folderMetadata: { ...(raw.folderMetadata ?? {}) },
		phrases:
			Array.isArray(raw.phrases) && raw.phrases.length > 0
				? raw.phrases.map((p) => ({ ...p }))
				: createStarterPhrases(),
		perFolderWording: { ...(raw.perFolderWording ?? {}) },
		rotateCounters: { ...(raw.rotateCounters ?? {}) },
		noteTypes:
			Array.isArray(raw.noteTypes) && raw.noteTypes.length > 0
				? raw.noteTypes.map((t) => ({ ...t }))
				: createStarterNoteTypes(),
		levelPropertyNames:
			Array.isArray(raw.levelPropertyNames) &&
			raw.levelPropertyNames.length > 0
				? [...raw.levelPropertyNames]
				: [...DEFAULT_SETTINGS.levelPropertyNames],
		folderRules: Array.isArray(raw.folderRules)
			? raw.folderRules.map((r) => ({
					...r,
					path: normalizeFolderPath(r.path),
				}))
			: [],
		shortcuts: {
			...DEFAULT_SETTINGS.shortcuts,
			...(raw.shortcuts ?? {}),
		},
	};
}

export class SettingsStore {
	private current: AskfilesSettings;
	private listeners = new Set<SettingsListener>();
	private saveCallback: (data: AskfilesSettings) => Promise<void>;

	constructor(
		initial: Partial<AskfilesSettings> | null | undefined,
		saveCallback: (data: AskfilesSettings) => Promise<void>,
	) {
		this.current = mergeSettings(initial);
		this.saveCallback = saveCallback;
	}

	get settings(): AskfilesSettings {
		return this.current;
	}

	subscribe(listener: SettingsListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	notify(): void {
		for (const listener of this.listeners) {
			listener(this.current);
		}
	}

	async save(): Promise<void> {
		await this.saveCallback(this.current);
		this.notify();
	}

	async update(patch: Partial<AskfilesSettings>): Promise<void> {
		this.current = {
			...this.current,
			...patch,
		};
		await this.save();
	}

	async reloadFromDisk(
		raw: Partial<AskfilesSettings> | null | undefined,
	): Promise<void> {
		this.current = mergeSettings(raw);
		this.notify();
	}

	getEffectiveLayout(folderPath: string): LayoutConfig {
		const norm = normalizeFolderPath(folderPath);
		const override = this.current.perFolderLayouts[norm];
		if (!override) {
			return { ...this.current.globalLayout };
		}
		return {
			...this.current.globalLayout,
			...override,
		};
	}

	hasFolderLayoutOverride(folderPath: string): boolean {
		const norm = normalizeFolderPath(folderPath);
		return Boolean(this.current.perFolderLayouts[norm]);
	}

	async setLayoutForFolder(
		folderPath: string,
		patch: Partial<LayoutConfig>,
	): Promise<void> {
		const norm = normalizeFolderPath(folderPath);
		const existing = this.current.perFolderLayouts[norm] ?? {};
		this.current.perFolderLayouts = {
			...this.current.perFolderLayouts,
			[norm]: {
				...existing,
				...patch,
			},
		};
		await this.save();
	}

	async setLayoutEverywhere(
		layout: Partial<LayoutConfig>,
		clearFolderOverrides = false,
	): Promise<void> {
		this.current.globalLayout = {
			...this.current.globalLayout,
			...layout,
		};
		if (clearFolderOverrides) {
			this.current.perFolderLayouts = {};
		}
		await this.save();
	}

	async resetViewLayout(folderPath?: string): Promise<void> {
		if (folderPath !== undefined) {
			const norm = normalizeFolderPath(folderPath);
			const next = { ...this.current.perFolderLayouts };
			delete next[norm];
			this.current.perFolderLayouts = next;
		}
		this.current.globalLayout = { ...DEFAULT_LAYOUT };
		await this.save();
	}

	async resetAllSettings(): Promise<void> {
		this.current = mergeSettings(null);
		await this.save();
	}
}
