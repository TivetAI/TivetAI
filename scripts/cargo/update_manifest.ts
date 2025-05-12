#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env

import { join, resolve } from "https://deno.land/std@0.114.0/path/mod.ts";
import { existsSync } from "https://deno.land/std/fs/mod.ts";

const args = Deno.args;

// CLI args
const dryRun = args.includes("--dry-run");
const verbose = args.includes("--verbose");

const dirArg = args.find((arg) => arg.startsWith("--dir="));
const targetDir = dirArg ? resolve(dirArg.split("=")[1]) : join(import.meta.dirname, "../../packages");

const backupRetention = !args.includes("--no-backup"); // default: keep backups unless --no-backup passed

const customFieldsArg = args.find((arg) => arg.startsWith("--fields="));
const customFields: string[] = customFieldsArg
	? customFieldsArg
			.split("=")[1]
			.split(",")
			.map((f) => f.trim())
			.filter(Boolean)
	: [
			"version.workspace = true",
			"authors.workspace = true",
			"license.workspace = true",
			"edition.workspace = true",
	  ];

// Colored output helpers
const green = (msg: string) => `\x1b[32m${msg}\x1b[0m`;
const red = (msg: string) => `\x1b[31m${msg}\x1b[0m`;
const yellow = (msg: string) => `\x1b[33m${msg}\x1b[0m`;
const blue = (msg: string) => `\x1b[34m${msg}\x1b[0m`;

function log(...msg: unknown[]) {
	console.log(new Date().toISOString(), ...msg);
}

function logVerbose(...msg: unknown[]) {
	if (verbose) console.log(new Date().toISOString(), blue("[VERBOSE]"), ...msg);
}

interface Stats {
	updated: number;
	skipped: number;
	failed: number;
}

const stats: Stats = {
	updated: 0,
	skipped: 0,
	failed: 0,
};

async function processCargoToml(fullPath: string) {
	try {
		let data = await Deno.readTextFile(fullPath);

		// Check if file is already updated by searching for any custom field
		if (customFields.some((field) => data.includes(field))) {
			stats.skipped++;
			logVerbose(yellow(`Skipping already updated: ${fullPath}`));
			return;
		}

		// Backup before modifications
		if (backupRetention) {
			const backupPath = `${fullPath}.bak`;
			await Deno.writeTextFile(backupPath, data);
			logVerbose(`Backup created: ${backupPath}`);
		}

		// Use regex to find all [package] blocks and insert fields before next block or end of file
		const packageBlockRegex = /\[package\][\s\S]*?(?=(\n\[|$))/g;

		let modified = false;
		data = data.replace(packageBlockRegex, (match) => {
			// Avoid duplicate insertion if any field already exists (safe guard)
			if (customFields.some((field) => match.includes(field))) {
				return match; // no changes
			}
			modified = true;
			// Trim trailing whitespace at end of block and append custom fields with newline
			return match.trimEnd() + "\n" + customFields.join("\n") + "\n";
		});

		if (!modified) {
			stats.skipped++;
			logVerbose(yellow(`No [package] block modified in: ${fullPath}`));
			return;
		}

		if (dryRun) {
			log(green(`[Dry Run] Would update: ${fullPath}`));
		} else {
			// Atomic write: write to temp file then rename to avoid partial writes on crash
			const tempPath = fullPath + ".tmp";
			await Deno.writeTextFile(tempPath, data);
			await Deno.rename(tempPath, fullPath);
			log(green(`Updated: ${fullPath}`));
		}

		stats.updated++;
	} catch (error) {
		stats.failed++;
		log(red(`Failed to process ${fullPath}: ${error.message}`));
		if (verbose) console.error(error);
	}
}

async function walkDir(dir: string, concurrency = 5) {
	const queue: string[] = [dir];
	const workers: Promise<void>[] = [];

	async function worker() {
		while (queue.length) {
			const currentDir = queue.shift();
			if (!currentDir) return;

			for await (const entry of Deno.readDir(currentDir)) {
				const fullPath = join(currentDir, entry.name);
				if (entry.isDirectory) {
					queue.push(fullPath);
				} else if (entry.isFile && entry.name === "Cargo.toml") {
					await processCargoToml(fullPath);
				}
			}
		}
	}

	for (let i = 0; i < concurrency; i++) {
		workers.push(worker());
	}

	await Promise.all(workers);
}

async function main() {
	log(blue("Starting Cargo.toml updater..."));
	log(`Target directory: ${targetDir}`);
	log(`Dry run: ${dryRun}`);
	log(`Verbose: ${verbose}`);
	log(`Backup retention: ${backupRetention}`);
	log(`Custom fields:\n${customFields.join("\n")}`);

	if (!existsSync(targetDir)) {
		log(red(`Error: Directory ${targetDir} does not exist.`));
		Deno.exit(1);
	}

	await walkDir(targetDir);

	log(blue("Update complete."));
	log(green(`Files updated: ${stats.updated}`));
	log(yellow(`Files skipped: ${stats.skipped}`));
	log(red(`Files failed: ${stats.failed}`));

	if (stats.failed > 0) {
		Deno.exit(2);
	}
}

if (import.meta.main) {
	main();
}
