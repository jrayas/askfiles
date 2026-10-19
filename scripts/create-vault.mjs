import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const vaultDir = path.join(rootDir, "dev", "testvault");

function ensureDir(dirPath) {
	fs.mkdirSync(dirPath, { recursive: true });
}

function writeNote(relPath, content) {
	const full = path.join(vaultDir, relPath);
	ensureDir(path.dirname(full));
	fs.writeFileSync(full, content, "utf8");
}

function buildTestVault() {
	const folders = [
		"Knowledge/Physics/Optics",
		"Knowledge/Maths",
		"Knowledge/Chemistry",
		"Knowledge/Biology",
		"Knowledge/Astronomy",
		"Knowledge/Geology",
		"Knowledge/Drafts",
		"Projects/Client A",
		"Projects/Client B",
		"Archive/2024",
		"Archive/2023",
		"Archive/2022",
		"Attachments",
		"Journal",
		"Areas",
		"Resources/Knowledge base",
		"Templates",
	];

	for (const f of folders) {
		ensureDir(path.join(vaultDir, f));
	}

	writeNote(
		"Templates/Reference.md",
		"## Summary\n\n## Key points\n\n## References\n",
	);
	writeNote(
		"Templates/Idea.md",
		"## Core idea\n\n## Why it matters\n\n## Next steps\n",
	);
	writeNote(
		"Templates/Meeting.md",
		"## Attendees\n\n## Agenda\n\n## Action items\n",
	);

	writeNote(
		"Knowledge/Physics/Classical mechanics.md",
		"---\ncategory: Knowledge\ndomain: Physics\ntype: Reference\n---\n# Classical mechanics\n",
	);
	writeNote(
		"Knowledge/Maths/Linear algebra.md",
		"---\ncategory: Knowledge\ndomain: Maths\ntype: Reference\n---\n# Linear algebra\n",
	);
	writeNote(
		"Journal/2026-10-19.md",
		"# Daily journal\n\nTesting Askfiles in an isolated vault.\n",
	);

	// Obsidian config & plugin installation
	const obsidianDir = path.join(vaultDir, ".obsidian");
	const pluginDir = path.join(obsidianDir, "plugins", "askfiles");
	ensureDir(pluginDir);

	fs.writeFileSync(
		path.join(obsidianDir, "community-plugins.json"),
		JSON.stringify(["askfiles"], null, 2) + "\n",
		"utf8",
	);

	fs.writeFileSync(
		path.join(obsidianDir, "app.json"),
		JSON.stringify({ alwaysUpdateLinks: true, nativeMenus: false }, null, 2) +
			"\n",
		"utf8",
	);

	for (const asset of ["main.js", "manifest.json", "styles.css"]) {
		const src = path.join(rootDir, asset);
		if (fs.existsSync(src)) {
			fs.copyFileSync(src, path.join(pluginDir, asset));
		}
	}

	console.log(`Test vault created at: ${vaultDir}`);
}

buildTestVault();
