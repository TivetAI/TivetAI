import { getLogger } from "@tivet-gg/actor-common/log";

export const LOGGER_NAME = "actor-client";

export function logger() {
	return getLogger(LOGGER_NAME);
}
