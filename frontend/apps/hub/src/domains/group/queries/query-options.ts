import { tivetClient, tivetEeClient } from "@/queries/global";
import { getMetaWatchIndex } from "@/queries/utils";
import { queryOptions } from "@tanstack/react-query";

export const groupMembersQueryOptions = (groupId: string) => {
	return queryOptions({
		queryKey: ["group", groupId],
		queryFn: ({ meta, signal }) =>
			tivetClient.group.getMembers(
				groupId,
				{
					watchIndex: getMetaWatchIndex(meta),
				},
				{ abortSignal: signal },
			),
	});
};

export const groupBillingQueryOptions = (groupId: string) => {
	return queryOptions({
		queryKey: ["group", groupId, "billing"],
		queryFn: ({ signal }) =>
			tivetEeClient.ee.cloud.groups.billing.get(
				groupId,
				{},
				{
					abortSignal: signal,
				},
			),
	});
};

export const groupInviteQueryOptions = (inviteId: string) => {
	return queryOptions({
		queryKey: ["groupInvite", inviteId],
		queryFn: ({ signal }) =>
			tivetClient.group.invites.getInvite(inviteId, {
				abortSignal: signal,
			}),
	});
};

export const groupMemberQueryOptions = ({
	groupId,
	identityId,
}: {
	groupId: string;
	identityId: string;
}) => {
	return queryOptions({
		...groupMembersQueryOptions(groupId),
		select: (data) =>
			data.members.find((m) => m.identity.identityId === identityId),
	});
};
