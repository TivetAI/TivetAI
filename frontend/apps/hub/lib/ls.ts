import type { AuthContext } from "@/domains/auth/contexts/auth";

type LSKey =
	| `tivet-lastteam-${string}`
	| "tivet-token"
	| "actors-list-preview-width"
	| "actors-list-preview-folded"
	| "feature-flags"
	| "user-preferences"
	| "ui-theme"
	| `tivet-session-${string}`;

function safeLocalStorage() {
	try {
		if (typeof window !== "undefined" && window.localStorage) {
			return window.localStorage;
		}
	} catch {
		// localStorage not available
	}
	return null;
}

function safeJSONParse<T>(value: string | null): T | null {
	if (!value) return null;
	try {
		return JSON.parse(value) as T;
	} catch {
		return null;
	}
}

function safeJSONStringify(value: unknown): string | null {
	try {
		return JSON.stringify(value);
	} catch {
		return null;
	}
}

export const ls = {
	set: (key: LSKey, value: unknown) => {
		const storage = safeLocalStorage();
		if (!storage) return;
		const json = safeJSONStringify(value);
		if (json !== null) {
			storage.setItem(key, json);
		}
	},

	get: <T = unknown>(key: LSKey): T | null => {
		const storage = safeLocalStorage();
		if (!storage) return null;
		return safeJSONParse<T>(storage.getItem(key));
	},

	remove: (key: LSKey) => {
		const storage = safeLocalStorage();
		if (!storage) return;
		storage.removeItem(key);
	},

	clear: () => {
		const storage = safeLocalStorage();
		if (!storage) return;
		storage.clear();
	},

	/** Set with expiration time in ms */
	setWithExpiry: (key: LSKey, value: unknown, ttlMs: number) => {
		const now = Date.now();
		ls.set(key, { value, expiry: now + ttlMs });
	},

	/** Get value with expiry check */
	getWithExpiry: <T = unknown>(key: LSKey): T | null => {
		const data = ls.get<{ value: T; expiry: number }>(key);
		if (!data) return null;
		if (Date.now() > data.expiry) {
			ls.remove(key);
			return null;
		}
		return data.value;
	},

	/** Batch set multiple key-values */
	batchSet: (items: Record<LSKey, unknown>) => {
		for (const key in items) {
			ls.set(key as LSKey, items[key]);
		}
	},

	/** Batch get multiple keys */
	batchGet: <T = unknown>(keys: LSKey[]): Record<string, T | null> => {
		const result: Record<string, T | null> = {};
		for (const key of keys) {
			result[key] = ls.get<T>(key);
		}
		return result;
	},

	/** Listen for storage changes (cross-tab sync) */
	onStorageChange: (
		callback: (key: string | null, newValue: string | null) => void,
	) => {
		if (typeof window === "undefined") return;
		const handler = (event: StorageEvent) => {
			callback(event.key, event.newValue);
		};
		window.addEventListener("storage", handler);
		return () => window.removeEventListener("storage", handler);
	},

	recentTeam: {
		get: (auth: AuthContext) => {
			if (!auth.profile?.identity.identityId) return null;
			return ls.get(`tivet-lastteam-${auth.profile.identity.identityId}`);
		},
		set: (auth: AuthContext, groupId: string) => {
			if (!auth.profile?.identity.identityId) return;
			ls.set(`tivet-lastteam-${auth.profile.identity.identityId}`, groupId);
		},
		remove: (auth: AuthContext) => {
			if (!auth.profile?.identity.identityId) return;
			ls.remove(`tivet-lastteam-${auth.profile.identity.identityId}`);
		},
		/** Sync recent team across tabs */
		syncAcrossTabs: (auth: AuthContext, callback: (groupId: string | null) => void) => {
			return ls.onStorageChange((key, newValue) => {
				if (key === `tivet-lastteam-${auth.profile?.identity.identityId}`) {
					callback(newValue ? JSON.parse(newValue) : null);
				}
			});
		},
	},

	actorsList: {
		set: (width: number, folded: boolean) => {
			ls.set("actors-list-preview-width", width);
			ls.set("actors-list-preview-folded", folded);
		},
		getWidth: () => ls.get<number>("actors-list-preview-width"),
		getFolded: () => ls.get<boolean>("actors-list-preview-folded"),
		clear: () => {
			ls.remove("actors-list-preview-width");
			ls.remove("actors-list-preview-folded");
		},
	},

	tokens: {
		get: () => ls.get<string>("tivet-token"),
		set: (token: string) => ls.set("tivet-token", token),
		remove: () => ls.remove("tivet-token"),
	},

	featureFlags: {
		get: () => ls.get<Record<string, boolean>>("feature-flags") ?? {},
		set: (flags: Record<string, boolean>) => ls.set("feature-flags", flags),
		clear: () => ls.remove("feature-flags"),
	},

	userPreferences: {
		get: () => ls.get<Record<string, unknown>>("user-preferences") ?? {},
		set: (prefs: Record<string, unknown>) => ls.set("user-preferences", prefs),
		clear: () => ls.remove("user-preferences"),
	},

	uiTheme: {
		get: () => ls.get<string>("ui-theme"),
		set: (theme: string) => ls.set("ui-theme", theme),
		remove: () => ls.remove("ui-theme"),
	},

	/** Clear only tivet keys */
	clearTivetKeys: () => {
		const storage = safeLocalStorage();
		if (!storage) return;
		const keysToRemove = [];
		for (let i = 0; i < storage.length; i++) {
			const key = storage.key(i);
			if (key && key.startsWith("tivet-")) {
				keysToRemove.push(key);
			}
		}
		for (const key of keysToRemove) {
			storage.removeItem(key);
		}
	},
};
