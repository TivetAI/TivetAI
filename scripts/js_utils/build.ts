#!/usr/bin/env -S deno run -A

// This script can be used to call the internal build tooling directly on a
// given script. This is helpful for iterating on the esbuild config with
// isolated test cases without having to rebuild the whole toolchain.
//
// The build toolchain is fully tested e2e on all of the examples, so this is
// only intended for manual iteration.
//
// To run:
//
// ```
// cd path/to/deno/project
// /path/to/scripts/js_utils/build.ts name_of_script.ts --outDir=custom_dist --minify --watch
// ```
//
// This will output the build to `dist/` by default, or to the directory
// specified by --outDir.

// Imports
import { resolve, join } from "https://deno.land/std@0.114.0/path/mod.ts";
import { walk } from "https://deno.land/std@0.114.0/fs/mod.ts";
import { parse } from "https://deno.land/std@0.114.0/flags/mod.ts";

// Parse command line args
const parsedArgs = parse(Deno.args, {
	boolean: ["watch", "minify", "quiet"],
	default: {
		minify: false,
		watch: false,
		quiet: false,
	},
	string: ["outDir"],
});

const entry = parsedArgs._[0];
if (!entry || typeof entry !== "string") {
	console.error("Error: Missing script entry point.");
	Deno.exit(1);
}

const quiet = parsedArgs.quiet;
const outDir = parsedArgs.outDir
	? resolve(Deno.cwd(), parsedArgs.outDir)
	: resolve(Deno.cwd(), "dist");

if (!quiet) console.log("Building", entry);
if (!quiet) console.log("Output directory:", outDir);

const ROOT_DIR = resolve(import.meta.dirname!, "..", "..");
const JS_UTILS_DIR = resolve(ROOT_DIR, "packages/toolchain/js-utils-embed/js");

const entryAbs = resolve(Deno.cwd(), entry);

const input = {
	projectRoot: Deno.cwd(),
	entryPoint: entryAbs,
	outDir,
	bundle: {
		minify: parsedArgs.minify,
		analyzeResult: false,
		logLevel: quiet ? "error" : "debug",
	},
};

// Timer
const start = performance.now();

// Helper for colored console output
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;

// Convert bytes to human readable string
function humanFileSize(bytes: number) {
	const thresh = 1024;
	if (Math.abs(bytes) < thresh) {
		return bytes + " B";
	}
	const units = ["KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
	let u = -1;
	do {
		bytes /= thresh;
		++u;
	} while (Math.abs(bytes) >= thresh && u < units.length - 1);
	return bytes.toFixed(2) + " " + units[u];
}

// Clean old build files from output dir (optional)
async function cleanOutputDir() {
	try {
		for await (const file of walk(outDir)) {
			if (file.isFile) {
				await Deno.remove(file.path);
				if (!quiet) console.log(`Removed old file: ${file.path}`);
			}
		}
	} catch (e) {
		if (!quiet) console.warn("Warning cleaning output dir:", e.message);
	}
}

async function buildOnce() {
	if (!quiet) console.log(`[${new Date().toISOString()}] Starting build...`);

	await cleanOutputDir();

	const output = await new Deno.Command("deno", {
		args: [
			"run",
			"--allow-all",
			"--unstable-sloppy-imports",
			"--vendor",
			"src/tasks/build/mod.ts",
			"--input",
			JSON.stringify(input),
		],
		env: {
			JS_UTILS_ROOT: JS_UTILS_DIR,
		},
		cwd: JS_UTILS_DIR,
		stdout: quiet ? "null" : "inherit",
		stderr: quiet ? "null" : "inherit",
	}).output();

	if (!output.success) {
		console.error(red("Build failed"));
		return false;
	}

	const duration = (performance.now() - start).toFixed(0);
	if (!quiet) console.log(green(`✅ Build succeeded in ${duration}ms`));

	await inspectOutputSize();

	return true;
}

async function inspectOutputSize() {
	if (!quiet) console.log("Inspecting output files...");
	for await (const entry of walk(outDir, { exts: [".js", ".map"], includeFiles: true })) {
		const info = await Deno.stat(entry.path);
		const sizeStr = humanFileSize(info.size);

		// Color by size: <100KB green, <500KB yellow, else red
		let sizeColored = green(sizeStr);
		if (info.size > 500 * 1024) sizeColored = red(sizeStr);
		else if (info.size > 100 * 1024) sizeColored = yellow(sizeStr);

		if (!quiet) console.log(`  ${entry.name} - ${sizeColored}`);
	}
}

async function watchAndRebuild() {
	const watcher = Deno.watchFs(entryAbs, { recursive: false });
	if (!quiet) console.log("👀 Watching for changes...");
	for await (const _event of watcher) {
		if (!quiet) console.log("🔁 Change detected, rebuilding...");
		await buildOnce();
	}
}

const success = await buildOnce();

if (parsedArgs.watch && success) {
	await watchAndRebuild();
} else if (!success) {
	Deno.exit(1);
}
