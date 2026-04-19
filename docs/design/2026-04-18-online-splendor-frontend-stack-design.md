# Online Splendor Frontend Stack Design

## Summary

The recommended frontend stack for the first hosted online Splendor build is:

- `React`
- `Vite`

This should be implemented as a client-rendered single-page application.

## Why This Stack

The hosted Splendor frontend is not a content-heavy public website.

Its primary responsibilities are:

- create room
- join room by code
- show private room state
- show ready/start flow
- show active multiplayer game state
- maintain same-browser reconnect
- show lightweight end screen

This is a good fit for a client-heavy interactive application rather than a
server-rendered web app.

## Why A SPA Is Enough

The product does not currently need:

- SEO
- public indexable content
- server-rendered marketing pages
- framework-managed server data loading for public pages

The important product state is live multiplayer state coming from the backend,
not pre-rendered page HTML.

That means a SPA is sufficient for the first version.

## Chosen Components

### 1. UI Framework: `React`

Use React for the frontend UI layer.

Reasons:

- familiar ecosystem
- good fit for stateful game UI
- easy composition for:
  - main menu
  - room view
  - game view
  - end screen

### 2. Build Tool: `Vite`

Use Vite for local development and production bundling.

Reasons:

- fast local dev loop
- straightforward React setup
- no unnecessary server-rendering framework overhead
- good fit for a frontend that will mainly talk to a separate backend service

Vite should be treated as the bundler/dev-server choice, not as an app
architecture choice.

## Why Not Next.js Or Remix

The current hosted Splendor requirements do not justify SSR-first tooling.

Reasons:

- no SEO-sensitive pages
- no public discoverable lobby pages
- no content site
- backend is already a separate authoritative application service
- game state is fundamentally live client state driven by HTTP + WebSocket

Using Next.js or Remix now would add:

- server/client rendering complexity
- more framework conventions
- more routing and data-loading abstraction

without solving a real product problem for the first version.

That complexity is not justified yet.

## Application Shape

The frontend should be a single-page application with clear phase-based routing.

Recommended high-level screens:

- main menu
- room screen
- game screen
- end screen

This maps directly to the lifecycle already defined in the hosted requirements.

## Frontend Responsibilities

The frontend should own:

- browser-local anonymous session token storage
- room code entry
- display name entry
- room ready/unready interactions
- start-game interaction for host
- rendering visible game state
- command selection and submission
- reconnect/resume UX for same browser/device
- terminal end screen and return to main menu

The frontend should not own game authority.

The backend remains authoritative for:

- room state
- host assignment
- ready state
- active game state
- command validation
- disconnect invalidation

## Routing Direction

The first version only needs client-side routing.

Suggested route structure:

- `/`
  main menu
- `/room/:roomCode`
  pre-game room
- `/game/:gameId`
  active game
- `/game/:gameId/end`
  terminal result screen

These URLs can still exist in a SPA without SSR.

The router choice can stay simple and does not need to be decided in this
document.

## State Boundaries

Recommended frontend state split:

### Local Persistent State

Stored in browser storage:

- anonymous browser/session token
- possibly last known room/game identifiers for reconnect attempts

### Short-Lived UI State

Stored in React state:

- form inputs
- selection menus
- loading indicators
- optimistic UI only where safe

### Authoritative Session State

Driven by backend responses and live messages:

- room membership
- ready state
- host status
- active visible game state
- terminal result state

The client should treat these as server-owned snapshots, not local truth.

## HTTP vs WebSocket On The Client

The frontend should use both:

### HTTP

Use HTTP for:

- create room
- join room
- ready / unready
- start game
- initial bootstrap fetches if needed

### WebSocket

Use WebSocket for:

- room presence updates
- room state updates
- active game state updates
- disconnect/end notifications
- command result fanout

This keeps the UI responsive without forcing all application interactions into a
single transport model.

## Reconnect Model

The frontend must be built around reconnect as a normal case.

That means:

- store anonymous session identity locally
- reconnect WebSocket automatically
- re-bootstrap room/game state after reconnect
- treat a dropped socket as transport loss, not immediate identity loss

If the backend determines that the player can no longer resume:

- the client should move into the terminal invalidation/end flow

## Relationship To Generated Types

The frontend should use generated game-facing types where possible.

That includes:

- generated visible game state types
- generated command/discovery-related types where useful

This helps validate whether the CLI-generated artifacts are actually useful in a
real hosted product flow.

The frontend should avoid hand-authoring large game-specific visible-state type
surfaces when generated types already exist.

## Styling / UI Framework

No CSS/UI framework decision is required yet.

That can be chosen later based on:

- speed of implementation
- accessibility needs
- desired visual polish

For now, the important decision is:

- React SPA
- Vite bundling

## Recommendation

Use a client-rendered frontend with:

- `React`
- `Vite`

for the first online Splendor build.

This is the most pragmatic choice because it:

- fits the real-time game UI well
- avoids unnecessary SSR complexity
- matches the separate backend-service architecture
- keeps the frontend focused on room/game interaction rather than rendering
  strategy concerns
