import { ls } from "@/lib/ls";
import { queryClient, tivetClient } from "@/queries/global";
import type { Tivet } from "@tivet-gg/api";
import { useMutation } from "@tanstack/react-query";
import { selfProfileQueryOptions } from "./query-options";

const useAvatarUploadCompleteMutation = () => {
	return useMutation({
		mutationFn: ({ uploadId }: { uploadId: string }) =>
			tivetClient.identity.completeAvatarUpload(uploadId),
		onSuccess() {
			return Promise.all([
				queryClient.invalidateQueries(selfProfileQueryOptions()),
			]);
		},
	});
};

export const useAvatarUploadMutation = () => {
	const { mutateAsync } = useAvatarUploadCompleteMutation();
	return useMutation({
		mutationFn: ({ file }: { file: File }) =>
			tivetClient.identity.prepareAvatarUpload({
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
				uploadId: response.uploadId,
			});
		},
	});
};

export const useIdentityUpdateProfileMutation = () => {
	return useMutation({
		mutationFn: (data: Tivet.identity.UpdateProfileRequest) =>
			tivetClient.identity.updateProfile(data),
		onSuccess: async () => {
			return Promise.all([
				queryClient.invalidateQueries(selfProfileQueryOptions()),
			]);
		},
	});
};

export const useIdentityDeletionMutation = ({
	onSuccess,
}: {
	onSuccess?: () => void;
} = {}) => {
	return useMutation({
		mutationFn: (markDeletion: boolean) =>
			markDeletion
				? tivetClient.identity.markDeletion()
				: tivetClient.identity.unmarkDeletion(),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries(selfProfileQueryOptions()),
			]);
			onSuccess?.();
			return;
		},
	});
};

export const useLogoutMutation = () => {
	return useMutation({
		mutationFn: () =>
			tivetClient.auth.tokens.refreshIdentityToken({ logout: true }),
		async onSuccess(data) {
			await queryClient.clear();
			ls.remove("tivet-token");
		},
	});
};

export const useIdentityTokenMutation = () => {
	return useMutation({ mutationKey: ["identityToken"] });
};
