import {
	Actor,
	type Connection,
	type OnBeforeConnectOptions,
	type Rpc,
	UserError,
} from "@tivet-gg/actor";
import { validateUsername } from "./utils.ts";

interface ConnParams {
	username: string;
}

interface ConnState {
	username: string;
	typing: boolean;
	lastSentMessage: number;
}

interface ChatMessage {
	id: string;
	sentAt: number;
	username: string;
	text: string;
}

export default class ChatRoom extends Actor<undefined, ConnParams, ConnState> {
	override _onBeforeConnect(
		opts: OnBeforeConnectOptions<ChatRoom>,
	): ConnState {
		const username = opts.parameters.username;
		validateUsername(username);
		return {
			username: opts.parameters.username,
			typing: false,
			lastSentMessage: 0,
		};
	}

	protected override _onConnect(
		connection: Connection<ChatRoom>,
	): void | Promise<void> {
		this.#broadcastPresence();
	}

	protected override _onDisconnect(
		connection: Connection<ChatRoom>,
	): void | Promise<void> {
		// Reset typing status on disconnect
		connection.state.typing = false;
		this.#broadcastPresence();
		this.#broadcastTyping();
	}

	// Broadcast presence with usernames and typing status
	#broadcastPresence() {
		const connectedUsers = [...this._connections.values()].map((c) => ({
			username: c.state.username,
			typing: c.state.typing,
		}));
		this._broadcast("presenceUpdate", connectedUsers);
	}

	// Broadcast list of users who are currently typing
	#broadcastTyping() {
		const typingUsers = [...this._connections.values()]
			.filter(c => c.state.typing)
			.map(c => c.state.username);
		this._broadcast("typingUpdate", typingUsers);
	}

	/**
	 * Update typing status for a user and broadcast changes.
	 */
	setTyping(rpc: Rpc<ChatRoom>, typing: boolean) {
		rpc.connection.state.typing = typing;
		this.#broadcastPresence();
		this.#broadcastTyping();

		// Automatically clear typing status after timeout (e.g. 5 seconds)
		if (typing) {
			setTimeout(() => {
				if (rpc.connection.state.typing) {
					rpc.connection.state.typing = false;
					this.#broadcastPresence();
					this.#broadcastTyping();
				}
			}, 5000);
		}
	}

	/**
	 * Send a new chat message from the user, with rate limiting.
	 */
	async sendMessage(rpc: Rpc<ChatRoom>, text: string) {
		// Rate limit: 500ms minimum between messages
		if (Date.now() - rpc.connection.state.lastSentMessage < 500) {
			throw new UserError("Sending messages too fast");
		}

		// Basic validation on message length
		if (text.length === 0 || text.length > 1000) {
			throw new UserError("Message must be between 1 and 1000 characters");
		}

		const message: ChatMessage = {
			id: crypto.randomUUID(),
			sentAt: Date.now(),
			username: rpc.connection.state.username,
			text,
		};

		rpc.connection.state.lastSentMessage = message.sentAt;

		await this._kv.put(["messages", message.sentAt, message.id], message);

		this._broadcast("newMessage", message);
	}

	/**
	 * Fetch chat message history, optionally after a certain timestamp.
	 * Supports optional limit and reverse ordering.
	 */
	async fetchHistory(
		rpc: Rpc<ChatRoom>,
		after?: number,
		limit = 50,
		reverse = false,
	): Promise<ChatMessage[]> {
		// Compose prefix and after keys
		const prefix = ["messages"];
		const afterKey = after ? ["messages", after] : undefined;

		// Retrieve messages from KV with pagination support
		let messages = await this._kv.list<ChatMessage>({
			prefix,
			after: afterKey,
			limit,
			reverse,
		});

		// Sort ascending if reverse is true (to present oldest first)
		if (reverse) {
			messages = messages.reverse();
		}

		return messages;
	}

	/**
	 * Clear all messages from storage.
	 * Note: Use with caution, this deletes all messages.
	 */
	async clearMessages(rpc: Rpc<ChatRoom>) {
		for await (const key of this._kv.listKeys({ prefix: ["messages"] })) {
			await this._kv.delete(key);
		}
		this._broadcast("messagesCleared", null);
	}

	/**
	 * Search messages by text substring.
	 * Note: This is a simple linear scan, consider adding indexing for production.
	 */
	async searchMessages(rpc: Rpc<ChatRoom>, query: string, limit = 50): Promise<ChatMessage[]> {
		if (query.length < 3) {
			throw new UserError("Search query must be at least 3 characters");
		}

		const allMessages = await this._kv.list<ChatMessage>({ prefix: ["messages"] });
		const results = allMessages.filter(m => m.text.toLowerCase().includes(query.toLowerCase()));

		return results.slice(0, limit);
	}

	/**
	 * Kick a user by username - forcibly disconnects their connection.
	 */
	kickUser(rpc: Rpc<ChatRoom>, username: string) {
		for (const connection of this._connections.values()) {
			if (connection.state.username === username) {
				connection.disconnect();
				this._broadcast("userKicked", { username });
				return;
			}
		}
		throw new UserError(`User '${username}' not found`);
	}

	/**
	 * Rename a user and notify all participants.
	 */
	renameUser(rpc: Rpc<ChatRoom>, newUsername: string) {
		validateUsername(newUsername);

		const oldUsername = rpc.connection.state.username;

		// Check for username conflicts
		for (const c of this._connections.values()) {
			if (c.state.username === newUsername) {
				throw new UserError("Username already taken");
			}
		}

		rpc.connection.state.username = newUsername;

		this._broadcast("userRenamed", {
			oldUsername,
			newUsername,
		});

		this.#broadcastPresence();
	}

	/**
	 * Fetch list of currently connected users.
	 */
	getConnectedUsers(rpc: Rpc<ChatRoom>) {
		return [...this._connections.values()].map(c => ({
			username: c.state.username,
			typing: c.state.typing,
		}));
	}

	/**
	 * Send a private message to a specific user.
	 */
	sendPrivateMessage(rpc: Rpc<ChatRoom>, toUsername: string, text: string) {
		if (text.length === 0 || text.length > 1000) {
			throw new UserError("Message must be between 1 and 1000 characters");
		}

		let recipientConnection: Connection<ChatRoom> | null = null;
		for (const c of this._connections.values()) {
			if (c.state.username === toUsername) {
				recipientConnection = c;
				break;
			}
		}

		if (!recipientConnection) {
			throw new UserError(`User '${toUsername}' not found`);
		}

		const message: ChatMessage = {
			id: crypto.randomUUID(),
			sentAt: Date.now(),
			username: rpc.connection.state.username,
			text,
		};

		// Send only to the recipient
		recipientConnection.send("privateMessage", message);
		// Also send back to sender for UI consistency
		rpc.connection.send("privateMessage", message);
	}

	/**
	 * Server heartbeat for monitoring or cleanup.
	 * Can be triggered by admin clients to get current server status.
	 */
	getServerStatus(rpc: Rpc<ChatRoom>) {
		return {
			activeConnections: this._connections.size,
			uptime: process.uptime ? process.uptime() : undefined,
			memoryUsage: process.memoryUsage ? process.memoryUsage() : undefined,
		};
	}

	/**
	 * Periodic cleanup of stale typing statuses.
	 * Call this method regularly (e.g. via a timer).
	 */
	cleanupStaleTyping() {
		let changed = false;
		const now = Date.now();

		for (const c of this._connections.values()) {
			if (c.state.typing && now - c.state.lastSentMessage > 10000) {
				c.state.typing = false;
				changed = true;
			}
		}

		if (changed) {
			this.#broadcastPresence();
			this.#broadcastTyping();
		}
	}
}
