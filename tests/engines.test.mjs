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

test("Direct notes filter only .md files and sort naturally", () => {
	const children = [
		{ name: "image.png", extension: "png" },
		{ name: "Beta Note.md", basename: "Beta Note", extension: "md", path: "Knowledge/Beta Note.md" },
		{ name: "Alpha Note.md", basename: "Alpha Note", extension: "md", path: "Knowledge/Alpha Note.md" },
		{ name: "Subfolder", children: [] },
	];
	const mdNotes = children
		.filter((c) => c.extension === "md")
		.map((c) => ({ path: c.path, basename: c.basename }))
		.sort((a, b) => a.basename.localeCompare(b.basename, undefined, { numeric: true }));

	assert.equal(mdNotes.length, 2);
	assert.equal(mdNotes[0].basename, "Alpha Note");
	assert.equal(mdNotes[1].basename, "Beta Note");
});

test("Domain notes aggregate matching categories with categoryName attached", () => {
	const categories = [
		{ name: "Knowledge", path: "Knowledge", notes: ["Electromagnetism", "Circuit Theory"] },
		{ name: "Projects", path: "Projects", notes: ["Electrical PCB Design"] },
	];

	const collected = [];
	for (const cat of categories) {
		for (const n of cat.notes) {
			collected.push({ basename: n, categoryName: cat.name });
		}
	}
	collected.sort((a, b) => a.basename.localeCompare(b.basename, undefined, { numeric: true }));

	assert.equal(collected.length, 3);
	assert.equal(collected[0].basename, "Circuit Theory");
	assert.equal(collected[0].categoryName, "Knowledge");
	assert.equal(collected[1].basename, "Electrical PCB Design");
	assert.equal(collected[1].categoryName, "Projects");
	assert.equal(collected[2].basename, "Electromagnetism");
	assert.equal(collected[2].categoryName, "Knowledge");
});

test("formatFolderCount only displays note counts when showExistingFiles is true", () => {
	function formatFolderCount(item, showExistingFiles) {
		if (item.visibleSubfolderCount > 0) {
			return `${item.visibleSubfolderCount} ${item.visibleSubfolderCount === 1 ? "folder" : "folders"}`;
		}
		if (showExistingFiles && item.noteCount > 0) {
			return `${item.noteCount} ${item.noteCount === 1 ? "note" : "notes"}`;
		}
		return "";
	}

	const leafFolderWithNotes = { visibleSubfolderCount: 0, noteCount: 3 };
	const subfolderParent = { visibleSubfolderCount: 2, noteCount: 5 };

	// When toggle is OFF:
	assert.equal(formatFolderCount(leafFolderWithNotes, false), "");
	assert.equal(formatFolderCount(subfolderParent, false), "2 folders");

	// When toggle is ON:
	assert.equal(formatFolderCount(leafFolderWithNotes, true), "3 notes");
	assert.equal(formatFolderCount(subfolderParent, true), "2 folders");
});

test("Search line visibility respects quickJumpSearch and showExistingFiles", () => {
	function shouldShowSearchLine(settings) {
		return Boolean(settings.quickJumpSearch || settings.showExistingFiles);
	}

	assert.equal(
		shouldShowSearchLine({ quickJumpSearch: false, showExistingFiles: false }),
		false,
	);
	assert.equal(
		shouldShowSearchLine({ quickJumpSearch: true, showExistingFiles: false }),
		true,
	);
	assert.equal(
		shouldShowSearchLine({ quickJumpSearch: false, showExistingFiles: true }),
		true,
	);
	assert.equal(
		shouldShowSearchLine({ quickJumpSearch: true, showExistingFiles: true }),
		true,
	);
});

test("Card action generation excludes files when showExistingFiles is false", () => {
	function buildActionCards({ folderCards, directNotes, showExistingFiles, query }) {
		const cards = [];
		const trimmed = query.trim().toLowerCase();
		const filteredCards = trimmed
			? folderCards.filter((c) => c.name.toLowerCase().includes(trimmed))
			: folderCards;
		for (const item of filteredCards) {
			cards.push({ kind: "folder", item });
		}
		if (showExistingFiles) {
			const filteredNotes = trimmed
				? directNotes.filter((n) => n.basename.toLowerCase().includes(trimmed))
				: directNotes;
			for (const note of filteredNotes) {
				cards.push({ kind: "file", note });
			}
		}
		return cards;
	}

	const folders = [{ name: "Physics" }, { name: "Chemistry" }];
	const notes = [{ basename: "Formula Sheet" }, { basename: "Lab Notes" }];

	// With query and toggle OFF:
	const resOff = buildActionCards({
		folderCards: folders,
		directNotes: notes,
		showExistingFiles: false,
		query: "Notes",
	});
	assert.equal(resOff.some((c) => c.kind === "file"), false);
	assert.equal(resOff.length, 0);

	// With query and toggle ON:
	const resOn = buildActionCards({
		folderCards: folders,
		directNotes: notes,
		showExistingFiles: true,
		query: "Notes",
	});
	assert.equal(resOn.some((c) => c.kind === "file"), true);
	assert.equal(resOn.length, 1);
	assert.equal(resOn[0].note.basename, "Lab Notes");
});

test("Global vs current-level file search finds notes like linear algebra across folders", () => {
	const allVaultNotes = [
		{ basename: "Linear Algebra", path: "Knowledge/Math/Linear Algebra.md", folderDisplayPath: "Knowledge › Math" },
		{ basename: "Algebra Basics", path: "Knowledge/Math/Algebra Basics.md", folderDisplayPath: "Knowledge › Math" },
		{ basename: "Meeting Notes", path: "Daily/Meeting Notes.md", folderDisplayPath: "Daily" },
		{ basename: "Circuit Analysis", path: "Knowledge/Physics/Circuit Analysis.md", folderDisplayPath: "Knowledge › Physics" },
	];

	function searchNotes({ allNotes, currentNotes, query, showExistingFiles, searchFilesGlobally }) {
		if (!showExistingFiles) return [];
		const trimmed = query.trim().toLowerCase();
		if (!trimmed) return currentNotes;
		const pool = searchFilesGlobally ? allNotes : currentNotes;
		return pool.filter((n) => n.basename.toLowerCase().includes(trimmed));
	}

	const currentLevelNotes = [
		{ basename: "Meeting Notes", path: "Daily/Meeting Notes.md", folderDisplayPath: "Daily" },
	];

	// 1. Searching for "linear algebra" globally:
	const globalMatches = searchNotes({
		allNotes: allVaultNotes,
		currentNotes: currentLevelNotes,
		query: "linear algebra",
		showExistingFiles: true,
		searchFilesGlobally: true,
	});
	assert.equal(globalMatches.length, 1);
	assert.equal(globalMatches[0].basename, "Linear Algebra");
	assert.equal(globalMatches[0].folderDisplayPath, "Knowledge › Math");

	// 2. Searching for "linear algebra" with global search OFF (only current level Daily):
	const localMatches = searchNotes({
		allNotes: allVaultNotes,
		currentNotes: currentLevelNotes,
		query: "linear algebra",
		showExistingFiles: true,
		searchFilesGlobally: false,
	});
	assert.equal(localMatches.length, 0);

	// 3. Searching with showExistingFiles OFF:
	const offMatches = searchNotes({
		allNotes: allVaultNotes,
		currentNotes: currentLevelNotes,
		query: "linear algebra",
		showExistingFiles: false,
		searchFilesGlobally: true,
	});
	assert.equal(offMatches.length, 0);
});

test("showSearchDropdown toggle enables or disables quickjump dropdown popup", () => {
	function shouldShowDropdown({ quickJumpSearch, showSearchDropdown, query, mode }) {
		return Boolean(
			quickJumpSearch &&
			showSearchDropdown &&
			query.trim().length > 0 &&
			mode === "category",
		);
	}

	// Default: showSearchDropdown is false, so no dropdown popup (only grid filtering)
	assert.equal(
		shouldShowDropdown({
			quickJumpSearch: true,
			showSearchDropdown: false,
			query: "math",
			mode: "category",
		}),
		false,
	);

	// When user toggles showSearchDropdown to ON: dropdown popup shows
	assert.equal(
		shouldShowDropdown({
			quickJumpSearch: true,
			showSearchDropdown: true,
			query: "math",
			mode: "category",
		}),
		true,
	);
});

test("Dashboard cards stay fixed when showSearchDropdown is true, and filter in-grid when false", () => {
	function getEffectiveFilter({ query, showSearchDropdown }) {
		return showSearchDropdown ? "" : query.trim().toLowerCase();
	}

	const allDashboardFolders = [
		{ name: "Knowledge" },
		{ name: "Projects" },
		{ name: "Archive" },
	];

	// 1. Dropdown ON: typing "knowledge" keeps dashboard cards FIXED (all 3 cards remain)
	const queryOn = "knowledge";
	const effectiveOn = getEffectiveFilter({ query: queryOn, showSearchDropdown: true });
	const dashboardCardsOn = effectiveOn
		? allDashboardFolders.filter((c) => c.name.toLowerCase().includes(effectiveOn))
		: allDashboardFolders;
	assert.equal(dashboardCardsOn.length, 3);
	assert.equal(dashboardCardsOn[0].name, "Knowledge");
	assert.equal(dashboardCardsOn[1].name, "Projects");
	assert.equal(dashboardCardsOn[2].name, "Archive");

	// 2. Dropdown OFF: typing "knowledge" filters dashboard cards directly to 1 card
	const effectiveOff = getEffectiveFilter({ query: queryOn, showSearchDropdown: false });
	const dashboardCardsOff = effectiveOff
		? allDashboardFolders.filter((c) => c.name.toLowerCase().includes(effectiveOff))
		: allDashboardFolders;
	assert.equal(dashboardCardsOff.length, 1);
	assert.equal(dashboardCardsOff[0].name, "Knowledge");
});

test("Smart search relevance: typing 're' matches 'Resources' and 'read', and does NOT match unrelated words like 'earl'", () => {
	function scoreSearchMatch(rawQuery, name, path = "") {
		const q = rawQuery.trim().toLowerCase();
		if (!q) return { matched: false, score: 0 };

		const nameLower = name.toLowerCase();
		const pathLower = path.toLowerCase();

		if (nameLower === q) {
			return { matched: true, score: 10000 };
		}
		if (nameLower.startsWith(q)) {
			return { matched: true, score: 5000 + Math.max(0, 50 - name.length) };
		}
		const words = nameLower.split(/[\s\-_.\\/]+/);
		for (const w of words) {
			if (w.startsWith(q)) {
				return { matched: true, score: 3500 + Math.max(0, 50 - name.length) };
			}
		}
		const nameIdx = nameLower.indexOf(q);
		if (nameIdx !== -1) {
			return { matched: true, score: 2000 - nameIdx + Math.max(0, 50 - name.length) };
		}
		if (q.length >= 2 && words.length >= q.length) {
			const initials = words.map((w) => w[0] || "").join("");
			if (initials.startsWith(q)) {
				return { matched: true, score: 1800 };
			}
		}
		if (pathLower) {
			if (q.includes("/") && pathLower.includes(q)) {
				return { matched: true, score: 1500 };
			}
			const pathSegments = pathLower.split(/[\s/›\-_.]+/);
			for (const seg of pathSegments) {
				if (seg.startsWith(q)) {
					return { matched: true, score: 800 };
				}
			}
			if (pathLower.includes(q)) {
				return { matched: true, score: 400 };
			}
		}
		if (q.length >= 3) {
			let qIdx = 0;
			let consecutive = 0;
			let maxConsecutive = 0;
			let firstMatchIdx = -1;
			for (let i = 0; i < nameLower.length; i++) {
				if (nameLower[i] === q[qIdx]) {
					if (firstMatchIdx === -1) firstMatchIdx = i;
					qIdx++;
					consecutive++;
					if (consecutive > maxConsecutive) maxConsecutive = consecutive;
					if (qIdx === q.length) break;
				} else {
					consecutive = 0;
				}
			}
			if (qIdx === q.length && maxConsecutive >= 2) {
				return { matched: true, score: 200 + maxConsecutive * 20 - firstMatchIdx };
			}
		}
		return { matched: false, score: 0 };
	}

	const candidates = [
		{ name: "Resources", path: "Resources" },
		{ name: "read", path: "Archive/2022/read" },
		{ name: "Reference", path: "Templates/Reference" },
		{ name: "Dev Issue report", path: "Projects/Client A/Dev Issue report" },
		{ name: "earl", path: "Archive/2022/earl" },
		{ name: "Classical mechanics", path: "Knowledge/Physics/Classical mechanics" },
		{ name: "Laser principle", path: "Knowledge/Physics/Optics/Laser principle" },
		{ name: "Untitled", path: "Untitled" },
	];

	const results = candidates
		.map((c) => ({ ...c, match: scoreSearchMatch("re", c.name, c.path) }))
		.filter((c) => c.match.matched)
		.sort((a, b) => b.match.score - a.match.score);

	// "Resources", "read", "Reference" should match with high scores (prefix match >= 5000)
	assert.ok(results.some((r) => r.name === "Resources"));
	assert.ok(results.some((r) => r.name === "read"));
	assert.ok(results.some((r) => r.name === "Reference"));
	assert.ok(results.some((r) => r.name === "Dev Issue report")); // "report" starts with "re"

	// "earl", "Classical mechanics", "Untitled" must NOT match!
	assert.equal(results.some((r) => r.name === "earl"), false);
	assert.equal(results.some((r) => r.name === "Classical mechanics"), false);
	assert.equal(results.some((r) => r.name === "Untitled"), false);

	// Prefix matches must rank highest
	assert.equal(results[0].name === "read" || results[0].name === "Resources", true);
});

test("Topic search: searching 'physics' matches 'Physics' folder, and notes only match by note name (not parent folder)", () => {
	function scoreSearchMatch(rawQuery, name, path = "") {
		const q = rawQuery.trim().toLowerCase();
		if (!q) return { matched: false, score: 0 };

		const nameLower = name.toLowerCase();
		const pathLower = path.toLowerCase();

		if (nameLower === q) {
			return { matched: true, score: 10000 };
		}
		if (nameLower.startsWith(q)) {
			return { matched: true, score: 5000 + Math.max(0, 50 - name.length) };
		}
		const words = nameLower.split(/[\s\-_.\\/]+/);
		for (const w of words) {
			if (w.startsWith(q)) {
				return { matched: true, score: 3500 + Math.max(0, 50 - name.length) };
			}
		}
		const nameIdx = nameLower.indexOf(q);
		if (nameIdx !== -1) {
			return { matched: true, score: 2000 - nameIdx + Math.max(0, 50 - name.length) };
		}
		if (q.length >= 2 && words.length >= q.length) {
			const initials = words.map((w) => w[0] || "").join("");
			if (initials.startsWith(q)) {
				return { matched: true, score: 1800 };
			}
		}
		if (pathLower && (q.includes("/") || q.includes("›") || q.includes(">"))) {
			const normQ = q.replace(/\s*[›>]\s*/g, "/");
			const normPath = pathLower.replace(/\s*[›>]\s*/g, "/");
			if (normPath.includes(normQ)) {
				return { matched: true, score: 2500 };
			}
		}
		return { matched: false, score: 0 };
	}

	const folders = [
		{ name: "Physics", path: "Knowledge/Physics", displayPath: "Knowledge › Physics" },
		{ name: "Fibre", path: "Knowledge/Physics/Fibre", displayPath: "Knowledge › Physics › Fibre" },
		{ name: "Optics", path: "Knowledge/Physics/Optics", displayPath: "Knowledge › Physics › Optics" },
	];
	const notes = [
		{ basename: "Physics Overview", folderDisplayPath: "Knowledge › Physics" },
		{ basename: "Classical mechanics", folderDisplayPath: "Knowledge › Physics" },
		{ basename: "Laser principle", folderDisplayPath: "Knowledge › Physics › Optics" },
	];

	// Single term search "physics": ONLY folder "Physics" matches. Child folders Fibre & Optics do NOT match!
	const folderMatches = folders
		.map((f) => ({ ...f, match: scoreSearchMatch("physics", f.name, f.displayPath) }))
		.filter((f) => f.match.matched);
	assert.equal(folderMatches.length, 1);
	assert.equal(folderMatches[0].name, "Physics");
	assert.equal(folderMatches.some((f) => f.name === "Fibre"), false);
	assert.equal(folderMatches.some((f) => f.name === "Optics"), false);

	// Explicit path search "physics/optics": child folder Optics matches!
	const pathMatches = folders
		.map((f) => ({ ...f, match: scoreSearchMatch("physics/optics", f.name, f.displayPath) }))
		.filter((f) => f.match.matched);
	assert.equal(pathMatches.length, 1);
	assert.equal(pathMatches[0].name, "Optics");

	// Note search strictly matches basename: only "Physics Overview" matches
	const noteMatches = notes
		.map((n) => ({ ...n, match: scoreSearchMatch("physics", n.basename) }))
		.filter((n) => n.match.matched);

	assert.equal(noteMatches.length, 1);
	assert.equal(noteMatches[0].basename, "Physics Overview");
	assert.equal(noteMatches.some((n) => n.basename === "Classical mechanics"), false);
	assert.equal(noteMatches.some((n) => n.basename === "Laser principle"), false);
});
