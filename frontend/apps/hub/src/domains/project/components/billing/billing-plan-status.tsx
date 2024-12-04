import { Tivet } from "@tivet-gg/api-ee";
import { SmallText } from "@tivet-gg/components";
import { format } from "date-fns";
import { useBilling } from "./billing-context";
import { ProjectBillingPlanLabel } from "./billing-plan-badge";

export function BillingPlanStatus() {
	const { activePlan, plan, subscription } = useBilling();

	if (!subscription) {
		return null;
	}

	if (
		activePlan === Tivet.ee.billing.Plan.Trial &&
		plan === Tivet.ee.billing.Plan.Trial
	) {
		return null;
	}

	if (activePlan === plan) {
		return (
			<SmallText>
				Renews on {format(subscription.periodEndTs, "MMMM do")}
			</SmallText>
		);
	}

	if (activePlan !== plan) {
		return (
			<SmallText>
				Downgrades from <ProjectBillingPlanLabel plan={activePlan} /> to{" "}
				<ProjectBillingPlanLabel plan={plan} /> on{" "}
				{format(subscription.periodEndTs, "MMMM do")}
			</SmallText>
		);
	}
}
