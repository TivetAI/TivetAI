import * as GroupCreateForm from "@/domains/group/forms/group-create-form";
import type { Tivet } from "@tivet-gg/api";
import {
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Flex,
} from "@tivet-gg/components";
import { useGroupCreateMutation } from "../../queries";

interface CreateGroupDialogContentProps {
	onSuccess?: (data: Tivet.group.CreateResponse) => void;
}

export default function CreateGroupDialogContent({
	onSuccess,
}: CreateGroupDialogContentProps) {
	const { mutateAsync } = useGroupCreateMutation({
		onSuccess,
	});

	return (
		<>
			<GroupCreateForm.Form
				onSubmit={async (values) => {
					await mutateAsync({
						displayName: values.name,
					});
				}}
				defaultValues={{ name: "" }}
			>
				<DialogHeader>
					<DialogTitle>Create New Team</DialogTitle>
				</DialogHeader>
				<Flex gap="4" direction="col">
					<GroupCreateForm.Name />
				</Flex>
				<DialogFooter>
					<GroupCreateForm.Submit type="submit">
						Create
					</GroupCreateForm.Submit>
				</DialogFooter>
			</GroupCreateForm.Form>
		</>
	);
}
