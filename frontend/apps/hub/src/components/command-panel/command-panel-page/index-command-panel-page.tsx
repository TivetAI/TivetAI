import { useAuth } from "@/domains/auth/contexts/auth";
import { AllGroupsCommandGroup } from "../command-panel-groups/all-groups-command-panel-group";
import { AllProjectsProjectsCommandGroup } from "../command-panel-groups/all-projects-command-panel-group";
import { TivetCommandGroup } from "../command-panel-groups/tivet-command-panel-group";
import { SuggestionsCommandGroup } from "../command-panel-groups/suggestions-command-panel-group";

export function IndexCommandPanelPage() {
	const auth = useAuth();
	return (
		<>
			<SuggestionsCommandGroup />
			<TivetCommandGroup />
			{auth.profile?.identity.isRegistered ? (
				<>
					<AllGroupsCommandGroup />
					<AllProjectsProjectsCommandGroup />
				</>
			) : null}
		</>
	);
}
