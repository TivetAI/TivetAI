import { Link } from "@tivet-gg/components";

interface BackendDeploymentLinkProps {
	url: string;
}

export function BackendDeploymentLink({ url }: BackendDeploymentLinkProps) {
	return (
		<Link href={url} target="_blank" rel="noreferrer">
			{url}
		</Link>
	);
}
