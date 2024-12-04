import type { Tivet } from "@tivet-gg/api";
import { useMutation } from "@tanstack/react-query";
import { queryClient, tivetClient } from "../../../queries/global";

export const useStartEmailVerificationMutation = () => {
	return useMutation({
		mutationFn: (data: Tivet.auth.identity.StartEmailVerificationRequest) =>
			tivetClient.auth.identity.email.startEmailVerification(data),
	});
};

export const useCompleteEmailVerificationMutation = (
	opts: {
		onSuccess?: (
			data: Tivet.auth.identity.CompleteEmailVerificationResponse,
		) => void;
	} = {},
) => {
	return useMutation({
		mutationFn: (
			data: Tivet.auth.identity.CompleteEmailVerificationRequest,
		) => tivetClient.auth.identity.email.completeEmailVerification(data),
		...opts,
	});
};

export const deviceLinkTokenQueryOptions = (deviceLinkToken: string) => {
	return {
		queryKey: ["deviceLinkToken", deviceLinkToken],
		queryFn: () => tivetClient.cloud.devices.links.get({ deviceLinkToken }),
	};
};

export const useCompleteDeviceLinkMutation = () => {
	return useMutation({
		mutationFn: (
			data: Tivet.cloud.devices.links.CompleteDeviceLinkRequest,
		) => tivetClient.cloud.devices.links.complete(data),
		onSuccess: (_, values) => {
			queryClient.invalidateQueries(
				deviceLinkTokenQueryOptions(values.deviceLinkToken),
			);
		},
	});
};
