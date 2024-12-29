import { type Tivet, TivetClient } from "@tivet-gg/api";

const token = process.env.TIVET_SERVICE_TOKEN;
if (!token) throw "missing TIVET_SERVICE_TOKEN";
const project = process.env.TIVET_PROJECT;
if (!project) throw "missing TIVET_PROJECT";
const environment = process.env.TIVET_ENVIRONMENT;
if (!environment) throw "missing TIVET_ENVIRONMENT";

const client = new TivetClient({ token });

let actor: Tivet.actor.Actor | undefined = undefined;

try {
	console.log("Creating actor");
	actor = (
		await client.actor.create({
			project,
			environment,
			body: {
				tags: {
					foo: "bar",
				},
				buildTags: { name: "simple_http", current: "true" },
				network: {
					ports: {
						http: {
							protocol: "https",
						},
					},
				},
			},
		})
	).actor;

	const port = actor.network.ports.http;
	if (!port) throw "Missing http port";
	console.log("Connecting to actor", port.url);
	const res = await fetch(port.url);
	if (!res.ok) throw `Failed to request actor: ${res.statusText}`;
	const resText = await res.text();
	console.log("Actor response", resText);
} finally {
	if (actor) {
		//console.log("Destroying actor");
		//await client.actor.destroy(actor.id);
	}
}
