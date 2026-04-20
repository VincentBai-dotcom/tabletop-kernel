# Online Splendor Backend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the first functional hosted Splendor backend with Elysia, Drizzle, room lifecycle, WebSocket live actions, and `tabletop-engine` command execution.

**Architecture:** One Elysia service with feature modules. HTTP handles create/join/bootstrap; WebSocket handles live room/game actions. Domain services use light dependency injection and domain-specific stores over Drizzle.

**Tech Stack:** Bun, Elysia, Drizzle ORM, PostgreSQL, `tabletop-engine`, `splendor-example`, colocated Bun tests.

---

## Context

Read these design docs before changing implementation:

- `docs/design/2026-04-17-online-splendor-hosted-requirements-design.md`
- `docs/design/2026-04-19-online-splendor-backend-service-design.md`
- `docs/design/2026-04-19-online-splendor-database-schema-design.md`
- `docs/design/2026-04-19-online-splendor-backend-api-organization-design.md`

Use Elysia official docs from `examples/splendor/server/llms.txt` when checking route, validation, testing, and WebSocket details. Relevant pages:

- `https://elysiajs.com/essential/best-practice.md`
- `https://elysiajs.com/patterns/websocket.md`
- `https://elysiajs.com/patterns/unit-test.md`
- `https://elysiajs.com/integrations/drizzle.md`

Use TDD for behavior code:

- Write a focused failing test.
- Run it and verify it fails for the expected reason.
- Implement the minimum code.
- Run the test and related checks.
- Commit.

## Task 1: Config And DB Foundation

**Files:**

- Create: `examples/splendor/server/src/modules/config/index.ts`
- Create: `examples/splendor/server/src/modules/config/model.ts`
- Create: `examples/splendor/server/src/modules/db/client.ts`
- Create: `examples/splendor/server/src/modules/db/index.ts`
- Create: `examples/splendor/server/src/modules/config/__tests__/config.test.ts`
- Create: `examples/splendor/server/src/modules/db/__tests__/db.test.ts`
- Modify: `examples/splendor/server/src/index.ts`

**Step 1: Write config tests**

Test behavior:

- default config uses `development`, `0.0.0.0`, `3000`, and local Splendor Postgres URL
- env overrides `NODE_ENV`, `HOST`, `PORT`, `POSTGRES_URL`, and `POSTGRES_URL_LOCAL`
- invalid `PORT` throws a stable error code

Run:

```bash
bun test --cwd examples/splendor/server ./src/modules/config/__tests__/config.test.ts
```

Expected: fails because config module does not exist.

**Step 2: Implement config module**

Implement:

- `loadConfig(env?: NodeJS.ProcessEnv): ServerConfig`
- `configService.get()`
- `configService.isDevelopment`
- `configService.isProduction`

Keep it simple and side-effect light.

**Step 3: Write DB tests**

Test behavior:

- `createDbClient("postgres://...")` returns a Drizzle client-like value
- exported `schema` includes lifecycle tables

Run:

```bash
bun test --cwd examples/splendor/server ./src/modules/db/__tests__/db.test.ts
```

Expected: fails because DB module does not exist.

**Step 4: Implement DB module**

Use:

- `pg`
- `drizzle-orm/node-postgres`
- existing schema barrel from `src/schema`

Do not create a real database connection during import except in the explicitly exported default app client.

**Step 5: Verify**

Run:

```bash
bun test --cwd examples/splendor/server ./src/modules/config/__tests__/config.test.ts ./src/modules/db/__tests__/db.test.ts
bunx tsc -p examples/splendor/server/tsconfig.json --noEmit
bunx eslint examples/splendor/server
```

**Step 6: Commit**

```bash
git add examples/splendor/server/src
git commit -m "feat: add splendor server config and db modules"
```

## Task 2: Shared Utilities And Error Handling

**Files:**

- Create: `examples/splendor/server/src/modules/errors/index.ts`
- Create: `examples/splendor/server/src/plugins/error-handler.ts`
- Create: `examples/splendor/server/src/plugins/request-id.ts`
- Create: `examples/splendor/server/src/lib/clock.ts`
- Create: `examples/splendor/server/src/lib/random.ts`
- Create: `examples/splendor/server/src/modules/errors/__tests__/errors.test.ts`

**Step 1: Write error tests**

Test behavior:

- `AppError` carries `code`, HTTP status, and optional details
- `toErrorResponse` converts `AppError` to `{ error: { code, message, details? } }`
- unknown errors convert to `internal_server_error`

Run:

```bash
bun test --cwd examples/splendor/server ./src/modules/errors/__tests__/errors.test.ts
```

Expected: fails because error module does not exist.

**Step 2: Implement errors and plugins**

Implement:

- `AppError`
- `toErrorResponse`
- Elysia `errorHandler`
- Elysia `requestId`
- `systemClock`
- `createRandomToken`
- `createRoomCode`

Room code generator should output short uppercase codes. Use six characters for v1.

**Step 3: Verify and commit**

Run:

```bash
bun test --cwd examples/splendor/server ./src/modules/errors/__tests__/errors.test.ts
bunx tsc -p examples/splendor/server/tsconfig.json --noEmit
bunx eslint examples/splendor/server
```

Commit:

```bash
git add examples/splendor/server/src
git commit -m "feat: add splendor server shared infrastructure"
```

## Task 3: Player Session Module

**Files:**

- Create: `examples/splendor/server/src/modules/session/model.ts`
- Create: `examples/splendor/server/src/modules/session/store.ts`
- Create: `examples/splendor/server/src/modules/session/service.ts`
- Create: `examples/splendor/server/src/modules/session/index.ts`
- Create: `examples/splendor/server/src/modules/session/__tests__/service.test.ts`

**Step 1: Write session service tests**

Use an in-memory fake store. Test:

- missing token creates a new player session
- known token updates `lastSeenAt` and reuses the session
- unknown token creates a new session rather than failing
- token hash is stored, not raw token

Run:

```bash
bun test --cwd examples/splendor/server ./src/modules/session/__tests__/service.test.ts
```

Expected: fails because session service does not exist.

**Step 2: Implement service**

Implement:

- `createSessionService(deps)`
- `resolveOrCreatePlayerSession({ token })`
- `hashPlayerSessionToken(token)`

Use Web Crypto or Bun-compatible hashing. Return:

```ts
{
  playerSessionId: string;
  token: string;
  tokenWasCreated: boolean;
}
```

**Step 3: Implement Drizzle store**

Store functions:

- `findPlayerSessionByTokenHash(db, tokenHash)`
- `insertPlayerSession(db, { tokenHash, now })`
- `touchPlayerSession(db, { id, now })`

**Step 4: Verify and commit**

Run:

```bash
bun test --cwd examples/splendor/server ./src/modules/session/__tests__/service.test.ts
bunx tsc -p examples/splendor/server/tsconfig.json --noEmit
bunx eslint examples/splendor/server
```

Commit:

```bash
git add examples/splendor/server/src
git commit -m "feat: add player session service"
```

## Task 4: Room Store And Service

**Files:**

- Create: `examples/splendor/server/src/modules/room/model.ts`
- Create: `examples/splendor/server/src/modules/room/store.ts`
- Create: `examples/splendor/server/src/modules/room/service.ts`
- Create: `examples/splendor/server/src/modules/room/index.ts`
- Create: `examples/splendor/server/src/modules/room/__tests__/service.test.ts`

**Step 1: Write room service tests**

Use fake session service, fake store, fake notifier, deterministic clock, deterministic room code generator.

Test:

- create room creates host at seat 0 and returns token
- join room assigns next available seat
- join room rejects full room
- join room rejects duplicate normalized display name
- set ready toggles readiness only for seated player
- start game requires host
- start game requires 2 to 4 players
- start game requires every seated player ready
- leaving host transfers host to next seat
- leaving last player deletes room

Run:

```bash
bun test --cwd examples/splendor/server ./src/modules/room/__tests__/service.test.ts
```

Expected: fails because room service does not exist.

**Step 2: Implement room models**

Define:

- `RoomSnapshot`
- `RoomPlayerSnapshot`
- `CreateRoomInput/Result`
- `JoinRoomInput/Result`
- `SetReadyInput`
- `LeaveRoomInput`
- `StartRoomInput`

**Step 3: Implement room service**

Implement product rules from the design docs. The service should return plain outcomes and call notifier methods for live updates.

Do not pass Elysia context into this service.

**Step 4: Implement Drizzle store**

Store functions should be domain-specific:

- `createRoomWithHost`
- `loadRoomSnapshot`
- `loadOpenRoomByCode`
- `addRoomPlayer`
- `setRoomPlayerReady`
- `removeRoomPlayer`
- `deleteRoom`
- `updateRoomHost`
- `markRoomStarting`

Use Drizzle directly.

**Step 5: Verify and commit**

Run:

```bash
bun test --cwd examples/splendor/server ./src/modules/room/__tests__/service.test.ts
bunx tsc -p examples/splendor/server/tsconfig.json --noEmit
bunx eslint examples/splendor/server
```

Commit:

```bash
git add examples/splendor/server/src
git commit -m "feat: add room lifecycle service"
```

## Task 5: HTTP App And Room Routes

**Files:**

- Create: `examples/splendor/server/src/app.ts`
- Create: `examples/splendor/server/src/modules/room/routes.ts`
- Create: `examples/splendor/server/src/modules/room/__tests__/routes.test.ts`
- Modify: `examples/splendor/server/src/index.ts`

**Step 1: Write route tests**

Use Elysia `app.handle(...)`. Test:

- `GET /health` returns `{ status: "ok" }`
- `POST /rooms` validates body and calls service
- `POST /rooms/join` validates body and calls service
- route responses include player session token and room snapshot
- route errors are serialized by error handler

Run:

```bash
bun test --cwd examples/splendor/server ./src/modules/room/__tests__/routes.test.ts
```

Expected: fails because app/routes do not exist.

**Step 2: Implement app factory**

Implement:

- `createApp(deps)`
- `GET /health`
- room routes
- error handler plugin
- request id plugin

Keep the app factory injectable so tests can pass fake services.

**Step 3: Implement entrypoint**

`src/index.ts` should load config, create real dependencies, create app, and listen.

**Step 4: Verify and commit**

Run:

```bash
bun test --cwd examples/splendor/server ./src/modules/room/__tests__/routes.test.ts
bunx tsc -p examples/splendor/server/tsconfig.json --noEmit
bunx eslint examples/splendor/server
```

Commit:

```bash
git add examples/splendor/server/src
git commit -m "feat: add splendor room http api"
```

## Task 6: WebSocket Registry, Protocol, And Room Actions

**Files:**

- Create: `examples/splendor/server/src/modules/websocket/model.ts`
- Create: `examples/splendor/server/src/modules/websocket/registry.ts`
- Create: `examples/splendor/server/src/modules/websocket/notifier.ts`
- Create: `examples/splendor/server/src/modules/websocket/index.ts`
- Create: `examples/splendor/server/src/modules/websocket/__tests__/registry.test.ts`
- Create: `examples/splendor/server/src/modules/websocket/__tests__/notifier.test.ts`

**Step 1: Write registry tests**

Test:

- registering a connection by player session id
- replacing an existing connection for the same player session
- subscribing a connection to a room
- switching subscription to a game session
- removing connection on close

Run:

```bash
bun test --cwd examples/splendor/server ./src/modules/websocket/__tests__/registry.test.ts
```

Expected: fails because registry does not exist.

**Step 2: Implement registry**

Do not depend on Elysia socket types in domain code. Define a minimal `LiveConnection` interface:

```ts
interface LiveConnection {
  id: string;
  send(payload: unknown): void;
}
```

**Step 3: Write notifier tests**

Test:

- room update sends to all room subscribers
- game update sends to all game subscribers
- terminal game result sends to game subscribers

**Step 4: Implement notifier**

Notifier depends on registry, not raw Elysia context.

**Step 5: Implement Elysia WebSocket route**

Use `Elysia.ws()` with schema validation for incoming messages. Elysia docs confirm `ws('/path', { body, query, open, message, close })` and validated messages are passed to `message(ws, message)`.

Support messages:

- `subscribe_room`
- `room_set_ready`
- `room_leave`
- `room_start_game`
- `subscribe_game`
- `game_command`

Only room messages need full behavior in this task. Game messages can return `not_implemented` until Task 7.

**Step 6: Verify and commit**

Run:

```bash
bun test --cwd examples/splendor/server ./src/modules/websocket/__tests__/registry.test.ts ./src/modules/websocket/__tests__/notifier.test.ts
bunx tsc -p examples/splendor/server/tsconfig.json --noEmit
bunx eslint examples/splendor/server
```

Commit:

```bash
git add examples/splendor/server/src
git commit -m "feat: add splendor websocket room channel"
```

## Task 7: Game Session Service And Store

**Files:**

- Create: `examples/splendor/server/src/modules/game-session/model.ts`
- Create: `examples/splendor/server/src/modules/game-session/store.ts`
- Create: `examples/splendor/server/src/modules/game-session/service.ts`
- Create: `examples/splendor/server/src/modules/game-session/index.ts`
- Create: `examples/splendor/server/src/modules/game-session/__tests__/service.test.ts`

**Step 1: Write game-session tests**

Use a fake store and real `splendor-example` executor if practical.

Test:

- creating game from room seats assigns player ids by seat order
- initial state uses seated player ids and provided seed
- command submission maps player session to engine actor id
- accepted command persists new state and increments state version
- invalid command does not persist new state
- disconnecting a player ends/invalidates the game

Run:

```bash
bun test --cwd examples/splendor/server ./src/modules/game-session/__tests__/service.test.ts
```

Expected: fails because game-session service does not exist.

**Step 2: Implement models**

Define:

- `GameSessionSnapshot`
- `GameSessionPlayerSnapshot`
- `GameStartedResult`
- `GameCommandResult`
- `GameEndedPayload`

**Step 3: Implement service**

Use:

- `createSplendorGame`
- `createGameExecutor`
- generated/engine-visible types where helpful

Persist canonical state after accepted commands.

**Step 4: Implement store**

Domain store operations:

- `createGameSession`
- `insertGameSessionPlayers`
- `loadGameSessionForCommand`
- `persistAcceptedCommandResult`
- `deleteGameSession`
- `markPlayerDisconnected`
- `clearPlayerDisconnected`

**Step 5: Verify and commit**

Run:

```bash
bun test --cwd examples/splendor/server ./src/modules/game-session/__tests__/service.test.ts
bunx tsc -p examples/splendor/server/tsconfig.json --noEmit
bunx eslint examples/splendor/server
```

Commit:

```bash
git add examples/splendor/server/src
git commit -m "feat: add splendor game session service"
```

## Task 8: Wire Game WebSocket Actions

**Files:**

- Modify: `examples/splendor/server/src/modules/websocket/index.ts`
- Modify: `examples/splendor/server/src/modules/websocket/model.ts`
- Create: `examples/splendor/server/src/modules/websocket/__tests__/websocket-actions.test.ts`

**Step 1: Write action tests**

Test at the message-handler level rather than requiring real sockets:

- `game_command` calls game session service
- successful command publishes game update
- invalid command sends error
- subscribe game switches registry target

Run:

```bash
bun test --cwd examples/splendor/server ./src/modules/websocket/__tests__/websocket-actions.test.ts
```

Expected: fails because game actions are not wired.

**Step 2: Implement game actions**

Route `game_command` to `gameSessionService.submitCommand`.

Route `subscribe_game` to registry subscription and send initial visible state if available.

**Step 3: Verify and commit**

Run:

```bash
bun test --cwd examples/splendor/server ./src/modules/websocket/__tests__/websocket-actions.test.ts
bunx tsc -p examples/splendor/server/tsconfig.json --noEmit
bunx eslint examples/splendor/server
```

Commit:

```bash
git add examples/splendor/server/src
git commit -m "feat: wire splendor game websocket actions"
```

## Task 9: Final Integration Verification

**Files:**

- Modify as needed only for integration fixes.

**Step 1: Run server package tests**

```bash
bun test --cwd examples/splendor/server
```

Expected: all server tests pass.

**Step 2: Run package checks**

```bash
bunx tsc -p examples/splendor/server/tsconfig.json --noEmit
bunx eslint examples/splendor/server
```

Expected: both pass.

**Step 3: Run broader repo checks**

```bash
bun run lint
bunx tsc -b
bun test --cwd examples/splendor/engine
bun test --cwd examples/splendor/terminal
```

Expected: all pass.

**Step 4: Commit final fixes if needed**

```bash
git add <changed files>
git commit -m "test: verify splendor backend integration"
```

Only commit if there were integration fixes.

## Implementation Notes

- Keep `examples/splendor/server/llms.txt` untracked unless explicitly asked to commit it.
- Prefer module-local tests under `src/<module>/__tests__`.
- Use `AppError` codes for expected business failures.
- Do not overbuild production-grade cleanup jobs in this pass.
- Do not add Redis.
- Do not add auth.
- Do not add a generic repository framework.
- Do not create a separate git worktree.
