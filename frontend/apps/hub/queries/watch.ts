import type { Query, QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { queryClient } from "./global";

const watchResponseFragment = z.object({
	watch: z.object({ index: z.string() }),
});

// Internal state for active watchers
const activeWatchers = new Map<string, { cancelled: boolean; pauseCount: number }>();

// Debug flag to enable verbose logging
const DEBUG_WATCH = false;

function log(...args: unknown[]) {
	if (DEBUG_WATCH) {
		console.debug("[watchBlockingQueries]", ...args);
	}
}

/**
 * Watches a given query for server-sent events or incremental updates.
 * Supports retries with exponential backoff on transient failures.
 */
async function watch(query: Query) {
	const key = JSON.stringify(query.queryKey);
	if (activeWatchers.has(key)) {
		// Already watching this query
		log("Already watching", key);
		return;
	}

	// Initialize watcher control state
	activeWatchers.set(key, { cancelled: false, pauseCount: 0 });

	log("Starting watch loop for", key);

	let retryCount = 0;

	while (true) {
		const state = activeWatchers.get(key);
		if (!state || state.cancelled) {
			log("Watcher cancelled, stopping", key);
			break;
		}

		if (state.pauseCount > 0) {
			log("Watcher paused, waiting", key);
			await new Promise((resolve) => setTimeout(resolve, 1000));
			continue;
		}

		try {
			await query.promise;
		} catch (error) {
			log("Query failed or cancelled, stopping watch", key, error);
			break;
		}

		const watchQueryState = queryClient.getQueryState([...query.queryKey, "watch"]);
		if (watchQueryState?.fetchStatus === "fetching") {
			log("Watch query already fetching, skipping iteration", key);
			await new Promise((resolve) => setTimeout(resolve, 1000));
			continue;
		}

		const watchOptsParseResult = watchResponseFragment.safeParse(query.state.data);
		if (!watchOptsParseResult.success) {
			log("No watch options found, stopping watch", key);
			break;
		}
		const watchOpts = watchOptsParseResult.data;

		try {
			const result = await queryClient.fetchQuery({
				...query.options,
				retry: 0,
				gcTime: 0,
				staleTime: 0,
				queryKey: [...query.queryKey, "watch"],
				queryHash: JSON.stringify([...query.queryKey, "watch"]),
				meta: { __watcher: { index: watchOpts.watch.index } },
			});

			if (!result) {
				log("No result from watch query, stopping", key);
				break;
			}

			queryClient.setQueryData(
				query.queryKey,
				typeof query.meta?.watch === "function"
					? query.meta.watch(query.state.data, result)
					: result,
			);

			retryCount = 0; // reset retry count on success
		} catch (error) {
			log("Error during watch fetch, retrying", key, error);
			retryCount++;
			if (retryCount > 5) {
				log("Max retries reached, stopping watch", key);
				break;
			}
			const backoffDelay = Math.min(1000 * 2 ** retryCount, 30000);
			await new Promise((resolve) => setTimeout(resolve, backoffDelay));
		}
	}

	activeWatchers.delete(key);
	log("Watch loop ended for", key);
}

/**
 * Stops watching a query if there are no more observers.
 */
async function stopWatching(query: Query) {
	const key = JSON.stringify(query.queryKey);
	const watcher = activeWatchers.get(key);
	if (!watcher) return;

	if (query.getObserversCount() <= 0) {
		log("No observers left, cancelling watch for", key);
		watcher.cancelled = true;

		const watchQuery = queryClient.getQueryCache().find({ queryKey: [...query.queryKey, "watch"] });
		if (watchQuery) {
			watchQuery.cancel();
			watchQuery.destroy();
		}
	}
}

/**
 * Pause watching for a specific query key
 */
export function pauseWatching(queryKey: unknown[]) {
	const key = JSON.stringify(queryKey);
	const watcher = activeWatchers.get(key);
	if (watcher) {
		watcher.pauseCount++;
		log("Paused watcher", key, "count", watcher.pauseCount);
	}
}

/**
 * Resume watching for a specific query key
 */
export function resumeWatching(queryKey: unknown[]) {
	const key = JSON.stringify(queryKey);
	const watcher = activeWatchers.get(key);
	if (watcher && watcher.pauseCount > 0) {
		watcher.pauseCount--;
		log("Resumed watcher", key, "count", watcher.pauseCount);
	}
}

/**
 * Force restart watching a specific query
 */
export async function restartWatching(query: Query) {
	const key = JSON.stringify(query.queryKey);
	const watcher = activeWatchers.get(key);
	if (watcher) {
		watcher.cancelled = true;
		await new Promise((r) => setTimeout(r, 100)); // give some time for loop to exit
	}
	watch(query);
}

/**
 * Subscribe to the query cache to auto-start and stop watchers
 */
export function watchBlockingQueries(queryClient: QueryClient) {
	queryClient.getQueryCache().subscribe((event) => {
		if (event.type === "observerAdded") {
			if (event.query.meta?.watch) {
				log("Observer added, starting watch", JSON.stringify(event.query.queryKey));
				watch(event.query);
			}
		}
		if (event.type === "observerRemoved") {
			log("Observer removed, checking stop watch", JSON.stringify(event.query.queryKey));
			stopWatching(event.query);
		}
		if (event.type === "queryCacheUpdate") {
			// Optionally handle query cache updates if needed
			// log("Query cache updated", JSON.stringify(event.query.queryKey));
		}
	});
}
