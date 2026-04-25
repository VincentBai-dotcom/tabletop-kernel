# Splendor Web Vertical Slice Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the first online Splendor web client vertical slice using Eden for hosted server transport and the generated Splendor engine SDK for game protocol typing.

**Architecture:** Keep the web client thin. Use one transport module for HTTP and WebSocket access to the Splendor server, one small persistence layer for the same-browser player session token, and one app-level state machine that moves between menu, room, and game views. Consume the existing server room/live API directly instead of introducing a frontend service abstraction too early.

**Tech Stack:** React 19, Vite, TypeScript, Eden Treaty, existing Splendor server WebSocket API, generated Splendor engine client SDK.

---

### Task 1: Refresh The Sequence Doc

**Files:**

- Modify: `docs/plans/2026-04-22-splendor-web-client-sdk-sequence.md`

**Step 1: Update the stale status notes**

Replace the outdated “still needs a concrete implementation decision” language with the current state:

- discovery request typing exists
- discovery result typing exists
- `nextStep` and `nextInput` are correlated
- the Splendor engine package already re-exports the generated SDK

**Step 2: Save the doc change**

No code change in this task beyond the plan doc refresh.

**Step 3: Commit**

```bash
git add docs/plans/2026-04-22-splendor-web-client-sdk-sequence.md
git commit -m "docs: refresh splendor web sdk sequence"
```

### Task 2: Add Web Dependencies And Package Wiring

**Files:**

- Modify: `examples/splendor/web/package.json`
- Modify: `examples/splendor/web/tsconfig.app.json`
- Modify: `examples/splendor/web/vite.config.ts`
- Modify: `examples/splendor/server/package.json`

**Step 1: Add the missing runtime dependencies**

Add:

- `@elysiajs/eden`
- `splendor-example`

Keep direct workspace consumption. Do not add a generated client package.

**Step 2: Ensure the web package can import the server app type**

Expose a stable package export or name from the server workspace package if needed so the web app can import a type from the server package safely.

**Step 3: Verify TypeScript and Vite resolve workspace imports**

Adjust path/module resolution only if the current scaffold cannot resolve:

- `splendor-example`
- the server app type import

Prefer the smallest possible change.

**Step 4: Install dependencies**

Run:

```bash
bun install
```

**Step 5: Run focused typecheck/build**

Run:

```bash
bun run --cwd examples/splendor/web build
```

Expected: build may still fail because app code is not implemented yet, but package resolution should be wired correctly.

**Step 6: Commit**

```bash
git add examples/splendor/web/package.json examples/splendor/web/tsconfig.app.json examples/splendor/web/vite.config.ts examples/splendor/server/package.json
git commit -m "chore: wire splendor web dependencies"
```

### Task 3: Create Web Transport And Session Modules

**Files:**

- Create: `examples/splendor/web/src/config.ts`
- Create: `examples/splendor/web/src/lib/player-session.ts`
- Create: `examples/splendor/web/src/lib/server-api.ts`
- Create: `examples/splendor/web/src/lib/live-connection.ts`
- Create: `examples/splendor/web/src/types/live.ts`
- Test: `examples/splendor/web/src/lib/__tests__/player-session.test.ts`
- Test: `examples/splendor/web/src/lib/__tests__/live-connection.test.ts`

**Step 1: Write the failing player-session test**

Cover:

- reading a missing token returns `null`
- writing a token persists it
- clearing a token removes it

Use a lightweight `localStorage` test setup.

**Step 2: Implement the player-session storage helper**

Expose:

- `getStoredPlayerSessionToken()`
- `setStoredPlayerSessionToken(token)`
- `clearStoredPlayerSessionToken()`

**Step 3: Write the failing live-connection test**

Cover:

- constructing the socket URL from configured base URL and token
- sending a typed live message
- closing and replacing a prior socket

Mock `WebSocket`.

**Step 4: Implement the config and transport modules**

Create:

- `config.ts` for HTTP/WS base URL resolution
- `server-api.ts` for Eden Treaty construction
- `live-connection.ts` for plain WebSocket lifecycle
- `types/live.ts` for shared client-side live message typing copied from the server’s current message contract where needed

Keep these modules thin. No frontend state machine yet.

**Step 5: Run focused tests**

Run:

```bash
bun test --cwd examples/splendor/web src/lib/__tests__/player-session.test.ts src/lib/__tests__/live-connection.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add examples/splendor/web/src/config.ts examples/splendor/web/src/lib/player-session.ts examples/splendor/web/src/lib/server-api.ts examples/splendor/web/src/lib/live-connection.ts examples/splendor/web/src/types/live.ts examples/splendor/web/src/lib/__tests__/player-session.test.ts examples/splendor/web/src/lib/__tests__/live-connection.test.ts
git commit -m "feat: add splendor web transport modules"
```

### Task 4: Build The App State And Hosted Workflow Hooks

**Files:**

- Create: `examples/splendor/web/src/hooks/use-splendor-app.ts`
- Create: `examples/splendor/web/src/hooks/use-live-room.ts`
- Create: `examples/splendor/web/src/hooks/use-live-game.ts`
- Create: `examples/splendor/web/src/types/app.ts`
- Test: `examples/splendor/web/src/hooks/__tests__/use-splendor-app.test.tsx`

**Step 1: Write the failing app workflow hook test**

Cover the minimal flow:

- create room stores returned player token and room snapshot
- join room stores returned player token and room snapshot
- room live updates replace local room state
- `game_started` transitions into game subscription state

Mock Eden calls and mocked live messages.

**Step 2: Implement the app-level state model**

Represent:

- `menu`
- `room`
- `game`
- transient loading/error state

Persist only the player session token across reloads.

**Step 3: Implement room and game live hooks**

Responsibilities:

- open the WebSocket using the stored token
- subscribe to room or game after connection
- apply `room_snapshot`, `room_updated`, `game_started`, `game_snapshot`, `game_updated`, `game_ended`, `error`
- expose imperative actions for ready, leave, start, and submit command

Do not add reconnect orchestration beyond what the existing live route already supports in the same browser.

**Step 4: Run focused tests**

Run:

```bash
bun test --cwd examples/splendor/web src/hooks/__tests__/use-splendor-app.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add examples/splendor/web/src/hooks/use-splendor-app.ts examples/splendor/web/src/hooks/use-live-room.ts examples/splendor/web/src/hooks/use-live-game.ts examples/splendor/web/src/types/app.ts examples/splendor/web/src/hooks/__tests__/use-splendor-app.test.tsx
git commit -m "feat: add splendor web app workflow state"
```

### Task 5: Replace The Scaffold UI With The Vertical Slice

**Files:**

- Modify: `examples/splendor/web/src/App.tsx`
- Modify: `examples/splendor/web/src/App.css`
- Modify: `examples/splendor/web/src/index.css`
- Create: `examples/splendor/web/src/components/main-menu.tsx`
- Create: `examples/splendor/web/src/components/room-screen.tsx`
- Create: `examples/splendor/web/src/components/game-screen.tsx`
- Create: `examples/splendor/web/src/components/end-screen.tsx`
- Create: `examples/splendor/web/src/components/command-panel.tsx`
- Create: `examples/splendor/web/src/components/discovery-panel.tsx`
- Create: `examples/splendor/web/src/components/view-json.tsx`
- Test: `examples/splendor/web/src/components/__tests__/app.test.tsx`

**Step 1: Write the failing app rendering test**

Cover:

- menu renders create/join controls
- room screen renders room code, seats, readiness, host start button
- game screen renders raw visible state and command controls
- end screen renders winner/result summary and “back to menu”

**Step 2: Implement the first UI slice**

Keep the UI intentionally simple but coherent:

- menu with create/join panels
- room screen with player list and ready/start/leave actions
- game screen with raw visible state JSON and command controls
- end screen with terminal result and return-to-menu action

Do not polish the board layout yet.

**Step 3: Implement one typed command path**

Use generated `CommandRequest`, `DiscoveryRequest`, and `DiscoveryResult` from `splendor-example`.

Support at least one actionable command end-to-end:

- build a command directly for a simple command, or
- use discovery requests/results for one multi-step command

Prefer the simplest working path that proves the generated types are actually useful in the web client.

**Step 4: Run focused component tests**

Run:

```bash
bun test --cwd examples/splendor/web src/components/__tests__/app.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add examples/splendor/web/src/App.tsx examples/splendor/web/src/App.css examples/splendor/web/src/index.css examples/splendor/web/src/components
git commit -m "feat: add splendor web vertical slice ui"
```

### Task 6: Add Web Package Scripts And Final Verification

**Files:**

- Modify: `examples/splendor/web/package.json`
- Optionally modify: `examples/splendor/web/README.md`

**Step 1: Add a web test script if missing**

Use the simplest script shape consistent with the repo.

**Step 2: Run full verification**

Run:

```bash
bun run lint
bunx tsc -b
bun test --cwd packages/tabletop-engine
bun test --cwd packages/cli
bun test --cwd examples/splendor/engine
bun test --cwd examples/splendor/terminal
bun test --cwd examples/splendor/server
bun test --cwd examples/splendor/web
bun run --cwd examples/splendor/web build
```

Expected: PASS

**Step 3: Commit**

```bash
git add examples/splendor/web/package.json examples/splendor/web/README.md
git commit -m "chore: finalize splendor web vertical slice"
```
