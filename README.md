<div align="center">

# 🌐 Tivet

![Tivet Banner](banner.png)

[![X](https://img.shields.io/badge/X-Platform-black?style=for-the-badge&logo=x&logoColor=white)](https://x.com/TivetAI)
[![Python](https://img.shields.io/badge/Python-3.8%2B-blue?style=for-the-badge&logo=python)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-Latest-red?style=for-the-badge&logo=pytorch)](https://pytorch.org/)

<h3 align="center">Open-source & self-hostable.</h3>
<h4 align="center">
  Tivet is the platform to build realtime AI agent applications.<br/>
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

- [**Tivet**](https://tivet.gitbook.io/tivet-docs/getting-started/actor-sdk) - Managed Tivet platform

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

    // receive a remote procedure call from the client
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

- [Tivet](https://tivet.gitbook.io/tivet-docs/build-with-actors/create-and-manage-actors)


## Actor Tags
Actor tags are simple key-value pairs attached to every actor. They serve two main purposes:

- **Actor Discovery**: Find specific actors using `client.get(tags, opts)`.
- **Organization**: Group actors for monitoring & administration purposes.

#### Best Practices
When choosing tags, follow these best practices:

- Keep values short and concise.
- Use consistent naming patterns.
- Avoid storing sensitive information.
- The `name` tag is required and specifies which type of actor to spawn.

#### Common Tag Patterns
##### Connect to a Game Server Using a Party Code
```typescript
const gameServer = await client.get<GameServer>({
  name: 'game_server',
  partyCode: 'ABCDEF'
});
```

#### Client Setup
Clients are used to connect & manage actors.

To create a new client, use:
```typescript
import { Client } from '@tivet-gg/actor-client';
const client = new Client(/* CONNECTION ADDRESS */);
```

#### Finding or Creating Actors
##### Get or Create an Actor
Attempts to find an existing actor matching the provided tags. If no matching actor is found, it creates a new one with those tags.
```typescript
const room = await client.get<ChatRoom>({
  name: 'chat_room',
  channel: 'random'
});
await room.sendMessage('Hello, world!');
```

##### Explicitly Create a New Actor
```typescript
const doc = await client.create<MyDocument>({
  create: {
    tags: {
      name: 'my_document',
      docId: '123'
    }
  }
});
await doc.doSomething();
```

##### Connect to an Actor Using ID
It is recommended to use tags instead of actor IDs directly.
```typescript
const myActorId = '55425f42-82f8-451f-82c1-6227c83c9372';
const doc = await client.getWithId<MyDocument>(myActorId);
await doc.doSomething();
```

#### Options
##### Parameters (`opts.parameters`)
All client methods accept a `parameters` property for additional connection details, such as authentication tokens or usernames.
```typescript
const actor = await client.get<Example>(
  { name: 'example' },
  {
    parameters: { authToken: 'supersekure' }
  }
);
```

##### Additional Tags on Creation (`opts.create.tags`)
```typescript
const actor = client.get<MyDocument>(
  { name: 'my_document', document_id: 'budget_2024' },
  {
    create: {
      tags: {
        name: 'my_document',
        workspace_id: 'team_alpha',
        document_id: 'budget_2024'
      }
    }
  }
);
```

##### Specify Region (`opts.create.region`)
By default, actors are created in the lowest latency region. To override this:
```typescript
const actor = client.get(
  { name: 'example' },
  {
    create: {
      region: 'atl'
    }
  }
);
```

##### Prevent Actor Creation (`opts.noCreate`)
To prevent creating a new actor if it does not exist:
```typescript
const doc = await client.get<MyDocument>({ name: 'my_document', docId: '123' }, { noCreate: true });
await doc.doSomething();
```

#### Shutting Down an Actor
For security reasons, actors must be shut down from within the actor itself using `this._shutdown()`.
```typescript
export default class Example extends Actor {
  myShutdownRpc(rpc: Rpc<Example>) {
    this._shutdown();
  }
}
```

## Community & Support

-   Follow us on [**X**](https://x.com/TivetAI)
