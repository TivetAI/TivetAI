import { projectsByGroupQueryOptions } from "@/domains/project/queries";
import { isTivetError } from "@/lib/utils";
import { queryClient, tivetClient } from "@/queries/global";
import type { Tivet } from "@tivet-gg/api";
import { toast } from "@tivet-gg/components";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { groupMembersQueryOptions } from "./query-options";

export const useGroupUpdateProfileMutation = () => {
	return useMutation({
		mutationFn: ({
			groupId,
			...data
		}: Tivet.group.UpdateProfileRequest & { groupId: string }) =>
			tivetClient.group.updateProfile(groupId, data),
		onSuccess: async (_, variables) => {
			return Promise.all([
				queryClient.invalidateQueries(
					groupMembersQueryOptions(variables.groupId),
				),
				queryClient.invalidateQueries(projectsByGroupQueryOptions()),
			]);
		},
	});
};

const useAvatarUploadCompleteMutation = () => {
	return useMutation({
		mutationFn: ({
			groupId,
			uploadId,
		}: {
			groupId: string;
			uploadId: string;
		}) => tivetClient.group.completeAvatarUpload(groupId, uploadId),
		onSuccess(_, variables) {
			return Promise.all([
				queryClient.invalidateQueries(
					groupMembersQueryOptions(variables.groupId),
				),
				queryClient.invalidateQueries(projectsByGroupQueryOptions()),
			]);
		},
	});
};

export const useAvatarUploadMutation = (groupId: string) => {
	const { mutateAsync } = useAvatarUploadCompleteMutation();
	return useMutation({
		mutationFn: ({ file }: { file: File }) =>
			tivetClient.group.prepareAvatarUpload({
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
				groupId: groupId,
				uploadId: response.uploadId,
			});
		},
	});
};

export const useGroupTransferOwnershipMutation = ({
	onSuccess,
}: {
	onSuccess?: () => void;
} = {}) => {
	return useMutation({
		mutationFn: ({
			groupId,
			...rest
		}: { groupId: string } & Tivet.group.TransferOwnershipRequest) =>
			tivetClient.group.transferOwnership(groupId, rest),
		onSuccess: async (_, variables) => {
			await Promise.all([
				queryClient.invalidateQueries(projectsByGroupQueryOptions()),
				queryClient.invalidateQueries(
					groupMembersQueryOptions(variables.groupId),
				),
			]);
			onSuccess?.();
		},
	});
};

export const useGroupKickMemberMutation = ({
	onSuccess,
}: {
	onSuccess?: () => void;
} = {}) => {
	return useMutation({
		mutationFn: ({
			groupId,
			identityId,
		}: {
			groupId: string;
			identityId: string;
		}) => tivetClient.group.kickMember(groupId, identityId),
		onSuccess: async (_, variables) => {
			await Promise.all([
				queryClient.invalidateQueries(projectsByGroupQueryOptions()),
				queryClient.invalidateQueries(
					groupMembersQueryOptions(variables.groupId),
				),
			]);
			onSuccess?.();
		},
	});
};

export const useGroupBanMemberMutation = ({
	onSuccess,
}: {
	onSuccess?: () => void;
} = {}) => {
	return useMutation({
		mutationFn: ({
			groupId,
			identityId,
		}: {
			groupId: string;
			identityId: string;
		}) => tivetClient.group.banIdentity(groupId, identityId),
		onSuccess: async (_, variables) => {
			await Promise.all([
				queryClient.invalidateQueries(projectsByGroupQueryOptions()),
				queryClient.invalidateQueries(
					groupMembersQueryOptions(variables.groupId),
				),
			]);
			onSuccess?.();
		},
	});
};

export const useGroupInviteMutation = () => {
	return useMutation({
		mutationFn: ({
			groupId,
			...rest
		}: { groupId: string } & Tivet.group.CreateInviteRequest) =>
			tivetClient.group.invites.createInvite(groupId, rest),
	});
};

export const useGroupCreateMutation = ({
	onSuccess,
}: {
	onSuccess?: (data: Tivet.group.CreateResponse) => void;
} = {}) => {
	return useMutation({
		mutationFn: (data: Tivet.group.CreateRequest) =>
			tivetClient.group.create(data),
		onSuccess: async (data) => {
			await queryClient.invalidateQueries({
				...projectsByGroupQueryOptions(),
				refetchType: "all",
			});
			onSuccess?.(data);
		},
	});
};

export const useGroupInviteAcceptMutation = () => {
	const navigate = useNavigate();
	return useMutation({
		mutationFn: (inviteId: string) =>
			tivetClient.group.invites.consumeInvite(inviteId),
		onSuccess: async (data) => {
			await queryClient.invalidateQueries(projectsByGroupQueryOptions());
			if (data.groupId) {
				navigate({
					to: "/teams/$groupId",
					params: { groupId: data.groupId },
				});
			}
		},
		meta: {
			hideErrorToast: true,
		},
	});
};

export const useGroupLeaveMutation = ({
	onSuccess,
}: {
	onSuccess?: () => void;
} = {}) => {
	return useMutation({
		mutationFn: (groupId: string) => tivetClient.group.leave(groupId),
		onSuccess: async () => {
			await queryClient.invalidateQueries(projectsByGroupQueryOptions());
			onSuccess?.();
		},
		onError: (error) => {
			if (isTivetError(error)) {
				return toast.error("Failed to leave team", {
					description: error.body.message,
				});
			}
			return toast.error("Failed to leave team.");
		},
	});
};
