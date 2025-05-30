import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@tivet-gg/components";
import { Icon, faEllipsisH } from "@tivet-gg/icons";

export function ProjectEnvironmentsTableActions() {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button aria-haspopup="true" size="icon" variant="ghost">
					<Icon className="size-4" icon={faEllipsisH} />
					<span className="sr-only">Toggle menu</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem>Manage</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
