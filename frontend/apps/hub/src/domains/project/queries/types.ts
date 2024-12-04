import type { Tivet } from "@tivet-gg/api";
import type { LobbyStatus } from "../data/lobby-status";

export type GroupProjects = Tivet.group.GroupSummary & {
	projects: Tivet.game.GameSummary[];
};

export type Project = Tivet.game.GameSummary & {
	namespaces: Tivet.cloud.NamespaceSummary[];
};

export type Environment = Tivet.cloud.NamespaceSummary & {
	version: Tivet.cloud.version.Summary | undefined;
};

export type LobbySummary = Tivet.cloud.LogsLobbySummary & {
	readableStatus: LobbyStatus;
};

export type LiveLobbyLogs = Tivet.cloud.LobbySummaryAnalytics & {
	readableStatus: LobbyStatus;
};
export * from "./backend/types";
