import type { Tivet } from "@tivet-gg/api";

interface ActorStatusLabelProps extends Tivet.actor.Actor {}

export const ActorStatusLabel = ({
	createdAt,
	startedAt,
	destroyedAt,
}: ActorStatusLabelProps) => {
	const isStarting = createdAt && !startedAt && !destroyedAt;
	const isRunning = createdAt && startedAt && !destroyedAt;
	const isStopped = createdAt && startedAt && destroyedAt;
	const isCrashed = createdAt && !startedAt && destroyedAt;

	if (isRunning) {
		return <span>Running</span>;
	}

	if (isStarting) {
		return <span>Starting</span>;
	}

	if (isCrashed) {
		return <span>Crashed</span>;
	}

	if (isStopped) {
		return <span>Stopped</span>;
	}
};
