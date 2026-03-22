# Persistence Adapter Design

This document explores how persistence should fit into `tabletop-kernel` when the kernel is used in a central authoritative server architecture.

This is not yet a locked implementation decision.

The purpose is to clarify a design direction that balances:

- end-to-end agent usability
- optional persistence for local and simulation use cases
- safe authoritative server orchestration
- pluggable storage backends

## The Core Question

When a client sends a command to an authoritative server, should `tabletop-kernel` itself know how to coordinate persistence, or should persistence always live entirely outside the kernel in host code?

A strong candidate pattern is:

- `tabletop-kernel` provides optional persistence orchestration
- the consumer supplies a storage adapter implementation
- concrete storage adapters live in separate packages

This is similar in spirit to the way Mastra lets the consumer pass a storage adapter into the main runtime while keeping actual storage backends pluggable.

Reference:

- https://mastra.ai/docs/memory/storage

## Why This Matters

In a central authoritative server, the host usually wants all of these at once:

- authoritative in-memory match state for fast execution
- durable persistence in a database
- safe handling when persistence fails
- a standard place to coordinate command execution and persistence
- the option to swap storage backends without rewriting orchestration

If every consumer hand-rolls this flow, there is a high chance of inconsistent or unsafe commit ordering.

## The Minimum Safe Hosted Flow

For a persistence-backed authoritative server, the safest default execution flow is:

1. load the current authoritative match state
2. execute the command against a working copy
3. if execution fails, keep the old state
4. if execution succeeds, persist the new snapshot/history first
5. only after persistence succeeds, replace the live in-memory state
6. only after that, acknowledge or broadcast success

Important principle:

- do not publish or install the new live authoritative state until durable persistence succeeds

This is the core reason persistence orchestration is worth standardizing.

## Recommended Direction

The current recommended direction is:

- keep pure deterministic rule execution inside `tabletop-kernel`
- also allow an optional persistence adapter to be plugged into a higher-level runtime/session API inside the same main package
- put concrete storage adapters in separate packages

This means:

- no storage adapter: pure in-memory behavior, same as usual
- storage adapter present: kernel-managed hosted execution orchestration becomes available

## Why This Direction Looks Good

### Good consumer ergonomics

Consumers can adopt persistence by plugging in one adapter rather than designing the orchestration themselves.

This is especially useful for agent-driven project generation.

### No penalty for local/sim-only use

If no persistence adapter is supplied:

- the kernel still works normally
- local tools, bots, tests, and simulations stay simple
- no database is required

### Centralized commit-ordering semantics

The tricky part is not “how to save data.”

The tricky part is:

- when to persist
- when to swap in-memory state
- what to do on failure
- what artifacts to save with the state

Those rules are valuable to standardize once.

### Separate backend adapters still keep storage modular

The main package can expose the adapter interface and orchestration logic, while packages like:

- `@tabletop-kernel/postgres`
- `@tabletop-kernel/libsql`
- `@tabletop-kernel/memory-store`

can provide concrete implementations.

This keeps database-specific dependencies out of the main package.

## What Should Stay In `tabletop-kernel`

If this direction is adopted, the main package would own:

- pure command execution
- snapshot creation and restore
- replay/history artifacts
- a persistence adapter interface
- a hosted-runtime/session orchestration layer that optionally uses persistence
- the standard safe commit ordering for authoritative matches

The important boundary is:

- `tabletop-kernel` may orchestrate persistence
- it should not ship direct Postgres/libSQL/etc. dependencies in the core package

## What Should Live In Separate Adapter Packages

Separate packages should own:

- concrete database drivers
- schema details for those backends
- migrations or store initialization logic
- backend-specific tuning or batching behavior

Example future packages:

- `@tabletop-kernel/postgres`
- `@tabletop-kernel/libsql`
- `@tabletop-kernel/redis`
- `@tabletop-kernel/memory-store`

## Suggested Interface Shape

Exact names are still open, but the orchestration-friendly interface likely needs capabilities like:

- load a match/session
- persist a new match/session snapshot
- optionally append replay/history artifacts
- optionally provide optimistic concurrency or version checks

Illustrative shape only:

```ts
interface MatchStore<State, ResultMetadata = unknown> {
  load(matchId: string): Promise<StoredMatch<State> | null>;
  save(input: SaveMatchInput<State, ResultMetadata>): Promise<void>;
}

interface StoredMatch<State> {
  matchId: string;
  state: State;
  version: number | string;
  metadata?: unknown;
}

interface SaveMatchInput<State, ResultMetadata> {
  matchId: string;
  previousVersion?: number | string;
  nextState: State;
  commandType: string;
  actorId?: string;
  resultMetadata?: ResultMetadata;
}
```

This is only illustrative.

The important point is that the store contract should support safe hosted execution, not just raw blob saving.

## In-Memory Behavior Should Remain First-Class

If no store is provided, the runtime should still support:

- creating initial state
- executing commands in memory
- using snapshots and replay locally
- test harnesses
- simulations and bots

This keeps the pure engine path first-class rather than turning persistence into a requirement.

## Failure Semantics

If persistence is used, the runtime should define clear failure semantics.

Recommended default:

- validation failure: no persistence attempt, unchanged state
- execution failure before commit: no persistence attempt, unchanged state
- persistence failure after successful execution on a working copy:
  - do not swap in-memory authoritative state
  - do not acknowledge success as committed
  - surface a persistence failure result to the host

Important consequence:

- a successfully computed next state is not considered committed until persistence succeeds

## Relationship To Replay

Persistence-backed orchestration should probably persist more than just the latest snapshot.

Good candidates:

- latest canonical snapshot
- accepted command metadata
- optional committed events
- optional replay/checkpoint artifacts

The exact storage schema can vary by adapter, but the orchestration layer should assume replay-compatible artifacts matter.

## Relationship To Client/Server Interaction

This design works especially well with the earlier client/server interaction recommendation:

- command submission via request/response
- viewer-specific snapshot on join/reconnect
- viewer-specific updates after accepted execution

Persistence fits under that model naturally:

- server executes command
- persistence succeeds
- live state is swapped
- clients are updated

If persistence fails:

- no committed outward update should be published

## Main Alternative

The main alternative is:

- keep persistence entirely outside `tabletop-kernel`
- give the consumer only snapshots and execution results
- let each host implement commit ordering itself

This keeps the kernel smaller, but has downsides:

- more duplicated orchestration logic
- easier for consumers to get commit ordering wrong
- worse end-to-end ergonomics for agent-generated backends

For this project’s goals, that now looks weaker than the adapter-based direction.

## Current Direction

The current design direction is:

- allow optional persistence orchestration in the main `tabletop-kernel` API surface
- keep persistence opt-in
- keep pure in-memory usage first-class when no adapter is provided
- keep concrete storage implementations in separate packages

This gives the project:

- a strong end-to-end hosted story
- optional adoption
- pluggable storage backends
- standardized authoritative commit behavior

## Open Questions

These questions remain open for later:

- should the store interface operate on raw snapshots only, or also replay/history artifacts
- should the orchestration layer include in-memory caching/session management by default
- how should optimistic concurrency/version conflicts be modeled
- should there be one generic `MatchStore`, or separate snapshot/log stores
- whether the initial built-in adapter package should be in-memory, libSQL, PostgreSQL, or something else
