#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read --allow-run

// Import necessary modules
import { resolve } from "https://deno.land/std@0.114.0/path/mod.ts";
import { v4 as uuidv4 } from "https://deno.land/std@0.114.0/uuid/mod.ts";
import { delay } from "https://deno.land/std@0.114.0/async/delay.ts";

// Constants
const ENDPOINT = Deno.env.get("TIVET_ENDPOINT") ?? "http://127.0.0.1:8080";
const BUILD = Deno.env.get("TIVET_BUILD") ?? resolve(import.meta.dirname, "./fixtures/echo_http.js");

function logSection(title: string) {
	console.log(`\n==== ${title.toUpperCase()} ====\n`);
}

function logElapsed(label: string, start: number) {
	const ms = (performance.now() - start).toFixed(0);
	console.log(`${label} completed in ${ms}ms\n`);
}

async function retry<T>(
	fn: () => Promise<T>,
	retries = 3,
	delayMs = 1000,
): Promise<T> {
	let attempt = 0;
	while (true) {
		try {
			return await fn();
		} catch (e) {
			attempt++;
			console.warn(`Retry #${attempt} failed: ${e.message}`);
			if (attempt >= retries) throw e;
			await delay(delayMs);
		}
	}
}

// Helper function to make HTTP requests
async function httpRequest(method: string, url: string, body?: any) {
	console.log(`Request: ${method} ${url}\n${JSON.stringify(body)}`);

	const response = await fetch(url, {
		method,
		headers: { "Content-Type": "application/json" },
		body: body ? JSON.stringify(body) : undefined,
	});
	const responseText = await response.text();

	console.log(`Response: ${response.status}\n${responseText}`);

	if (!response.ok) {
		throw new Error(`HTTP status: ${response.status}\n\nBody: ${responseText}`);
	}

	console.log();

	return JSON.parse(responseText);
}

async function gracefulShutdown(actor: any) {
	console.log("\nShutting down...");
	try {
		await destroyActor(actor);
		console.log("Actor destroyed.");
	} catch (e) {
		console.error("Failed to destroy actor:", e);
	}
	Deno.exit(0);
}

async function waitForSignal(actor: any) {
	const sig = Deno.signal(Deno.Signal.SIGINT);
	for await (const _ of sig) {
		await gracefulShutdown(actor);
	}
}

async function debugBundleTar(path: string) {
	try {
		const tarList = new Deno.Command("tar", {
			args: ["tf", path],
			stdout: "piped",
			stderr: "piped",
		});
		const output = await tarList.output();
		console.log("Bundle contents:");
		console.log(new TextDecoder().decode(output.stdout));
	} catch (e) {
		console.error("Failed to list tar contents:", e);
	}
}

async function createTempBundle(): Promise<string> {
	const tmpDir = await Deno.makeTempDir();
	const tmpFilePath = resolve(tmpDir, "index.js");
	await Deno.copyFile(BUILD, tmpFilePath);

	const bundleLocation = resolve(tmpDir, "bundle.tar");
	const tarCommand = new Deno.Command("tar", {
		args: ["cf", bundleLocation, "-C", tmpDir, "index.js"],
	});
	const { code } = await tarCommand.output();
	console.assert(code === 0);

	await debugBundleTar(bundleLocation);
	return bundleLocation;
}

async function uploadBuild(): Promise<{ buildId: string }> {
	logSection("Uploading Build");

	const bundleLocation = await createTempBundle();
	const buildContent = await Deno.readFile(bundleLocation);
	const contentLength = buildContent.length;

	const randomString = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
	const { build, presigned_requests } = await httpRequest("POST", `${ENDPOINT}/builds/prepare`, {
		image_file: {
			content_length: contentLength,
			path: "bundle.tar",
		},
		kind: "javascript",
		name: `build-${randomString}`,
	});

	await fetch(presigned_requests[0].url, {
		method: "PUT",
		body: buildContent,
	});

	await httpRequest("POST", `${ENDPOINT}/builds/${build}/complete`, {});
	return { buildId: build };
}

async function main() {
	const start = performance.now();

	const { buildId } = await retry(() => uploadBuild());

	const regions = await listRegions();
	const actor = await retry(() => createActor(regions[0].id, buildId));

	waitForSignal(actor); // background

	await pingActor(actor);

	logElapsed("End-to-end", start);

	console.log("Sleeping for 5 seconds before destroying.");
	await delay(5000);

	await destroyActor(actor);
}

await main();
