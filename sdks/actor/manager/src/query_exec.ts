// @ts-types="../../common/dist/network.d.ts"
import { PORT_NAME } from "@tivet-gg/actor-common/network";
// @ts-types="../../common/dist/utils.d.ts"
import { assertUnreachable } from "@tivet-gg/actor-common/utils";
// @ts-types="../../common/dist/utils.d.ts"
import type {
	ActorTags,
	BuildTags,
	TivetEnvironment,
} from "@tivet-gg/actor-common/utils";
import type { Tivet, TivetClient } from "@tivet-gg/api";
// @ts-types="../../manager-protocol/dist/query.d.ts"
import type {
	ActorQuery,
	CreateRequest,
} from "@tivet-gg/manager-protocol/query";
import { logger } from "./log";

export async function queryActor(
	client: TivetClient,
	environment: TivetEnvironment,
	query: ActorQuery,
): Promise<Tivet.actor.Actor> {
	logger().debug("query", { query });

	if ("getForId" in query) {
		const res = await client.actor.get(query.getForId.actorId, environment);
		if ((res.actor.tags as ActorTags).access !== "public") {
			throw new Error(`Actor with ID ${query.getForId.actorId} is private`);
		}
		if (res.actor.destroyedAt) {
			throw new Error(`Actor with ID ${query.getForId.actorId} already destroyed`);
		}
		return res.actor;
	}

	if ("getOrCreateForTags" in query) {
		const tags = query.getOrCreateForTags.tags;
		if (!tags) throw new Error("Must define tags in getOrCreateForTags");
		const existingActor = await getWithTags(client, environment, tags as ActorTags);
		if (existingActor) return existingActor;

		if (query.getOrCreateForTags.create) {
			return await createActor(client, environment, query.getOrCreateForTags.create);
		}
		throw new Error("Actor not found with tags or is private.");
	}

	if ("create" in query) {
		return await createActor(client, environment, query.create);
	}

	if ("getLatestByName" in query) {
		const { name } = query.getLatestByName;
		const actors = await client.actor.list({
			tagsJson: JSON.stringify({ name, access: "public" }),
			...environment,
		});

		const validActors = actors.actors.filter((a) => {
			if ((a.tags as ActorTags).access !== "public") return false;
			for (const portName in a.network.ports) {
				const port = a.network.ports[portName];
				if (!port.hostname || !port.port) return false;
			}
			return true;
		});

		if (validActors.length === 0) {
			throw new Error(`No public actors found with name "${name}"`);
		}

		validActors.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
		return validActors[0];
	}

	if ("getByRegion" in query) {
		const { name, region } = query.getByRegion;
		const actors = await client.actor.list({
			tagsJson: JSON.stringify({ name, access: "public" }),
			...environment,
		});

		const match = actors.actors.find((actor) => {
			const tags = actor.tags as ActorTags;
			return tags.name === name && tags.region === region && tags.access === "public";
		});

		if (!match) {
			throw new Error(`No actor found with name "${name}" in region "${region}"`);
		}

		return match;
	}

	if ("getByBuild" in query) {
		const { buildId } = query.getByBuild;
		const actors = await client.actor.list({ ...environment });

		const filtered = actors.actors.filter((actor) => {
			return actor.build === buildId && (actor.tags as ActorTags).access === "public";
		});

		if (filtered.length === 0) {
			throw new Error(`No public actors found for build ID "${buildId}"`);
		}

		filtered.sort((a, b) => a.id.localeCompare(b.id));
		return filtered[0];
	}

	if ("getAllPublicByName" in query) {
		const { name } = query.getAllPublicByName;
		const { actors } = await client.actor.list({
			tagsJson: JSON.stringify({ name, access: "public" }),
			...environment,
		});
		return actors.filter((a) => {
			if ((a.tags as ActorTags).access !== "public") return false;
			for (const portName in a.network.ports) {
				const port = a.network.ports[portName];
				if (!port.hostname || !port.port) return false;
			}
			return true;
		});
	}

	if ("getDestroyedActorsByTag" in query) {
		const { tagKey, tagValue } = query.getDestroyedActorsByTag;
		const { actors } = await client.actor.list({
			tagsJson: JSON.stringify({ [tagKey]: tagValue }),
			...environment,
		});
	
		const destroyed = actors.filter((a) => !!a.destroyedAt);
		if (destroyed.length === 0) {
			throw new Error(`No destroyed actors found with tag ${tagKey}=${tagValue}`);
		}
		return destroyed[0]; // or return destroyed if you want all
	}

	if ("getByExactTags" in query) {
		const tags = query.getByExactTags.tags;
		const { actors } = await client.actor.list({
			tagsJson: JSON.stringify(tags),
			...environment,
		});
	
		const filtered = actors.filter((a) => {
			if ((a.tags as ActorTags).access !== "public") return false;
			for (const key in tags) {
				if ((a.tags as ActorTags)[key] !== tags[key]) return false;
			}
			for (const portName in a.network.ports) {
				const port = a.network.ports[portName];
				if (!port.hostname || !port.port) return false;
			}
			return true;
		});
	
		if (filtered.length === 0) {
			throw new Error(`No public actors found with matching tags`);
		}
	
		filtered.sort((a, b) => a.id.localeCompare(b.id));
		return filtered[0];
	}

	if ("getMostRecentByRegion" in query) {
		const { region } = query.getMostRecentByRegion;
		const { actors } = await client.actor.list({ ...environment });
	
		const filtered = actors.filter((a) => {
			const tags = a.tags as ActorTags;
			return tags.region === region && tags.access === "public";
		});
	
		if (filtered.length === 0) {
			throw new Error(`No public actors found in region "${region}"`);
		}
	
		filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
		return filtered[0];
	}
	
	assertUnreachable(query);
}

async function getWithTags(
	client: TivetClient,
	environment: TivetEnvironment,
	tags: ActorTags,
): Promise<Tivet.actor.Actor | undefined> {
	const req = {
		tagsJson: JSON.stringify({ ...tags, access: "public" }),
		...environment,
	};
	let { actors } = await client.actor.list(req);

	actors = actors.filter((a) => {
		if ((a.tags as ActorTags).access !== "public") {
			throw new Error("unreachable: actor tags not public");
		}
		for (const portName in a.network.ports) {
			const port = a.network.ports[portName];
			if (!port.hostname || !port.port) return false;
		}
		return true;
	});

	if (actors.length === 0) return undefined;
	if (actors.length > 1) {
		actors.sort((a, b) => a.id.localeCompare(b.id));
	}

	return actors[0];
}

async function createActor(
	client: TivetClient,
	environment: TivetEnvironment,
	createRequest: CreateRequest,
): Promise<Tivet.actor.Actor> {
	const build = await getBuildWithTags(client, environment, {
		name: createRequest.tags.name,
		current: "true",
		access: "public",
	});
	if (!build) throw new Error("Build not found with tags or is private");

	const req: Tivet.actor.CreateActorRequestQuery = {
		...environment,
		body: {
			tags: {
				...createRequest.tags,
				access: "public",
			},
			build: build.id,
			region: createRequest.region,
			network: {
				ports: {
					[PORT_NAME]: {
						protocol: "https",
						routing: { guard: {} },
					},
				},
			},
		},
	};
	logger().info("creating actor", { ...req });
	const { actor } = await client.actor.create(req);
	return actor;
}

async function getBuildWithTags(
	client: TivetClient,
	environment: TivetEnvironment,
	buildTags: BuildTags,
): Promise<Tivet.actor.Build | undefined> {
	const req = {
		tagsJson: JSON.stringify(buildTags),
		...environment,
	};
	let { builds } = await client.actor.builds.list(req);

	builds = builds.filter((b) => {
		if ((b.tags as BuildTags).access !== "public") return false;
		return true;
	});

	if (builds.length === 0) return undefined;
	if (builds.length > 1) {
		builds.sort((a, b) => a.id.localeCompare(b.id));
	}

	return builds[0];
}
