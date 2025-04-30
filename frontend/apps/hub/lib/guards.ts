import type { AuthContext } from "@/domains/auth/contexts/auth";
import {
	bootstrapQueryOptions,
	clusterQueryOptions,
} from "@/domains/auth/queries/bootstrap";
import {
	projectByIdQueryOptions,
	projectEnvironmentQueryOptions,
	projectQueryOptions,
	projectsByGroupQueryOptions,
} from "@/domains/project/queries";
import { type QueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
	type ParsedLocation,
	notFound,
	redirect,
} from "@tanstack/react-router";
import type { PropsWithChildren } from "react";
import { ls } from "./ls";
import { isUuid } from "./utils";

export function GuardEnterprise({ children }: PropsWithChildren) {
	const { data: cluster } = useSuspenseQuery(clusterQueryOptions());

	if (cluster === "enterprise") {
		return children;
	}

	return null;
}

export async function guardEnterprise({
	queryClient,
}: { queryClient: QueryClient }) {
	const bootstrap = await queryClient.fetchQuery(bootstrapQueryOptions());

	if (bootstrap.cluster === "oss") {
		throw notFound();
	}
}

export async function guardOssNewbie({
	queryClient,
	auth,
}: { queryClient: QueryClient; auth: AuthContext }) {
	const { cluster } = await queryClient.fetchQuery(bootstrapQueryOptions());

	const { games: projects, groups } = await queryClient.fetchQuery(
		projectsByGroupQueryOptions(),
	);

	if (cluster === "oss" && projects.length === 1) {
		const {
			game: { namespaces },
		} = await queryClient.fetchQuery(
			projectQueryOptions(projects[0].gameId),
		);

		// In case the project has no namespaces, or we failed to fetch the project, redirect to the project page
		if (namespaces.length > 0) {
			throw redirect({
				to: "/projects/$projectNameId/environments/$environmentNameId",
				params: {
					projectNameId: projects[0].nameId,
					environmentNameId: namespaces[0].nameId,
				},
				from: "/",
			});
		}
		throw redirect({
			to: "/projects/$projectNameId",
			params: {
				projectNameId: projects[0].nameId,
			},
			from: "/",
		});
	}

	const lastTeam = ls.recentTeam.get(auth);

	if (lastTeam) {
		throw redirect({
			to: "/teams/$groupId",
			params: { groupId: lastTeam },
			from: "/",
		});
	}

	if (groups.length > 0) {
		throw redirect({
			to: "/teams/$groupId",
			params: { groupId: groups[0].groupId },
			from: "/",
		});
	}
}

export async function guardUuids({
	queryClient,
	projectNameId,
	environmentNameId,
	location,
}: {
	queryClient: QueryClient;
	projectNameId: string;
	environmentNameId: string | undefined;
	location: ParsedLocation;
}) {
	let pathname = location.pathname;

	if (isUuid(projectNameId)) {
		const response = await queryClient.fetchQuery(
			projectsByGroupQueryOptions(),
		);
		const project = response?.games.find((p) => p.gameId === projectNameId);
		if (project) {
			pathname = pathname.replace(projectNameId, project.nameId);
		}
	}

	if (environmentNameId && isUuid(environmentNameId)) {
		const { games: projects } = await queryClient.fetchQuery(
			projectByIdQueryOptions(projectNameId),
		);

		const envProject = projects.find((p) => p.nameId === projectNameId);

		if (!envProject) {
			// bail out if we can't find the project
			return;
		}

		const { namespace: environment } = await queryClient.fetchQuery(
			projectEnvironmentQueryOptions({
				projectId: envProject.gameId,
				environmentId: environmentNameId,
			}),
		);

		if (!environment) {
			// bail out if we can't find the environment
			return;
		}

		pathname = pathname.replace(environmentNameId, environment.nameId);
	}

	if (pathname !== location.pathname) {
		throw redirect({
			to: pathname,
			replace: true,
		});
	}
}

/** New: Utility to preload multiple queries at once */
export async function preloadQueries(
	queryClient: QueryClient,
	queryOptionsList: Parameters<QueryClient["fetchQuery"]>[0][],
) {
	await Promise.all(queryOptionsList.map((opts) => queryClient.fetchQuery(opts)));
}

/** New: Guard for user roles, throws redirect if role is insufficient */
export async function guardRole({
	auth,
	requiredRole,
}: {
	auth: AuthContext;
	requiredRole: string;
}) {
	if (!auth.userRoles.includes(requiredRole)) {
		throw redirect({
			to: "/unauthorized",
		});
	}
}

/** New: Redirect helper for projects with no environments */
export async function guardProjectHasEnvironments({
	queryClient,
	projectId,
}: {
	queryClient: QueryClient;
	projectId: string;
}) {
	const projectData = await queryClient.fetchQuery(projectQueryOptions(projectId));
	if (projectData.game.namespaces.length === 0) {
		throw redirect({
			to: "/projects/$projectNameId",
			params: { projectNameId: projectData.game.nameId },
		});
	}
}

/** New: Validates and normalizes project and environment IDs */
export async function validateAndNormalizeIds({
	queryClient,
	projectNameId,
	environmentNameId,
}: {
	queryClient: QueryClient;
	projectNameId: string;
	environmentNameId?: string;
}) {
	let normalizedProjectNameId = projectNameId;
	let normalizedEnvironmentNameId = environmentNameId;

	if (isUuid(projectNameId)) {
		const response = await queryClient.fetchQuery(projectsByGroupQueryOptions());
		const project = response?.games.find((p) => p.gameId === projectNameId);
		if (project) {
			normalizedProjectNameId = project.nameId;
		}
	}

	if (environmentNameId && isUuid(environmentNameId)) {
		const envResponse = await queryClient.fetchQuery(
			projectEnvironmentQueryOptions({
				projectId: normalizedProjectNameId,
				environmentId: environmentNameId,
			}),
		);

		if (envResponse.namespace) {
			normalizedEnvironmentNameId = envResponse.namespace.nameId;
		}
	}

	return { normalizedProjectNameId, normalizedEnvironmentNameId };
}

/** New: Guard to ensure user is authenticated */
export async function guardAuthenticated({ auth }: { auth: AuthContext }) {
	if (!auth.isAuthenticated) {
		throw redirect({ to: "/login" });
	}
}

/** New: Guard to check project membership */
export async function guardProjectMembership({
	auth,
	queryClient,
	projectId,
}: {
	auth: AuthContext;
	queryClient: QueryClient;
	projectId: string;
}) {
	const membership = await queryClient.fetchQuery(projectByIdQueryOptions(projectId));
	const userIsMember = membership.games.some((game) =>
		auth.userTeams.includes(game.groupId),
	);
	if (!userIsMember) {
		throw redirect({ to: "/unauthorized" });
	}
}

/** New: Utility for extracting param or throwing */
export function getParamOrThrow(
	params: Record<string, string | undefined>,
	key: string,
): string {
	const value = params[key];
	if (!value) {
		throw notFound();
	}
	return value;
}

/** New: Guard to check if current project is archived */
export async function guardProjectNotArchived({
	queryClient,
	projectId,
}: {
	queryClient: QueryClient;
	projectId: string;
}) {
	const project = await queryClient.fetchQuery(projectByIdQueryOptions(projectId));
	if (project.game.isArchived) {
		throw redirect({
			to: "/projects-archived",
		});
	}
}

/** New: Guard to ensure environment is active */
export async function guardEnvironmentActive({
	queryClient,
	projectId,
	environmentNameId,
}: {
	queryClient: QueryClient;
	projectId: string;
	environmentNameId: string;
}) {
	const envData = await queryClient.fetchQuery(
		projectEnvironmentQueryOptions({
			projectId,
			environmentId: environmentNameId,
		}),
	);

	if (!envData.namespace.isActive) {
		throw redirect({
			to: `/projects/${projectId}/environments`,
		});
	}
}
