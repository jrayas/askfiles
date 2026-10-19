import { createStarterPhrases } from "../constants";
import { normalizeFolderPath, SettingsStore } from "../settings/store";
import type {
	PhraseEntry,
	PhraseLevel,
	PhraseSelectionMode,
	ResolvedPhrase,
} from "../types";

export class PhraseEngine {
	constructor(private store: SettingsStore) {}

	/**
	 * Resolves the question title and description for a given wizard step.
	 * Priority:
	 * 1. Explicit per-folder wording override in settings.perFolderWording
	 * 2. Enabled phrases in settings.phrases matching the specific folderPath
	 * 3. Enabled phrases in settings.phrases matching the level ('top' | 'deeper' | 'naming')
	 * 4. Fallback default phrase for that level
	 */
	resolvePhraseForStep(
		level: PhraseLevel,
		folderPath = "",
		advanceRotate = true,
	): ResolvedPhrase {
		const normFolder = normalizeFolderPath(folderPath);
		const { settings } = this.store;

		// 1. Check per-folder wording overrides (for top or deeper folder steps)
		if (level !== "naming") {
			const override =
				settings.perFolderWording[normFolder] ??
				(level === "top" ? settings.perFolderWording["/"] : undefined);
			if (override && override.title.trim()) {
				return {
					title: override.title,
					description: override.description,
				};
			}
		}

		// 2. Check folder-specific phrases in the Phrase Library
		const allEnabled = settings.phrases.filter((p) => p.enabled);
		let pool = allEnabled.filter(
			(p) =>
				p.level === level &&
				normFolder &&
				p.folderPath &&
				normalizeFolderPath(p.folderPath) === normFolder,
		);

		// 3. Fallback to general level pool (phrases without a specific folder restriction)
		if (pool.length === 0) {
			pool = allEnabled.filter(
				(p) => p.level === level && !p.folderPath,
			);
		}

		// 4. Fallback to starter phrases if user disabled everything
		if (pool.length === 0) {
			pool = createStarterPhrases().filter((p) => p.level === level);
		}

		const layout = this.store.getEffectiveLayout(normFolder);
		const mode: PhraseSelectionMode = layout.phraseMode;
		const pairing = settings.phrasePairingMode;
		const counterKey = `${level}:${normFolder || "root"}`;

		const selectedEntry = this.pickFromPool(
			pool,
			mode,
			counterKey,
			advanceRotate,
		);

		if (pairing === "paired" || pool.length <= 1) {
			return {
				title: selectedEntry.title,
				description: selectedEntry.description,
			};
		}

		// Mixed mode: pick description independently
		const descEntry = this.pickFromPool(
			pool,
			mode === "fixed" ? "fixed" : "random",
			`${counterKey}:desc`,
			false,
		);
		return {
			title: selectedEntry.title,
			description: descEntry.description || selectedEntry.description,
		};
	}

	private pickFromPool(
		pool: PhraseEntry[],
		mode: PhraseSelectionMode,
		counterKey: string,
		advanceRotate: boolean,
	): PhraseEntry {
		if (pool.length === 1 || mode === "fixed") {
			return pool[0]!;
		}

		if (mode === "rotate") {
			const currentIdx =
				this.store.settings.rotateCounters[counterKey] ?? 0;
			const picked = pool[currentIdx % pool.length]!;
			if (advanceRotate) {
				this.store.settings.rotateCounters[counterKey] =
					(currentIdx + 1) % pool.length;
			}
			return picked;
		}

		// Random mode
		const randomIndex = Math.floor(Math.random() * pool.length);
		return pool[randomIndex]!;
	}

	async addPhrase(
		entry: Omit<PhraseEntry, "id">,
	): Promise<PhraseEntry> {
		const newEntry: PhraseEntry = {
			...entry,
			id: `phrase-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			folderPath: entry.folderPath
				? normalizeFolderPath(entry.folderPath)
				: undefined,
		};
		await this.store.update({
			phrases: [...this.store.settings.phrases, newEntry],
		});
		return newEntry;
	}

	async updatePhrase(
		id: string,
		patch: Partial<Omit<PhraseEntry, "id">>,
	): Promise<void> {
		const next = this.store.settings.phrases.map((p) =>
			p.id === id
				? {
						...p,
						...patch,
						folderPath:
							patch.folderPath !== undefined
								? normalizeFolderPath(patch.folderPath) ||
									undefined
								: p.folderPath,
					}
				: p,
		);
		await this.store.update({ phrases: next });
	}

	async deletePhrase(id: string): Promise<void> {
		const next = this.store.settings.phrases.filter((p) => p.id !== id);
		await this.store.update({ phrases: next });
	}

	async restoreStarterSet(): Promise<void> {
		await this.store.update({
			phrases: createStarterPhrases(),
			rotateCounters: {},
		});
	}

	exportLibraryJson(): string {
		return JSON.stringify(
			{
				version: 1,
				phrasePairingMode: this.store.settings.phrasePairingMode,
				phrases: this.store.settings.phrases,
				perFolderWording: this.store.settings.perFolderWording,
			},
			null,
			2,
		);
	}

	async importLibraryJson(jsonText: string): Promise<{ count: number }> {
		const parsed = JSON.parse(jsonText) as {
			phrasePairingMode?: "paired" | "mixed";
			phrases?: PhraseEntry[];
			perFolderWording?: Record<
				string,
				{ folderPath: string; title: string; description: string }
			>;
		};

		if (!parsed || !Array.isArray(parsed.phrases)) {
			throw new Error("Invalid phrase library JSON format.");
		}

		const validPhrases: PhraseEntry[] = parsed.phrases
			.filter(
				(p) =>
					p &&
					typeof p.title === "string" &&
					(p.level === "top" ||
						p.level === "deeper" ||
						p.level === "naming"),
			)
			.map((p, idx) => ({
				id: p.id || `imported-${Date.now()}-${idx}`,
				title: p.title.trim(),
				description:
					typeof p.description === "string"
						? p.description.trim()
						: "",
				level: p.level,
				enabled: p.enabled !== false,
				folderPath: p.folderPath
					? normalizeFolderPath(p.folderPath)
					: undefined,
			}));

		await this.store.update({
			phrases:
				validPhrases.length > 0
					? validPhrases
					: createStarterPhrases(),
			phrasePairingMode:
				parsed.phrasePairingMode === "mixed" ? "mixed" : "paired",
			perFolderWording:
				parsed.perFolderWording &&
				typeof parsed.perFolderWording === "object"
					? parsed.perFolderWording
					: this.store.settings.perFolderWording,
		});

		return { count: validPhrases.length };
	}
}
