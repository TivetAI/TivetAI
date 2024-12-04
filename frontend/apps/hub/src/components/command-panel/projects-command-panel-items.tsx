import type { Tivet } from "@tivet-gg/api";
import { CommandItem } from "@tivet-gg/components";
import { useCommandPanelNavigation } from "./command-panel-navigation-provider";

interface ProjectsCommandPanelItemsProps {
	projects: Tivet.game.GameSummary[];
	groupId: string;
}

export function ProjectsCommandPanelItems({
	projects,
}: ProjectsCommandPanelItemsProps) {
	const { changePage } = useCommandPanelNavigation();
	return (
		<>
			{projects.map((project) => (
				<CommandItem
					key={project.gameId}
					value={project.gameId}
					keywords={[project.displayName]}
					onSelect={() => {
						changePage({
							key: "project",
							params: { projectNameId: project.nameId },
						});
					}}
				>
					{project.displayName}
				</CommandItem>
			))}
		</>
	);
}
