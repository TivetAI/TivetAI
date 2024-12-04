import { Tivet } from "@tivet-gg/api";
import { Button, DocsSheet } from "@tivet-gg/components";
import { Icon, faBooks } from "@tivet-gg/icons";
import { ActorObjectInspector } from "./console/actor-inspector";

export interface ActorNetworkProps extends Pick<Tivet.actor.Actor, "network"> {}

const NETWORK_MODE_LABELS: Record<Tivet.actor.NetworkMode, string> = {
	bridge: "Bridge",
	host: "Host",
};

const WEB_ACCESIBLE_PROTOCOLS: Tivet.actor.PortProtocol[] = [
	Tivet.actor.PortProtocol.Http,
	Tivet.actor.PortProtocol.Https,
];

export function ActorNetwork({ network }: ActorNetworkProps) {
	return (
		<div className="px-4 mt-4 ">
			<div className="flex gap-1 items-center mb-2">
				<h3 className=" font-semibold">Network</h3>
				<DocsSheet title="Networking" path="docs/networking">
					<Button
						variant="outline"
						size="sm"
						startIcon={<Icon icon={faBooks} />}
					>
						Documentation
					</Button>
				</DocsSheet>
			</div>
			<div className="text-xs">
				<ActorObjectInspector
					data={{ mode: network?.mode, ports: network?.ports }}
				/>
			</div>
		</div>
	);
}
