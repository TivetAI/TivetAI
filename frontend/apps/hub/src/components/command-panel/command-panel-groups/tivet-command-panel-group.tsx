import { CommandGroup, CommandItem } from "@tivet-gg/components";
import {
	Icon,
	faBook,
	faComment,
	faLifeRing,
	faMessageHeart,
} from "@tivet-gg/icons";
import { useNavigate } from "@tanstack/react-router";

export function TivetCommandGroup() {
	const navigate = useNavigate();
	return (
		<CommandGroup heading="Tivet">
			<CommandItem
				onSelect={() => window.open("https://tivet.gg/docs", "_blank")}
			>
				<Icon icon={faBook} />
				Docs
			</CommandItem>

			<CommandItem
				onSelect={() =>
					navigate({ to: ".", search: { modal: "feedback" } })
				}
			>
				<Icon icon={faComment} />
				Feedback
			</CommandItem>
			<CommandItem
				onSelect={() =>
					window.open("https://tivet.gg/support", "_blank")
				}
			>
				<Icon icon={faLifeRing} />
				Support
			</CommandItem>
			<CommandItem
				onSelect={() =>
					window.open("https://tivet.gg/discord", "_blank")
				}
			>
				<Icon icon={faMessageHeart} />
				Discord
			</CommandItem>
		</CommandGroup>
	);
}
