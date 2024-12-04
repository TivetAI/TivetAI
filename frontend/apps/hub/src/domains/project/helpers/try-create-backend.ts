import { bootstrapQueryOptions } from "@/domains/auth/queries/bootstrap";
import { isTivetError } from "@/lib/utils";
import { tivetEeClient } from "@/queries/global";
import type { QueryClient } from "@tanstack/react-query";
import { projectBackendQueryOptions } from "../queries";

export async function tryCreateBackend({
	projectId,
	environmentId,
	queryClient,
}: {
	projectId: string;
	environmentId: string;
	queryClient: QueryClient;
}) {
	const { cluster } = await queryClient.fetchQuery(bootstrapQueryOptions());

	if (cluster === "oss") {
		return;
	}

	try {
		await queryClient.fetchQuery(
			projectBackendQueryOptions({ projectId, environmentId }),
		);
	} catch (error) {
		if (isTivetError(error)) {
			if (error.body.code === "BACKEND_NOT_FOUND") {
				await tivetEeClient.ee.backend.create(
					projectId,
					environmentId,
					{},
				);
				await queryClient.invalidateQueries({
					...projectBackendQueryOptions({ projectId, environmentId }),
					refetchType: "all",
				});
				return;
			}
		}
	}
	return;
}
