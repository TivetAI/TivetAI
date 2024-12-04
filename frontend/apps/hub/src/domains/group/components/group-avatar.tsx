import type { Tivet } from "@tivet-gg/api";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
	type AvatarProps,
} from "@tivet-gg/components";

interface GroupAvatarProps
	extends Pick<Tivet.group.GroupSummary, "avatarUrl" | "displayName">,
		AvatarProps {}

export function GroupAvatar({
	avatarUrl,
	displayName,
	...props
}: GroupAvatarProps) {
	return (
		<Avatar {...props}>
			<AvatarImage src={avatarUrl} />
			<AvatarFallback>{displayName[0]}</AvatarFallback>
		</Avatar>
	);
}
