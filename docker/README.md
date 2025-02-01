<div align="center">

# 🌐 Tivet

[![X](https://img.shields.io/badge/X-Platform-black?style=for-the-badge&logo=x&logoColor=white)](https://x.com/TrucloAI)
[![Python](https://img.shields.io/badge/Python-3.8%2B-blue?style=for-the-badge&logo=python)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-Latest-red?style=for-the-badge&logo=pytorch)](https://pytorch.org/)

<h3 align="center">Open-source & self-hostable.</h3>
<h4 align="center">
  Tivet is the platform to build realtime ai agent applications.<br/>
  No limitations of Redis or timeouts of Lambda. 
</h4>

[Intro](#intro) • [Getting Started](#getting-started) • [Community & Support](#community--support)

---

</div>

## Intro

### Features

- 🔋 **Batteries Included**: State, RPC, events, & scheduling included out of the box.
- 💾 **Persistent & In-Memory**: Supports storing actor state in-memory that's automatically persisted for high-performance workloads.
- ⚡ **Multiplayer & Realtime**: Build realtime or multiplayer applications on top of actors. :floppy_disk:
- ⚙️ **Serverless & Scalable**: Built on your serverless runtime of choice to make deploying, scaling, and cost management easy.

### Supported Platform

- [**Tivet**](https://actorcore.org/platforms/tivet) - Managed Tivet platform

### Use Cases

Tivet is ideal for applications that need coordinated state across multiple clients. Some common use cases include:

- AI agents
- Game Servers
- Collaborative applications
- Local-first apps
- Discord Activities
- Chat Apps
- Yjs Sync & Storage
- Sandboxed Code Execution

By handling the complexities of state management and coordination, ActorCore lets you focus on building your application logic rather than wrestling with distributed systems primitives.

## Getting Started

### Step 1: Installation

```bash npm
# npm
npm add tivet

# pnpm
pnpm add tivet

# Yarn
yarn add tivet

# Bun
bun add tivet
```

### Step 2: Create an Actor

```typescript
import { Actor, type Rpc } from "tivet";

export interface State {
    messages: { username: string; message: string }[];
}

export default class ChatRoom extends Actor<State> {
    // initialize this._state
    _onInitialize() {
        return { messages: [] };
    }

    // receive an remote procedure call from the client
    sendMessage(rpc: Rpc<ChatRoom>, username: string, message: string) {
        // save message to persistent storage
        this._state.messages.push({ username, message });

        // broadcast message to all clients
        this._broadcast("newMessage", username, message);
    }
}
```

### Step 3: Connect to Actor

```typescript
import { Client } from "tivet/client";
import type ChatRoom from "../src/chat-room.ts";

const client = new Client(/* manager endpoint */);

// connect to chat room
const chatRoom = await client.get<ChatRoom>({ name: "chat" });

// listen for new messages
chatRoom.on("newMessage", (username: string, message: string) =>
    console.log(`Message from ${username}: ${message}`),
);

// send message to room
await chatRoom.sendMessage("william", "All the world's a stage.");
```

### Step 4: Deploy

Deploy to the platform:

- [Tivet](https://actorcore.org/platforms/tivet)

## Community & Support

-   Follow us on [**X**](https://x.com/tivet_gg)

