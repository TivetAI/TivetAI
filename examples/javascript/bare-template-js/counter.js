import { Actor } from "@tivet-gg/actor";

export default class Counter extends Actor {
	// Create the initial state when the actor is first created (https://tivet.gg/docs/state)
	_onInitialize() {
		return { count: 0 };
	}

	// Listen for state changes (https://tivet.gg/docs/lifecycle)
	_onStateChange(newState) {
		// Broadcast a state update event to all clients (https://tivet.gg/docs/events)
		this._broadcast("countUpdate", newState.count);
	}

	// Expose a remote procedure call for clients to update the count (https://tivet.gg/docs/rpc)
	increment(_rpc, count) {
		this._state.count += count;
		return this._state.count;
	}
}
