import * as GroupCreateForm from "@/domains/group/forms/group-create-form";
import { useGroupCreateMutation } from "@/domains/group/queries";
import { BillingProvider } from "@/domains/project/components/billing/billing-context";
import { BillingPlans } from "@/domains/project/components/billing/billing-plans";
import * as GroupCreateProjectForm from "@/domains/project/forms/group-create-project-form";
import {
	projectsByGroupQueryOptions,
	useProjectCreateMutation,
} from "@/domains/project/queries";
import type { Tivet } from "@tivet-gg/api";
import { Tivet as TivetEe } from "@tivet-gg/api-ee";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Skeleton,
} from "@tivet-gg/components";
import * as Sentry from "@sentry/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Navigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Suspense, useState } from "react";

enum Step {
	CreateGroup = 0,
	CreateProject = 1,
	ChoosePlan = 2,
}

interface IntroProps {
	initialStep?: Step;
	initialProjectName?: string;
	onFinish?: (project: Tivet.game.GameSummary) => Promise<void> | void;
}

export function Intro({
	initialStep,
	initialProjectName,
	onFinish,
}: IntroProps) {
	const { mutateAsync, data: createdGroupResponse } =
		useGroupCreateMutation();
	const { mutateAsync: createProject, data: projectCreationData } =
		useProjectCreateMutation();

	const { data } = useSuspenseQuery(projectsByGroupQueryOptions());

	const project =
		data
			.flatMap((team) => team.projects)
			.find(
				(project) => project.gameId === projectCreationData?.gameId,
			) || data.find((team) => team.projects.length > 0)?.projects[0];

	const [step, setStep] = useState<Step>(
		() => initialStep ?? (!project ? Step.CreateGroup : Step.CreateProject),
	);

	const groupId = createdGroupResponse?.groupId || project?.developer.groupId;

	if (step === Step.CreateProject) {
		return (
			<Card asChild className="max-w-xl mx-auto">
				<motion.div layoutId="card">
					<motion.div
						key="create-project"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					>
						<GroupCreateProjectForm.Form
							defaultValues={{
								slug: "",
								name: initialProjectName ?? "",
							}}
							onSubmit={async (values) => {
								await createProject({
									displayName: values.name,
									nameId: values.slug,
									developerGroupId:
										createdGroupResponse?.groupId ||
										data[0].groupId,
								});
								setStep(Step.ChoosePlan);
							}}
						>
							<CardHeader>
								<CardTitle>Create Project</CardTitle>
								<CardDescription>
									You've created a team! Now you can create
									projects and invite teammates.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-[auto_auto_min-content] items-center gap-4 ">
									{initialProjectName ? (
										<GroupCreateProjectForm.SetValue
											name="name"
											value={initialProjectName}
										/>
									) : null}
									<GroupCreateProjectForm.Name className="contents space-y-0" />
									<GroupCreateProjectForm.Slug className="contents space-y-0" />
									<GroupCreateProjectForm.Submit
										type="submit"
										className="col-start-3 row-start-2"
									>
										Create
									</GroupCreateProjectForm.Submit>
								</div>
							</CardContent>
						</GroupCreateProjectForm.Form>
					</motion.div>
				</motion.div>
			</Card>
		);
	}

	if (step === Step.ChoosePlan) {
		if (!groupId || !project) {
			// At this point those values should be defined, if not, we should redirect to the home page
			// It's unlikely that this will happen, but it's better to be safe than sorry
			Sentry.captureMessage(
				"Group or project not defined in Intro component",
				"fatal",
			);
			return <Navigate to="/" replace />;
		}
		return (
			<Suspense
				fallback={
					<Card asChild>
						<motion.div
							layoutId="card"
							key="choose-plan"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
						>
							<CardHeader>
								<CardTitle>
									<Skeleton className="h-6 w-24" />
								</CardTitle>
								<CardDescription>
									<Skeleton className="h-4 w-48" />
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="grid md:grid-cols-4 gap-4">
									<Skeleton className="w-[250px] h-[445px]" />
									<Skeleton className="w-[250px] h-[445px]" />
									<Skeleton className="w-[250px] h-[445px]" />
									<Skeleton className="w-[250px] h-[445px]" />
								</div>
							</CardContent>
						</motion.div>
					</Card>
				}
			>
				<Card asChild>
					<motion.div
						layoutId="card"
						key="choose-plan"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
					>
						<CardHeader>
							<CardTitle>Choose a Plan</CardTitle>
							<CardDescription>
								You've created a team! Now you can create
								projects and invite teammates.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<BillingProvider
								groupId={groupId}
								projectId={project.gameId}
							>
								<BillingPlans
									projectId={project.gameId}
									onChoosePlan={() => {
										return onFinish?.(project);
									}}
									config={{
										[TivetEe.ee.billing.Plan.Trial]: {
											cancelLabel: "Get Started",
											onCancel: () => {
												return onFinish?.(project);
											},
										},
									}}
								/>
							</BillingProvider>
						</CardContent>
					</motion.div>
				</Card>
			</Suspense>
		);
	}

	return (
		<Card asChild className="max-w-md mx-auto">
			<motion.div layoutId="card">
				<motion.div
					key="create-group"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
				>
					<GroupCreateForm.Form
						onSubmit={async (values) => {
							await mutateAsync({
								displayName: values.name,
							});
							setStep(Step.CreateProject);
						}}
						defaultValues={{ name: "" }}
					>
						<CardHeader>
							<CardTitle>Create Team</CardTitle>
							<CardDescription>
								Before you start, you need to create a team.
								This will allow you to create projects and
								invite teammates.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-[auto_min-content] items-center gap-4 ">
								<GroupCreateForm.Name className="contents space-y-0" />
								<GroupCreateForm.Submit
									type="submit"
									className="col-start-2 row-start-2"
								>
									Create
								</GroupCreateForm.Submit>
							</div>
						</CardContent>
					</GroupCreateForm.Form>
				</motion.div>
			</motion.div>
		</Card>
	);
}
