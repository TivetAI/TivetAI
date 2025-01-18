import { Button, DocsCard, Grid, Text } from "@tivet-gg/components";
import { Link, createFileRoute } from "@tanstack/react-router";

function CloudTokenCard() {
	return (
		<>
			<DocsCard
				title="Cloud token"
				href="https://tivet.gg/docs/general/concepts/token-types#cloud"
				footer={
					<Button asChild>
						<Link to="." search={{ modal: "cloud-token" }}>
							Generate
						</Link>
					</Button>
				}
			>
				<Text>
					Cloud tokens are used to access Tivet Cloud. They are used
					by the client to access Tivet Cloud.
				</Text>
			</DocsCard>
		</>
	);
}

function ProjectTokensRoute() {
	return (
		<Grid columns={{ initial: "1", md: "2" }} gap="4" items="start">
			<CloudTokenCard />
		</Grid>
	);
}

export const Route = createFileRoute(
	"/_authenticated/_layout/projects/$projectNameId/settings/",
)({
	component: ProjectTokensRoute,
});
