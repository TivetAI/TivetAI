import type { Tivet } from "@tivet-gg/api";
import { Avatar, AvatarFallback, AvatarImage } from "@tivet-gg/components";

interface UserAvatarProps
	extends Pick<Tivet.identity.Handle, "avatarUrl" | "displayName"> {}

export function UserAvatar({ avatarUrl, displayName }: UserAvatarProps) {
	return (
		<Avatar>
			<AvatarImage src={avatarUrl} />
			<AvatarFallback>{displayName[0]}</AvatarFallback>
		</Avatar>
	);
}
