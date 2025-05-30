import { ActorTags } from "@/domains/project/components/actors/actor-tags";
import { ProjectBuildsTableActions } from "@/domains/project/components/project-builds-table-actions";
import { TagsSelect } from "@/domains/project/components/tags-select";
import * as Layout from "@/domains/project/layouts/servers-layout";
import {
	projectBuildsQueryOptions,
	projectCurrentBuildsQueryOptions,
	usePatchActorBuildTagsMutation,
	useUpgradeAllActorsMutation,
} from "@/domains/project/queries";
import type { Tivet } from "@tivet-gg/api";
import {
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CopyButton,
	Flex,
	Skeleton,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	Text,
	WithTooltip,
} from "@tivet-gg/components";
import { Icon, faCheckCircle, faInfoCircle, faRefresh } from "@tivet-gg/icons";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

function ProjectBuildsRoute() {
	const {
		environment: { namespaceId: environmentId, nameId: environmentNameId },
		project: { gameId: projectId, nameId: projectNameId },
	} = Route.useRouteContext();

	const search = Route.useSearch();
	const tags = "tags" in search ? Object.fromEntries(search.tags || []) : {};
	const {
		data: builds,
		isRefetching,
		isLoading,
		refetch,
	} = useQuery(projectBuildsQueryOptions({ projectId, environmentId, tags }));

	const navigate = Route.useNavigate();

	return (
		<Card w="full">
			<CardHeader>
				<Flex items="center" gap="4" justify="between">
					<CardTitle>Builds</CardTitle>
					<div className="flex gap-2">
						<TagsSelect
							value={tags}
							projectId={projectId}
							environmentId={environmentId}
							onValueChange={(newTags) => {
								navigate({
									search: {
										tags: Object.entries(newTags).map(
											([key, value]) =>
												[key, value] as [
													string,
													string,
												],
										),
									},
								});
							}}
						/>
						<Button
							size="icon"
							isLoading={isRefetching}
							variant="outline"
							onClick={() => refetch()}
						>
							<Icon icon={faRefresh} />
						</Button>
					</div>
				</Flex>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Id</TableHead>
							<TableHead>Created at</TableHead>
							<TableHead>Tags</TableHead>
							<TableHead>
								<WithTooltip
									content="Actors will be created with this build if a version is not explicitly specified."
									trigger={
										<span>
											Current <Icon icon={faInfoCircle} />
										</span>
									}
								/>
							</TableHead>
							<TableHead />
						</TableRow>
					</TableHeader>
					<TableBody>
						{!isLoading && builds?.length === 0 ? (
							<TableRow>
								<TableCell colSpan={6}>
									<Text className="text-center">
										There's no builds matching criteria.
									</Text>
								</TableCell>
							</TableRow>
						) : null}
						{isLoading ? (
							<>
								<RowSkeleton />
								<RowSkeleton />
								<RowSkeleton />
								<RowSkeleton />
								<RowSkeleton />
								<RowSkeleton />
								<RowSkeleton />
								<RowSkeleton />
							</>
						) : null}
						{builds?.map((build) => (
							<TableRow key={build.id}>
								<TableCell>
									<WithTooltip
										content={build.id}
										trigger={
											<CopyButton value={build.id}>
												<button type="button">
													{build.id.split("-")[0]}
												</button>
											</CopyButton>
										}
									/>
								</TableCell>
								<TableCell>
									{build.createdAt.toLocaleString()}
								</TableCell>
								<TableCell>
									<ActorTags
										{...build}
										excludeBuiltIn="builds"
									/>
								</TableCell>
								<TableCell>
									<ProjectBuildLatestButton
										projectNameId={projectNameId}
										environmentNameId={environmentNameId}
										projectId={projectId}
										environmentId={environmentId}
										{...build}
									/>
								</TableCell>
								<TableCell>
									<ProjectBuildsTableActions
										buildId={build.id}
									/>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}

function RowSkeleton() {
	return (
		<TableRow>
			<TableCell>
				<Skeleton className="w-full h-4" />
			</TableCell>
			<TableCell>
				<Skeleton className="w-full h-4" />
			</TableCell>
			<TableCell>
				<Skeleton className="w-full h-4" />
			</TableCell>
			<TableCell>
				<Skeleton className="w-full h-4" />
			</TableCell>
		</TableRow>
	);
}

interface ProjectBuildLatestButtonProps extends Tivet.actor.Build {
	projectNameId: string;
	environmentNameId: string;
	projectId: string;
	environmentId: string;
}

function ProjectBuildLatestButton({
	tags,
	id,
	projectId,
	environmentId,
	projectNameId,
	environmentNameId,
}: ProjectBuildLatestButtonProps) {
	const { mutateAsync: mutateBuildTagsAsync } =
		usePatchActorBuildTagsMutation();
	const { mutate: mutateUpgradeActors, isPending } =
		useUpgradeAllActorsMutation();
	const { data: latestBuilds } = useSuspenseQuery(
		projectCurrentBuildsQueryOptions({ projectId, environmentId }),
	);

	if (tags.current !== "true") {
		return (
			<Button
				variant="outline"
				size="sm"
				isLoading={isPending}
				onClick={async () => {
					await mutateBuildTagsAsync({
						projectNameId,
						environmentNameId,
						buildId: id,
						tags: { current: "true" },
					});
					if (latestBuilds.length > 0) {
						mutateUpgradeActors({
							projectNameId,
							environmentNameId,
							buildTags: { current: "true" },
							tags: { name: latestBuilds[0].name },
						});
					}
				}}
			>
				Make current
			</Button>
		);
	}

	return <Icon icon={faCheckCircle} className="fill-primary text-primary" />;
}

const searchSchema = z.object({
	tags: z.array(z.tuple([z.string(), z.string()])).optional(),
});

export const Route = createFileRoute(
	"/_authenticated/_layout/projects/$projectNameId/environments/$environmentNameId/builds",
)({
	validateSearch: zodValidator(searchSchema),
	component: ProjectBuildsRoute,
	pendingComponent: Layout.Content.Skeleton,
});
