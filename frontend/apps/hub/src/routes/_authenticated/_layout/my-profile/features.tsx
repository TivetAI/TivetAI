import { type FeatureFlag, useFeatureFlag } from "@/hooks/use-feature-flag";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Flex,
	Strong,
	Switch,
	Text,
	Button,
	Tooltip,
} from "@tivet-gg/components";
import { createFileRoute } from "@tanstack/react-router";
import { usePostHog } from "posthog-js/react";
import type { ReactNode, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface FeatureCardProps {
	title: string;
	description: ReactNode;
	featureFlag: FeatureFlag;
	onChanged: (enabled: boolean) => void;
	disabled?: boolean;
}

function FeatureCard({
	title,
	description,
	featureFlag,
	onChanged,
	disabled,
}: FeatureCardProps) {
	const isEnabled = useFeatureFlag(featureFlag);

	return (
		<Card aria-live="polite" aria-atomic="true" role="region" tabIndex={0}>
			<CardHeader>
				<Flex justify="between" align="center">
					<CardTitle>{title}</CardTitle>
					<Tooltip
						content={
							disabled
								? "This feature cannot be toggled due to dependencies"
								: `Toggle feature flag ${featureFlag}`
						}
					>
						<span>
							<Switch
								data-feature-flag-name={featureFlag}
								checked={isEnabled}
								disabled={disabled}
								onCheckedChange={onChanged}
								aria-label={`Toggle ${title}`}
							/>
						</span>
					</Tooltip>
				</Flex>
			</CardHeader>
			<CardContent>
				<Text as="div" style={{ lineHeight: "1.5em" }}>
					{typeof description === "string" ? (
						<ReactMarkdown>{description}</ReactMarkdown>
					) : (
						description
					)}
				</Text>
			</CardContent>
		</Card>
	);
}

const FEATURE_FLAGS: FeatureFlag[] = [
	"hub-dynamic-servers",
	"hub-new-dashboard",
	"hub-beta-analytics",
	"hub-dark-mode",
	"hub-experimental-api",
];

function MyProfileFeaturesRoute() {
	const posthog = usePostHog();
	// Mock local state for toggles — replace with your actual persistence method
	const [toggles, setToggles] = React.useState<Record<string, boolean>>(() => {
		const stored = localStorage.getItem("feature-toggles");
		return stored ? JSON.parse(stored) : {};
	});

	useEffect(() => {
		localStorage.setItem("feature-toggles", JSON.stringify(toggles));
	}, [toggles]);

	const handleToggle = (flag: FeatureFlag) => (enabled: boolean) => {
		setToggles((prev) => ({ ...prev, [flag]: enabled }));
		posthog?.capture("Feature Flag Toggled", {
			featureFlag: flag,
			enabled,
		});
		// TODO: Add API call to update backend flag state
	};

	// Example dependency: disable beta analytics toggle if new dashboard is off
	const isNewDashboardEnabled = toggles["hub-new-dashboard"] ?? useFeatureFlag("hub-new-dashboard");

	return (
		<>
			<FeatureCard
				title="Servers and Builds"
				description={
					<>
						Servers and Builds are the new way for managing your project servers. They replace legacy namespaces and versions. Turn this feature off to use the legacy system. <Strong>Not recommended for new users.</Strong>
					</>
				}
				featureFlag="hub-dynamic-servers"
				onChanged={handleToggle("hub-dynamic-servers")}
			/>

			<FeatureCard
				title="New Dashboard"
				description="A redesigned dashboard for a streamlined experience."
				featureFlag="hub-new-dashboard"
				onChanged={handleToggle("hub-new-dashboard")}
			/>

			<FeatureCard
				title="Beta Analytics"
				description="Enable experimental analytics features. Requires New Dashboard."
				featureFlag="hub-beta-analytics"
				onChanged={handleToggle("hub-beta-analytics")}
				disabled={!isNewDashboardEnabled}
			/>

			<FeatureCard
				title="Dark Mode"
				description="Switch the UI to a dark color theme."
				featureFlag="hub-dark-mode"
				onChanged={handleToggle("hub-dark-mode")}
			/>

			<FeatureCard
				title="Experimental API"
				description="Access to the cutting-edge API endpoints. Use with caution."
				featureFlag="hub-experimental-api"
				onChanged={handleToggle("hub-experimental-api")}
			/>

			<Flex justify="end" style={{ marginTop: "1rem" }}>
				<Button
					aria-label="Reset all feature flags to default"
					onClick={() => {
						setToggles({});
						posthog?.capture("Feature Flags Reset");
					}}
					variant="outline"
					color="danger"
				>
					Reset All Flags
				</Button>
			</Flex>
		</>
	);
}

// Error boundary to catch any rendering issues inside the feature flag page
class ErrorBoundary extends React.Component<
	{ children: ReactNode },
	{ hasError: boolean }
> {
	constructor(props: { children: ReactNode }) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError() {
		return { hasError: true };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("Error in Feature Flags UI:", error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			return <Text color="danger">Failed to load features. Please try again later.</Text>;
		}

		return this.props.children;
	}
}

export const Route = createFileRoute(
	"/_authenticated/_layout/my-profile/features",
)({
	component: () => (
		<ErrorBoundary>
			<MyProfileFeaturesRoute />
		</ErrorBoundary>
	),
});
