import { computePageLayout } from "@/lib/compute-page-layout";
import { PageLayout } from "@tivet-gg/components/layout";
import { Outlet, createFileRoute, useMatches } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_layout")({
	component: () => {
		const matches = useMatches();
		return (
			<PageLayout.Root layout={computePageLayout(matches)}>
				<Outlet />
			</PageLayout.Root>
		);
	},
	pendingComponent: PageLayout.Root.Skeleton,
});
