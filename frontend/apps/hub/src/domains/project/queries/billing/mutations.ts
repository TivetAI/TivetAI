import { queryClient, tivetEeClient } from "@/queries/global";
import type { Tivet as TivetEe } from "@tivet-gg/api-ee";
import { useMutation } from "@tanstack/react-query";
import { projectBillingQueryOptions } from "../billing/query-options";

export const useUpdateProjectBillingMutation = ({
	onSuccess,
}: {
	onSuccess?: () => void;
}) => {
	return useMutation({
		mutationFn: ({
			projectId,
			plan,
		}: {
			projectId: string;
		} & TivetEe.ee.cloud.games.billing.UpdatePlanRequest) =>
			tivetEeClient.ee.cloud.games.billing.updatePlan(projectId, {
				plan,
			}),
		onSuccess: async (data, values) => {
			await queryClient.invalidateQueries(
				projectBillingQueryOptions(values.projectId),
			);
			onSuccess?.();
		},
	});
};

export const useCreateBillingPortalSessionMutation = () => {
	return useMutation({
		mutationFn: ({
			groupId,
			intent,
		}: {
			groupId: string;
		} & TivetEe.ee.cloud.groups.billing.CreateStripePortalSessionRequest) =>
			tivetEeClient.ee.cloud.groups.billing.createStripePortalSession(
				groupId,
				{
					intent,
				},
			),
		onSuccess: async (data) => {
			window.open(data.stripeSessionUrl, "_blank");
		},
	});
};
