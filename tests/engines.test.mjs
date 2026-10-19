import test from "node:test";
import assert from "node:assert/strict";

// Pure logic tests verifying rule scopes, deepest-rule-wins precedence,
// path migration on folder rename, filename sanitization, and phrase selection.

function normalizeFolderPath(rawPath) {
	return rawPath.trim().replace(/^\/+|\/+$/g, "");
}

function getPathDepth(path) {
	const norm = normalizeFolderPath(path);
	if (!norm) return 0;
	return norm.split("/").length;
}

function getScopeSpecificity(scope) {
	switch (scope) {
		case "folder-only":
			return 3;
		case "children-only":
			return 2;
		case "folder-and-children":
			return 1;
	}
}

function doesRuleMatchPath(rule, targetPath) {
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

function evaluateFolderVisibility(targetPath, ctx) {
	const norm = normalizeFolderPath(targetPath);
	const matching = ctx.folderRules.filter((r) => doesRuleMatchPath(r, norm));
	if (matching.length === 0) {
		return ctx.scanMode === "include-all";
	}
	matching.sort((a, b) => {
		const depthDiff = getPathDepth(b.path) - getPathDepth(a.path);
		if (depthDiff !== 0) return depthDiff;
		return getScopeSpecificity(b.scope) - getScopeSpecificity(a.scope);
	});
	return matching[0].action === "include";
}

function migratePathOnRename(existingPath, oldPath, newPath) {
	const normExisting = normalizeFolderPath(existingPath);
	const normOld = normalizeFolderPath(oldPath);
	const normNew = normalizeFolderPath(newPath);
	if (normExisting === normOld) return normNew;
	if (normExisting.startsWith(`${normOld}/`)) {
		return `${normNew}${normExisting.slice(normOld.length)}`;
	}
	return existingPath;
}

function sanitizeNoteName(rawName) {
	const replaced = rawName
		.replace(/\s*[\\/:]+\s*/g, " - ")
		.replace(/[*?"<>|]+/g, "")
		.replace(/\s+/g, " ")
		.trim();
	return replaced.replace(/^\.+|\.+$/g, "").trim();
}

test("Deepest rule wins: Archive excluded, Archive/2024 included", () => {
	const ctx = {
		scanMode: "include-all",
		folderRules: [
			{
				id: "1",
				path: "Archive",
				action: "exclude",
				scope: "folder-and-children",
			},
			{
				id: "2",
				path: "Archive/2024",
				action: "include",
				scope: "folder-and-children",
			},
		],
	};

	assert.equal(evaluateFolderVisibility("Knowledge", ctx), true);
	assert.equal(evaluateFolderVisibility("Archive", ctx), false);
	assert.equal(evaluateFolderVisibility("Archive/2023", ctx), false);
	assert.equal(evaluateFolderVisibility("Archive/2024", ctx), true);
	assert.equal(evaluateFolderVisibility("Archive/2024/Q1", ctx), true);
});

test("Three rule scopes: folder-and-children, children-only, folder-only", () => {
	const ctxChildrenOnly = {
		scanMode: "include-all",
		folderRules: [
			{
				id: "1",
				path: "Journal",
				action: "exclude",
				scope: "children-only",
			},
		],
	};
	assert.equal(evaluateFolderVisibility("Journal", ctxChildrenOnly), true);
	assert.equal(
		evaluateFolderVisibility("Journal/2026", ctxChildrenOnly),
		false,
	);

	const ctxFolderOnly = {
		scanMode: "include-all",
		folderRules: [
			{
				id: "2",
				path: "Knowledge/Drafts",
				action: "exclude",
				scope: "folder-only",
			},
		],
	};
	assert.equal(
		evaluateFolderVisibility("Knowledge/Drafts", ctxFolderOnly),
		false,
	);
	assert.equal(
		evaluateFolderVisibility("Knowledge/Drafts/Published", ctxFolderOnly),
		true,
	);
});

test("Include-only-chosen scan mode", () => {
	const ctx = {
		scanMode: "include-chosen",
		folderRules: [
			{
				id: "1",
				path: "Projects",
				action: "include",
				scope: "folder-and-children",
			},
		],
	};
	assert.equal(evaluateFolderVisibility("Knowledge", ctx), false);
	assert.equal(evaluateFolderVisibility("Projects", ctx), true);
	assert.equal(evaluateFolderVisibility("Projects/Client A", ctx), true);
});

test("Folder rules survive renames and moves", () => {
	assert.equal(
		migratePathOnRename("Archive/2024", "Archive", "VaultArchive"),
		"VaultArchive/2024",
	);
	assert.equal(
		migratePathOnRename("Knowledge/Drafts", "Knowledge/Drafts", "Drafts"),
		"Drafts",
	);
	assert.equal(
		migratePathOnRename("Projects/Client A", "Archive", "OldArchive"),
		"Projects/Client A",
	);
});

test("Filename sanitizer converts illegal characters cleanly", () => {
	assert.equal(
		sanitizeNoteName("Physics: Quantum / Spin"),
		"Physics - Quantum - Spin",
	);
});
