import $ from "dax";

const REPOS = [
	{ name: "tivetgg/tivet-server", prefix: "slim", main: true },
	{ name: "tivetgg/tivet-server", prefix: "full" },
	{ name: "tivetgg/tivet-client", prefix: "full", main: true },
	{ name: "tivetgg/tivet-client", prefix: "isolate-v8-runner" },
	{ name: "tivetgg/tivet-client", prefix: "container-runner" },
	//{ name: "tivetgg/tivet", prefix: "monolith", main: true },
]

export async function tagDocker(opts: { version: string; commit: string; latest: boolean }) {
	for (const { name, prefix, main } of REPOS) {
		// Check image exists
		$.logStep("Pulling", `${name}:${prefix}-${opts.commit}`);
		const imageExists = await $`docker pull --platform amd64 ${name}:${prefix}-${opts.commit}`.quiet().noThrow();
		if (imageExists.code !== 0) {
			throw new Error(`Image ${name}:${prefix}-${opts.commit} does not exist on Docker Hub.`);
		}

		// Tag with version
		await tag(name, `${prefix}-${opts.commit}`, `${prefix}-${opts.version}`);
		if (main) {
			await tag(name, `${prefix}-${opts.commit}`, opts.version);
		}

		// Tag with latest
		if (opts.latest) {
			await tag(name, `${prefix}-${opts.commit}`, `${prefix}-latest`);
			if (main) {
				await tag(name, `${prefix}-${opts.commit}`, "latest");
			}
		}
	}
}

async function tag(image: string, from: string, to: string) {
	$.logStep("Tagging", `${image}:${from} -> ${image}:${to}`);
	await $`docker tag ${image}:${from} ${image}:${to}`;
	await $`docker push ${image}:${to}`;
}
