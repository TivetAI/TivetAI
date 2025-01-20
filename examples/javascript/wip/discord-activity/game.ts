import { Actor } from "@tivet-gg/actor";
import type { Rpc } from "@tivet-gg/actor";

type Move = "rock" | "paper" | "scissors";

type State = Record<never, never>;

interface ConnState {
	userId: string;
	move?: Move;
}

interface ConnParams {
	userId: string;
}

export default class Counter extends Actor<State, ConnParams, ConnState> {
	override _onInitialize(): State {
		return { count: 0 };
	}

	// Listen for state changes (https://tivet.gg/docs/lifecycle)
	override _onStateChange(newState: State): void | Promise<void> {
		// Broadcast a state update event to all clients (https://tivet.gg/docs/events)
		this._broadcast("countUpdate", newState.count);
	}

	#broadcastState() {
		const connectedUsers = []; // TODO:
		const gameState = {}; // TODO:
		this._broadcast("stateUpdate", {
			connectedUsers,
			gameState,
		});
	}

	// Expose a remote procedure call for clients to update the count (https://tivet.gg/docs/rpc)
	increment(_rpc: Rpc<Counter>, count: number): number {
		this._state.count += count;
		return this._state.count;
	}
}
