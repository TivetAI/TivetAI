#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read --allow-write

import { parse, stringify } from "@std/toml";
import { walk, exists } from "@std/fs";
import { join, relative, basename } from "@std/path";

const rootDir = join(import.meta.dirname, "../..");

async function updateCargoToml() {
	const workspaceTomlPath = join(rootDir, "Cargo.toml");
	const workspaceTomlContent = await Deno.readTextFile(workspaceTomlPath);
	const workspaceToml = parse(workspaceTomlContent);
	let oss = await exists(join(rootDir, "oss"));

	const entries = async function* () {
		for await (const entry of walk(join(rootDir, "packages"), {
			includeDirs: false,
			exts: ["toml"],
			skip: [/node_modules/],
		})) {
			if (entry.path.endsWith("Cargo.toml")) yield entry;
		}

		if (oss) {
			for await (const entry of walk(join(rootDir, "oss", "packages"), {
				includeDirs: false,
				exts: ["toml"],
			})) {
				if (entry.path.endsWith("Cargo.toml")) yield entry;
			}
		}
	}();

	const members: string[] = [];
	for await (const entry of entries) {
		if (entry.path.includes("packages/infra/job-runner")) continue;
		const packagePath = relative(rootDir, entry.path.replace(/\/Cargo\.toml$/, ""));
		members.push(packagePath);
	}

	members.push("sdks/api/full/rust");
	if (oss) members.push("oss/sdks/api/full/rust");

	members.sort();

	const existingDependencies = workspaceToml.workspace?.dependencies || {};
	for (const [name, dep] of Object.entries(existingDependencies)) {
		if (dep && typeof dep === "object" && "path" in dep) {
			delete existingDependencies[name];
		}
	}

	const newDependencies: Record<string, any> = {};
	const packageAliases: Record<string, string[]> = {
		"tivet-util": ["util"],
		"tivet-util-mm": ["util-mm"],
		"tivet-util-job": ["util-job"],
		"tivet-util-search": ["util-search"],
		"tivet-util-captcha": ["util-captcha"],
		"tivet-util-cdn": ["util-cdn"],
		"tivet-util-team": ["util-team"],
		"tivet-util-build": ["util-build"],
	};

	const errorPackages: string[] = [];

	for (const packagePath of members) {
		try {
			const packageTomlPath = join(rootDir, packagePath, "Cargo.toml");
			const packageTomlContent = await Deno.readTextFile(packageTomlPath);
			const packageToml = parse(packageTomlContent);

			if (!packageToml.package?.name) {
				throw new Error("Missing 'package.name' in TOML");
			}

			newDependencies[packageToml.package.name] = { path: packagePath };

			if (packageToml.package.name in packageAliases) {
				for (const alias of packageAliases[packageToml.package.name]) {
					newDependencies[alias] = {
						package: packageToml.package.name,
						path: packagePath,
					};
				}
			}

			if (packageToml.dependencies) {
				for (const [depName, dep] of Object.entries(packageToml.dependencies)) {
					if (typeof dep === "object" && dep?.path) {
						const depAbsolutePath = join(packagePath, dep.path);
						const depRelativePath = relative(rootDir, depAbsolutePath);
						if (members.includes(depRelativePath)) {
							packageToml.dependencies[depName] = { workspace: true };
						}
					}
				}

				const updatedPackageTomlContent = stringify(packageToml);
				await Deno.writeTextFile(packageTomlPath, updatedPackageTomlContent);
			}
		} catch (err) {
			errorPackages.push(packagePath);
			console.warn(`Failed to process ${packagePath}:`, err);
		}
	}

	workspaceToml.workspace = workspaceToml.workspace || {};
	workspaceToml.workspace.members = members;
	workspaceToml.workspace.dependencies = {
		...existingDependencies,
		...newDependencies,
	};

	const updatedTomlContent = stringify(workspaceToml);
	await Deno.writeTextFile(workspaceTomlPath, updatedTomlContent);

	console.log(`\nUpdated workspace Cargo.toml with ${members.length} members.`);
	console.log(`Injected ${Object.keys(newDependencies).length} workspace dependencies.`);

	if (errorPackages.length > 0) {
		console.warn(`\nEncountered issues with ${errorPackages.length} package(s):`);
		for (const errPath of errorPackages) {
			console.warn(`- ${errPath}`);
		}
	}

	for (const member of members) {
		const cargoPath = join(rootDir, member, "Cargo.toml");
		if (!(await exists(cargoPath))) {
			console.warn(`Missing Cargo.toml at expected path: ${cargoPath}`);
		}
	}

	try {
		parse(await Deno.readTextFile(workspaceTomlPath));
		console.log("\nTOML syntax validation passed.");
	} catch (err) {
		console.error("TOML validation failed:", err);
	}

	// Export summary to JSON file
	const summaryPath = join(rootDir, "workspace-summary.json");
	await Deno.writeTextFile(summaryPath, JSON.stringify({
		memberCount: members.length,
		dependencyCount: Object.keys(newDependencies).length,
		errors: errorPackages
	}, null, 2));
	console.log(`\nSummary written to ${summaryPath}`);
}

updateCargoToml().catch((err) => {
	console.error("Error updating Cargo.toml:", err);
	Deno.exit(1);
});
