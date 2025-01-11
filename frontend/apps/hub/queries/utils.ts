import type { Tivet } from "@tivet-gg/api";
import type { QueryMeta } from "@tanstack/react-query";

export const getMetaWatchIndex = (
	meta: QueryMeta | undefined,
): Tivet.WatchQuery => {
	return meta?.__watcher?.index;
};
