import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const PORT = 9222;
const ROOT_DIR = process.cwd();
const TEMPLATE_VAULT = path.join(ROOT_DIR, "dev", "testvault");
const SCRATCH_ROOT = path.join(ROOT_DIR, "dev", "scratch");
const SCRATCH_VAULT = path.join(SCRATCH_ROOT, "vault");
const SCRATCH_PROFILE = path.join(SCRATCH_ROOT, "profile");
const PID_FILE = path.join(SCRATCH_ROOT, "obsidian.pid");

function getObsidianBinary() {
	if (process.env.OBSIDIAN_BIN) return process.env.OBSIDIAN_BIN;
	if (process.platform === "darwin") {
		return "/Applications/Obsidian.app/Contents/MacOS/Obsidian";
	}
	if (process.platform === "win32") {
		return path.join(
			process.env.LOCALAPPDATA || "",
			"Obsidian",
			"Obsidian.exe",
		);
	}
	return "obsidian";
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTargets() {
	const res = await fetch(`http://127.0.0.1:${PORT}/json`);
	if (!res.ok) {
		throw new Error(`HTTP ${res.status}`);
	}
	return await res.json();
}

async function getTargetWsUrl(windowKind = "main") {
	const targets = await fetchTargets();
	if (windowKind === "settings") {
		const settingsTarget = targets.find(
			(t) =>
				t.type === "page" &&
				typeof t.title === "string" &&
				t.title.startsWith("Settings"),
		);
		if (settingsTarget?.webSocketDebuggerUrl) {
			return settingsTarget.webSocketDebuggerUrl;
		}
	}
	const mainTarget = targets.find(
		(t) =>
			t.type === "page" &&
			typeof t.url === "string" &&
			t.url.startsWith("app://"),
	);
	if (!mainTarget?.webSocketDebuggerUrl) {
		throw new Error("No active Obsidian app:// page target found on CDP port.");
	}
	return mainTarget.webSocketDebuggerUrl;
}

async function withCdpSession(windowKind, fn) {
	const wsUrl = await getTargetWsUrl(windowKind);
	const ws = new WebSocket(wsUrl);
	let nextId = 1;
	const pending = new Map();
	const events = [];

	await new Promise((resolve, reject) => {
		ws.addEventListener("open", resolve, { once: true });
		ws.addEventListener("error", reject, { once: true });
	});

	ws.addEventListener("message", (event) => {
		const data = JSON.parse(String(event.data));
		if (data.id && pending.has(data.id)) {
			const { resolve, reject } = pending.get(data.id);
			pending.delete(data.id);
			if (data.error) {
				reject(new Error(data.error.message || JSON.stringify(data.error)));
			} else {
				resolve(data.result);
			}
		} else if (data.method) {
			events.push(data);
		}
	});

	const send = (method, params = {}) =>
		new Promise((resolve, reject) => {
			const id = nextId++;
			pending.set(id, { resolve, reject });
			ws.send(JSON.stringify({ id, method, params }));
		});

	try {
		return await fn({ send, events });
	} finally {
		ws.close();
	}
}

function copyDirRecursive(src, dest) {
	fs.mkdirSync(dest, { recursive: true });
	for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
		const srcPath = path.join(src, entry.name);
		const destPath = path.join(dest, entry.name);
		if (entry.isDirectory()) {
			copyDirRecursive(srcPath, destPath);
		} else {
			fs.copyFileSync(srcPath, destPath);
		}
	}
}

function syncReleaseAssetsToVault(vaultPath) {
	const pluginDir = path.join(vaultPath, ".obsidian", "plugins", "askfiles");
	fs.mkdirSync(pluginDir, { recursive: true });
	for (const file of ["main.js", "manifest.json", "styles.css"]) {
		const src = path.join(ROOT_DIR, file);
		if (!fs.existsSync(src)) {
			throw new Error(`Missing build asset: ${src}. Run npm run build first.`);
		}
		fs.copyFileSync(src, path.join(pluginDir, file));
	}
}

async function cmdStop() {
	if (fs.existsSync(PID_FILE)) {
		const pid = Number(fs.readFileSync(PID_FILE, "utf8").trim());
		if (pid > 0) {
			try {
				process.kill(pid, "SIGTERM");
			} catch {
				// Process already exited
			}
		}
		fs.rmSync(PID_FILE, { force: true });
	}

	for (let i = 0; i < 30; i++) {
		try {
			await fetchTargets();
			await sleep(200);
		} catch {
			console.log("Isolated Obsidian instance stopped and port 9222 is free.");
			return;
		}
	}
}

async function cmdTrust() {
	await withCdpSession("main", async ({ send }) => {
		await send("Runtime.enable");
		await send("Runtime.evaluate", {
			expression: `(async () => {
				const btns = Array.from(document.querySelectorAll('button'));
				const trustBtn = btns.find(b => /trust author and enable plugins|turn on community plugins/i.test(b.textContent || ''));
				if (trustBtn) {
					trustBtn.click();
					await new Promise(r => setTimeout(r, 400));
				}
				const closeBtn = document.querySelector('.modal-close-button');
				if (closeBtn && trustBtn) closeBtn.click();
				if (window.app && window.app.plugins && !window.app.plugins.plugins['askfiles']) {
					await window.app.plugins.enablePluginAndSave('askfiles');
				}
				return Boolean(window.app?.plugins?.plugins?.['askfiles']);
			})()`,
			awaitPromise: true,
			returnByValue: true,
		});
	});
}

async function cmdStatus() {
	const result = await withCdpSession("main", async ({ send }) => {
		await send("Runtime.enable");
		const res = await send("Runtime.evaluate", {
			expression: `(() => {
				const app = window.app;
				if (!app) return { loaded: false, reason: 'no app' };
				const plugin = app.plugins?.plugins?.['askfiles'];
				return {
					loaded: Boolean(plugin),
					restrictedMode: Boolean(app.plugins?.isEnabled && !app.plugins.isEnabled()),
					enabledPlugins: Array.from(app.plugins?.enabledPlugins || []),
					vaultName: app.vault?.getName?.() || '',
					folderCount: app.vault?.getAllFolders?.()?.length ?? 0
				};
			})()`,
			awaitPromise: true,
			returnByValue: true,
		});
		return res.result?.value;
	});
	console.log(JSON.stringify(result, null, 2));
	return result;
}

async function cmdLaunch(isReleaseOnly = false) {
	await cmdStop();

	if (!fs.existsSync(TEMPLATE_VAULT)) {
		await import("./create-vault.mjs");
	}

	fs.rmSync(SCRATCH_ROOT, { recursive: true, force: true });
	fs.mkdirSync(SCRATCH_VAULT, { recursive: true });
	fs.mkdirSync(SCRATCH_PROFILE, { recursive: true });

	copyDirRecursive(TEMPLATE_VAULT, SCRATCH_VAULT);
	if (isReleaseOnly) {
		const pluginDir = path.join(
			SCRATCH_VAULT,
			".obsidian",
			"plugins",
			"askfiles",
		);
		fs.rmSync(pluginDir, { recursive: true, force: true });
	}
	syncReleaseAssetsToVault(SCRATCH_VAULT);

	const obsidianJson = {
		vaults: {
			scratchaskfiles01: {
				path: SCRATCH_VAULT,
				ts: Date.now(),
				open: true,
			},
		},
	};
	fs.writeFileSync(
		path.join(SCRATCH_PROFILE, "obsidian.json"),
		JSON.stringify(obsidianJson, null, 2),
		"utf8",
	);

	const bin = getObsidianBinary();
	const child = spawn(
		bin,
		[
			`--remote-debugging-port=${PORT}`,
			"--remote-allow-origins=*",
			`--user-data-dir=${SCRATCH_PROFILE}`,
			"--disable-background-timer-throttling",
			"--disable-renderer-backgrounding",
			"--disable-backgrounding-occluded-windows",
		],
		{
			detached: true,
			stdio: "ignore",
		},
	);
	child.unref();
	fs.writeFileSync(PID_FILE, String(child.pid), "utf8");

	// Wait for CDP endpoint and app.workspace layout ready
	for (let attempt = 0; attempt < 50; attempt++) {
		try {
			await getTargetWsUrl("main");
			break;
		} catch {
			await sleep(250);
		}
	}

	await sleep(1200);
	await cmdTrust();
	await sleep(600);
	await cmdStatus();
}

async function cmdEval(jsCode, windowKind = "main") {
	const output = await withCdpSession(windowKind, async ({ send }) => {
		await send("Runtime.enable");
		const res = await send("Runtime.evaluate", {
			expression: jsCode,
			awaitPromise: true,
			returnByValue: true,
		});
		if (res.exceptionDetails) {
			throw new Error(
				res.exceptionDetails.exception?.description ||
					res.exceptionDetails.text,
			);
		}
		return res.result?.value;
	});
	console.log(
		typeof output === "string" ? output : JSON.stringify(output, null, 2),
	);
}

async function cmdReload() {
	syncReleaseAssetsToVault(SCRATCH_VAULT);
	const output = await withCdpSession("main", async ({ send, events }) => {
		await send("Runtime.enable");
		await send("Log.enable");
		await send("Runtime.evaluate", {
			expression: `(async () => {
				if (app.plugins.plugins['askfiles']) {
					await app.plugins.unloadPlugin('askfiles');
				}
				await app.plugins.loadPlugin('askfiles');
				return Boolean(app.plugins.plugins['askfiles']);
			})()`,
			awaitPromise: true,
			returnByValue: true,
		});
		await sleep(300);
		return {
			reloaded: true,
			logs: events
				.filter(
					(e) =>
						e.method === "Runtime.consoleAPICalled" ||
						e.method === "Runtime.exceptionThrown",
				)
				.map((e) => e.params),
		};
	});
	console.log(JSON.stringify(output, null, 2));
}

async function cmdScreenshot(outFile = "dev/scratch/screenshot.png", windowKind = "main", sizeArg = "") {
	await withCdpSession(windowKind, async ({ send }) => {
		await send("Page.enable");
		if (sizeArg && /^\d+x\d+$/.test(sizeArg)) {
			const [width, height] = sizeArg.split("x").map(Number);
			await send("Emulation.setDeviceMetricsOverride", {
				width,
				height,
				deviceScaleFactor: 2,
				mobile: width < 600,
			});
			await sleep(200);
		}
		const { data } = await send("Page.captureScreenshot", {
			format: "png",
		});
		const absPath = path.resolve(ROOT_DIR, outFile);
		fs.mkdirSync(path.dirname(absPath), { recursive: true });
		fs.writeFileSync(absPath, Buffer.from(data, "base64"));
		console.log(`Saved screenshot: ${absPath}`);
	});
}

async function main() {
	const args = process.argv.slice(2);
	const cmd = args[0] || "status";
	const windowIdx = args.indexOf("--window");
	const windowKind =
		windowIdx >= 0 && args[windowIdx + 1] ? args[windowIdx + 1] : "main";
	const sizeIdx = args.indexOf("--size");
	const sizeArg = sizeIdx >= 0 && args[sizeIdx + 1] ? args[sizeIdx + 1] : "";

	switch (cmd) {
		case "launch":
			await cmdLaunch(args.includes("--release"));
			break;
		case "status":
			await cmdStatus();
			break;
		case "trust":
			await cmdTrust();
			break;
		case "eval":
			await cmdEval(args[1] || "1+1", windowKind);
			break;
		case "reload":
			await cmdReload();
			break;
		case "screenshot": {
			const fileArg =
				args[1] && !args[1].startsWith("--")
					? args[1]
					: "dev/scratch/screenshot.png";
			await cmdScreenshot(fileArg, windowKind, sizeArg);
			break;
		}
		case "stop":
			await cmdStop();
			break;
		default:
			console.log(
				"Usage: cdp-debug.mjs <launch|status|eval|reload|screenshot|trust|stop>",
			);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
