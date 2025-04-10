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
// ````
// cd path/to/deno/project
// /path/to/scripts/js_utils/build.ts name_of_script.ts
// ````
//
// This will output the output to `out/`.

import { resolve, join } from "@std/path";
import { walk } from "@std/fs";
import { parse } from "@std/flags";

const parsedArgs = parse(Deno.args, {
	boolean: ["watch", "minify"],
	default: {
		minify: false,
		watch: false,
	},
});

const entry = parsedArgs._[0];
if (!entry || typeof entry !== "string") {
	console.error("Error: Missing script entry point.");
	Deno.exit(1);
}

console.log("Building", entry);

const ROOT_DIR = resolve(import.meta.dirname!, "..", "..");
const JS_UTILS_DIR = resolve(ROOT_DIR, "packages/toolchain/js-utils-embed/js");

const entryAbs = resolve(Deno.cwd(), entry);
const outDir = resolve(Deno.cwd(), "dist");

const input = {
	projectRoot: Deno.cwd(),
	entryPoint: entryAbs,
	outDir,
	bundle: {
		minify: parsedArgs.minify,
		analyzeResult: false,
		logLevel: "debug",
	},
};

// Timer
const start = performance.now();

async function buildOnce() {
	console.log(`[${new Date().toISOString()}] Starting build...`);

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
		stdout: "inherit",
		stderr: "inherit",
	}).output();

	if (!output.success) {
		console.error("Build failed");
		return false;
	}

	const duration = (performance.now() - start).toFixed(0);
	console.log(`✅ Build succeeded in ${duration}ms`);

	await inspectOutputSize();

	return true;
}

async function inspectOutputSize() {
	console.log("Inspecting output files...");
	for await (const entry of walk(outDir, { exts: [".js", ".map"], includeFiles: true })) {
		const info = await Deno.stat(entry.path);
		const sizeKb = (info.size / 1024).toFixed(2);
		console.log(`  ${entry.name} - ${sizeKb} KB`);
	}
}

async function watchAndRebuild() {
	const watcher = Deno.watchFs(entryAbs, { recursive: false });
	console.log("👀 Watching for changes...");
	for await (const _event of watcher) {
		console.log("🔁 Change detected, rebuilding...");
		await buildOnce();
	}
}

const success = await buildOnce();

if (parsedArgs.watch && success) {
	await watchAndRebuild();
} else if (!success) {
	Deno.exit(1);
}
