// @ts-types="../../common/dist/log.d.ts"
import { setupLogging } from "@tivet-gg/actor-common/log";
// @ts-types="../../common/dist/network.d.ts"
import { PORT_NAME } from "@tivet-gg/actor-common/network";
// @ts-types="../../common/dist/utils.d.ts"
import {
	type TivetEnvironment,
	assertUnreachable,
} from "@tivet-gg/actor-common/utils";
import type { ActorContext } from "@tivet-gg/actor-core";
import { TivetClient } from "@tivet-gg/api";
// @ts-types="../../manager-protocol/dist/mod.d.ts"
import {
	ActorsRequestSchema,
	type ActorsResponse,
	type TivetConfigResponse,
} from "@tivet-gg/manager-protocol";
import { Hono, type Context as HonoContext } from "hono";
import { cors } from "hono/cors";
import { logger } from "./log";
import { queryActor } from "./query_exec";

export default class Manager {
	private readonly endpoint: string;
	private readonly tivetClient: TivetClient;
	private readonly environment: TivetEnvironment;

	constructor(private readonly ctx: ActorContext) {
		const endpoint = Deno.env.get("TIVET_API_ENDPOINT");
		if (!endpoint) throw new Error("missing TIVET_API_ENDPOINT");
		const token = Deno.env.get("TIVET_SERVICE_TOKEN");
		if (!token) throw new Error("missing TIVET_SERVICE_TOKEN");

		this.endpoint = endpoint;

		this.tivetClient = new TivetClient({
			environment: endpoint,
			token,
		});

		this.environment = {
			project: this.ctx.metadata.project.slug,
			environment: this.ctx.metadata.environment.slug,
		};
	}

	static async start(ctx: ActorContext) {
		setupLogging();

		// biome-ignore lint/complexity/noThisInStatic: Must be used for default actor entrypoint
		const manager = new this(ctx);
		await manager.#run();
	}

	async #run() {
		const portStr = Deno.env.get("PORT_HTTP");
		if (!portStr) throw "Missing port";
		const port = Number.parseInt(portStr);
		if (!Number.isFinite(port)) throw "Invalid port";

		const app = new Hono();

		app.use("/*", cors());

		app.get("/tivet/config", (c: HonoContext) => {
			return c.json({
				// HACK(RVT-4376): Replace DNS address used for local dev envs with public address
				endpoint: this.endpoint.replace("tivet-server", "127.0.0.1"),
				project: this.environment.project,
				environment: this.environment.environment,
			} satisfies TivetConfigResponse);
		});

		app.post("/actors", async (c: HonoContext) => {
			// Get actor
			const body = ActorsRequestSchema.parse(await c.req.json());
			const actor = await queryActor(
				this.tivetClient,
				this.environment,
				body.query,
			);

			// Fetch port
			const httpPort = actor.network.ports[PORT_NAME];
			if (!httpPort) throw new Error("missing http port");
			const hostname = httpPort.hostname;
			if (!hostname) throw new Error("missing hostname");
			const port = httpPort.port;
			if (!port) throw new Error("missing port");

			let isTls = false;
			switch (httpPort.protocol) {
				case "https":
					isTls = true;
					break;
				case "http":
				case "tcp":
					isTls = false;
					break;
				case "tcp_tls":
				case "udp":
					throw new Error(`Invalid protocol ${httpPort.protocol}`);
				default:
					assertUnreachable(httpPort.protocol);
			}

			const path = httpPort.path ?? "";

			const endpoint = `${
				isTls ? "https" : "http"
			}://${hostname}:${port}${path}`;

			return c.json({ endpoint } satisfies ActorsResponse);
		});

		app.all("*", (c) => {
			return c.text("Not Found", 404);
		});

		logger().info("server running", { port });
		const server = Deno.serve(
			{
				port,
				hostname: "0.0.0.0",
				// Remove "Listening on ..." message
				onListen() {},
			},
			app.fetch,
		);

		logger().debug("tivet endpoint", {
			endpoint: this.endpoint,
			project: this.ctx.metadata.project.slug,
			environment: this.ctx.metadata.environment.slug,
		});

		await server.finished;
	}
}
