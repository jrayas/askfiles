import { App, normalizePath, TFile, TFolder } from "obsidian";
import { normalizeFolderPath, SettingsStore } from "../settings/store";

const ILLEGAL_FILENAME_CHARS_REGEX = /[\\/:*?"<>|]/g;

export interface NoteNameValidation {
	valid: boolean;
	empty: boolean;
	hasIllegalChars: boolean;
	suggestedSafeName: string;
	duplicateExists: boolean;
	existingFile: TFile | null;
	targetFolderMissing: boolean;
}

export function sanitizeNoteName(rawName: string): string {
	const replaced = rawName
		.replace(/\s*[\\/:]+\s*/g, " - ")
		.replace(/[*?"<>|]+/g, "")
		.replace(/\s+/g, " ")
		.trim();
	return replaced.replace(/^\.+|\.+$/g, "").trim();
}

export function hasIllegalFilenameChars(rawName: string): boolean {
	return ILLEGAL_FILENAME_CHARS_REGEX.test(rawName);
}

export class NoteCreator {
	constructor(
		private app: App,
		private store: SettingsStore,
	) {}

	validateNoteName(
		folderPath: string,
		rawName: string,
	): NoteNameValidation {
		const trimmed = rawName.trim();
		const normFolder = normalizeFolderPath(folderPath);
		const folder = normFolder
			? this.app.vault.getFolderByPath(normalizePath(normFolder))
			: this.app.vault.getRoot();

		const targetFolderMissing = folder === null;

		if (!trimmed) {
			return {
				valid: false,
				empty: true,
				hasIllegalChars: false,
				suggestedSafeName: "",
				duplicateExists: false,
				existingFile: null,
				targetFolderMissing,
			};
		}

		const illegal = hasIllegalFilenameChars(trimmed);
		const suggestedSafeName = illegal
			? sanitizeNoteName(trimmed)
			: trimmed;

		let existingFile: TFile | null = null;
		if (!illegal && !targetFolderMissing) {
			const cleanTitle = trimmed.replace(/\.md$/i, "");
			const candidatePath = normFolder
				? normalizePath(`${normFolder}/${cleanTitle}.md`)
				: normalizePath(`${cleanTitle}.md`);
			existingFile = this.app.vault.getFileByPath(candidatePath);
		}

		return {
			valid: !illegal && !existingFile && !targetFolderMissing,
			empty: false,
			hasIllegalChars: illegal,
			suggestedSafeName,
			duplicateExists: existingFile !== null,
			existingFile,
			targetFolderMissing,
		};
	}

	async createSubfolder(
		parentFolderPath: string,
		rawFolderName: string,
	): Promise<TFolder> {
		if (this.store.settings.lockFolderCreation) {
			throw new Error("Folder creation is locked.");
		}
		const cleanName = sanitizeNoteName(rawFolderName);
		if (!cleanName) {
			throw new Error("Please enter a valid folder name.");
		}
		const normParent = normalizeFolderPath(parentFolderPath);
		const fullPath = normParent
			? normalizePath(`${normParent}/${cleanName}`)
			: normalizePath(cleanName);

		const existing = this.app.vault.getFolderByPath(fullPath);
		if (existing) {
			return existing;
		}
		return await this.app.vault.createFolder(fullPath);
	}

	private async loadTemplateContent(noteTypeName: string): Promise<string> {
		if (!noteTypeName) return "";
		const { settings } = this.store;
		const typeConfig = settings.noteTypes.find(
			(t) => t.name.toLowerCase() === noteTypeName.toLowerCase(),
		);
		if (!typeConfig || !typeConfig.templatePath.trim()) {
			return "";
		}

		const rawPath = typeConfig.templatePath.trim();
		const candidates = [
			normalizePath(rawPath),
			normalizePath(rawPath.endsWith(".md") ? rawPath : `${rawPath}.md`),
		];
		if (
			settings.templateFolder.trim() &&
			!rawPath.startsWith(settings.templateFolder.trim())
		) {
			const tf = normalizeFolderPath(settings.templateFolder);
			candidates.push(
				normalizePath(`${tf}/${rawPath}`),
				normalizePath(
					`${tf}/${rawPath.endsWith(".md") ? rawPath : `${rawPath}.md`}`,
				),
			);
		}

		for (const candidate of candidates) {
			const file = this.app.vault.getFileByPath(candidate);
			if (file) {
				return await this.app.vault.cachedRead(file);
			}
		}
		return "";
	}

	/**
	 * Creates the markdown note in the target folder, applies template content if configured,
	 * and writes answered folder levels + note type to frontmatter properties.
	 */
	async createNote(params: {
		folderPath: string;
		noteTitle: string;
		noteType: string;
	}): Promise<TFile> {
		const { settings } = this.store;
		const normFolder = normalizeFolderPath(params.folderPath);
		const cleanTitle = params.noteTitle.trim().replace(/\.md$/i, "");
		const fullPath = normFolder
			? normalizePath(`${normFolder}/${cleanTitle}.md`)
			: normalizePath(`${cleanTitle}.md`);

		const templateBody = await this.loadTemplateContent(params.noteType);
		const file = await this.app.vault.create(fullPath, templateBody);

		if (settings.writeProperties) {
			const rootNorm = normalizeFolderPath(settings.rootFolder);
			let relativePath = normFolder;
			if (rootNorm && relativePath.startsWith(rootNorm)) {
				relativePath = normalizeFolderPath(
					relativePath.slice(rootNorm.length),
				);
			}

			const segments = relativePath
				? relativePath.split("/").filter(Boolean)
				: [];
			const propNames = settings.levelPropertyNames;

			if (segments.length > 0 || (settings.enableNoteTypes && params.noteType)) {
				await this.app.fileManager.processFrontMatter(
					file,
					(frontmatter: Record<string, unknown>) => {
						for (let i = 0; i < segments.length; i++) {
							const seg = segments[i];
							if (!seg) continue;
							const propKey =
								propNames[i]?.trim() || `level_${i + 1}`;
							frontmatter[propKey] = seg;
						}
						if (
							settings.enableNoteTypes &&
							params.noteType.trim() &&
							settings.typePropertyName.trim()
						) {
							frontmatter[settings.typePropertyName.trim()] =
								params.noteType.trim();
						}
					},
				);
			}
		}

		if (settings.rememberLastChoice) {
			await this.store.update({ lastVisitedFolder: normFolder });
		}

		return file;
	}
}
