import { ls } from "@/lib/ls";
import { isTivetError } from "@/lib/utils";
import { TivetClient } from "@tivet-gg/api";
import { TivetClient as TivetEeClient } from "@tivet-gg/api-ee";
import { type APIResponse, type Fetcher, fetcher } from "@tivet-gg/api/core";
import { getConfig, timing, toast } from "@tivet-gg/components";
import { broadcastQueryClient } from "@tanstack/query-broadcast-client-experimental";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import {
	MutationCache,
	MutationObserver,
	QueryCache,
	QueryClient,
	useQuery,
	useMutation,
	QueryObserverOptions,
	MutationObserverOptions,
} from "@tanstack/react-query";
import superjson from "superjson";
import { watchBlockingQueries } from "./watch";

declare module "@tanstack/react-query" {
	interface Register {
		queryMeta: {
			__watcher?: { index: string };
			watch?: true | ((oldData: unknown, streamChunk: unknown) => unknown);
			updateCache?: (
				data: any,
				queryClient: QueryClient,
			) => Promise<void> | void;
			hideErrorToast?: boolean;
			optimisticUpdate?: (oldData: any) => any;
			onSuccessSideEffect?: () => void;
		};
	}
}

// Cancellation helper to cancel all ongoing queries
export const cancelAllQueries = async () => {
	await queryClient.cancelQueries();
};

// Concurrency lock for token refresh
let refreshingToken: Promise<void> | null = null;

const refreshIdentityToken = async () => {
	if (refreshingToken) {
		return refreshingToken;
	}
	const mutation = queryClient.getMutationCache().getAll().find((m) => m.options.mutationKey?.[0] === "identityToken");
	if (mutation && mutation.state.status === "loading") {
		refreshingToken = mutation.mutateAsync();
	} else {
		refreshingToken = queryClient.fetchMutation(["identityToken"]);
	}
	try {
		await refreshingToken;
	} finally {
		refreshingToken = null;
	}
};

const logout = async () => {
	await cancelAllQueries();
	queryClient.clear();
	ls.remove("tivet-token");
	window.location.reload();
};

const queryCache = new QueryCache({
	onSuccess: async (data, query) => {
		if (query.meta?.updateCache) {
			await query.meta.updateCache(data, queryClient);
		}
	},
	onError: async (error) => {
		if (isTivetError(error)) {
			if (
				error.body.code === "TOKEN_REVOKED" ||
				error.body.code === "TOKEN_INVALID" ||
				error.body.code === "CLAIMS_ENTITLEMENT_EXPIRED"
			) {
				await logout();
			}
		}
	},
});

const mutationCache = new MutationCache({
	onError(error, variables, context, mutation) {
		console.error("[Mutation error]", error);
		if (mutation.meta?.hideErrorToast) {
			return;
		}
		toast.error("Error occurred while performing the operation.", {
			description: isTivetError(error) ? error.body.message : undefined,
		});
	},
});

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5 * 1000,
			gcTime: 1000 * 60 * 60 * 24,
			retry: 2,
			refetchOnWindowFocus: false,
			refetchOnReconnect: false,
			cacheTime: 1000 * 60 * 60, // 1 hour
			onError: (error) => {
				if (isTivetError(error) && error.body.code === "TOKEN_EXPIRED") {
					// Attempt token refresh before retrying queries
					return refreshIdentityToken();
				}
			},
		},
		mutations: {
			retry: 0,
		},
	},
	queryCache,
	mutationCache,
});

// React Query persister with superjson support
export const queryClientPersister = createSyncStoragePersister({
	storage: window.localStorage,
	serialize: superjson.stringify,
	deserialize: superjson.parse,
});

// Identity token mutation config
queryClient.setMutationDefaults(["identityToken"], {
	scope: { id: "identityToken" },
	gcTime: timing.minutes(15),
	mutationFn: () =>
		tivetClientTokeneless.auth.tokens.refreshIdentityToken({
			logout: false,
		}),
	onSuccess: async (data) => {
		ls.set("tivet-token", data);
	},
});

const tokenMutationObserver = new MutationObserver(queryClient, {
	mutationKey: ["identityToken"],
});

// Core client options with auto token refresh and debug logs
const clientOptions: TivetClient.Options = {
	environment: getConfig().apiUrl,
	fetcher: async <R = unknown>(
		args: Fetcher.Args,
	): Promise<APIResponse<R, Fetcher.Error>> => {
		const headers = args.headers || {};
		headers["X-Fern-Language"] = undefined;
		headers["X-Fern-Runtime"] = undefined;
		headers["X-Fern-Runtime-Version"] = undefined;

		const response = await fetcher<R>({
			...args,
			withCredentials: true,
			maxRetries: 0,
		});

		// Auto-refresh token on 401 Unauthorized
		if (response.status === 401) {
			await refreshIdentityToken();
			// Retry once with new token
			return fetcher<R>({
				...args,
				withCredentials: true,
				maxRetries: 0,
			});
		}

		return response;
	},
	token: async () => {
		const result = ls.get<{ token: string; exp: string }>("tivet-token");
		if (!result || new Date(result.exp).getTime() < Date.now()) {
			await refreshIdentityToken();
			return ls.get("tivet-token")?.token;
		}
		return result.token;
	},
};

export const tivetClientTokeneless = new TivetClient({
	environment: clientOptions.environment,
	fetcher: clientOptions.fetcher,
});
export const tivetClient = new TivetClient(clientOptions);
export const tivetEeClient = new TivetEeClient(clientOptions);

watchBlockingQueries(queryClient);

broadcastQueryClient({
	queryClient,
	broadcastChannel: "tivet-gg-hub",
});

// Typed hooks for easier usage with Tivet queries/mutations
export function useTivetQuery<TData = unknown>(
	options: QueryObserverOptions<any, any, TData>,
) {
	return useQuery<TData>(options);
}

export function useTivetMutation<TData = unknown>(
	options: MutationObserverOptions<any, any, any, any>,
) {
	return useMutation<TData>(options);
}

// Helpers for optimistic updates with rollback
export async function optimisticUpdate<T>(
	queryKey: string[],
	updateFn: (oldData: T | undefined) => T,
	callback?: () => void,
) {
	const previousData = queryClient.getQueryData<T>(queryKey);
	queryClient.setQueryData<T>(queryKey, updateFn);
	try {
		if (callback) await callback();
	} catch (error) {
		queryClient.setQueryData(queryKey, previousData);
		throw error;
	}
}

// Manual query invalidation helper
export function invalidateQuery(queryKey: string | string[]) {
	return queryClient.invalidateQueries(queryKey);
}

