import { faSpinnerThird } from "@tivet-gg/icons";
import { Icon } from "@tivet-gg/icons";
import { Flex } from "./flex";

export function DialogActivityIndicator() {
	return (
		<Flex direction="row" gap="2" items="center" justify="center" my="10">
			<Icon icon={faSpinnerThird} className="mr-2 size-4 animate-spin" />
		</Flex>
	);
}
