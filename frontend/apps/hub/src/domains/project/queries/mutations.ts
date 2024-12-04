import { queryClient, tivetClient } from "@/queries/global";
import type { Tivet } from "@tivet-gg/api";
import { toast } from "@tivet-gg/components";
import { useMutation } from "@tanstack/react-query";
import {
	projectQueryOptions,
	projectsByGroupQueryOptions,
} from "./query-options";

export const useProjectCreateMutation = ({
	onSuccess,
}: {
	onSuccess?: (data: Tivet.cloud.GameFull) => void;
} = {}) => {
	return useMutation({
		mutationFn: async (data: Tivet.cloud.games.CreateGameRequest) =>
			tivetClient.cloud.games.createGame(data),
		onSuccess: async (data) => {
			await queryClient.invalidateQueries(projectsByGroupQueryOptions());
			const project = await queryClient.ensureQueryData(
				projectQueryOptions(data.gameId),
			);
			await onSuccess?.(project.game);
		},
	});
};

export const useEnvironmentCreateMutation = ({
	onSuccess,
}: {
	onSuccess?: (
		data: Tivet.cloud.games.namespaces.CreateGameNamespaceResponse,
	) => void;
} = {}) => {
	return useMutation({
		mutationFn: ({
			projectId,
			...data
		}: Tivet.cloud.games.namespaces.CreateGameNamespaceRequest & {
			projectId: string;
		}) =>
			tivetClient.cloud.games.namespaces.createGameNamespace(
				projectId,
				data,
			),
		onSuccess: async (data, values) => {
			await Promise.all([
				queryClient.invalidateQueries(
					projectQueryOptions(values.projectId),
				),
				queryClient.invalidateQueries(projectsByGroupQueryOptions()),
			]);
			onSuccess?.(data);
		},
	});
};

export const useExportLobbyLogsMutation = () => {
	return useMutation({
		mutationFn: ({
			projectId,
			lobbyId,
			stream,
		}: {
			projectId: string;
			lobbyId: string;
		} & Tivet.cloud.games.ExportLobbyLogsRequest) =>
			tivetClient.cloud.games.matchmaker.exportLobbyLogs(
				projectId,
				lobbyId,
				{
					stream,
				},
			),
		onSuccess: async (data) => {
			window.open(data.url, "_blank");
			toast.success("Logs exported successfully");
		},
	});
};

const useProjectLogoUploadCompleteMutation = () => {
	return useMutation({
		mutationFn: ({
			projectId,
			uploadId,
		}: { projectId: string; uploadId: string }) =>
			tivetClient.cloud.games.gameLogoUploadComplete(projectId, uploadId),
		onSuccess(_, variables) {
			return Promise.all([
				queryClient.invalidateQueries(
					projectQueryOptions(variables.projectId),
				),
				queryClient.invalidateQueries(projectsByGroupQueryOptions()),
			]);
		},
	});
};

export const useProjectLogoUploadMutation = (projectId: string) => {
	const { mutateAsync } = useProjectLogoUploadCompleteMutation();
	return useMutation({
		mutationFn: ({ file }: { file: File }) =>
			tivetClient.cloud.games.gameLogoUploadPrepare(projectId, {
				mime: file.type,
				contentLength: file.size,
				path: file.name,
			}),
		onSuccess: async (response, data) => {
			await fetch(response.presignedRequest.url, {
				method: "PUT",
				body: data.file,
				mode: "cors",
				headers: {
					"Content-Type": data.file.type,
				},
			});
			await mutateAsync({
				projectId,
				uploadId: response.uploadId,
			});
		},
	});
};
