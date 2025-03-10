// @ts-types="../../common/dist/log.d.ts"
import { getLogger } from "@tivet-gg/actor-common/log";

export const LOGGER_NAME = "actor-manager";

export function logger() {
	return getLogger(LOGGER_NAME);
}
