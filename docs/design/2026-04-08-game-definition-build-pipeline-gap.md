# Game Definition Build Pipeline Gap Note

## Purpose

This note explains the gap between:

- the full target described in
  [2026-04-08-game-definition-build-pipeline-redesign.md](/home/vincent-bai/Documents/github/tabletop-kernel/docs/design/2026-04-08-game-definition-build-pipeline-redesign.md)
- the currently implemented builder/runtime redesign on the
  `canonical-state-build-redesign` branch

The goal is to make it explicit which parts are already real code and which
parts are still future work for a follow-up PR.

## Implemented In The Current Redesign Slice

The current code now does the following:

### 1. `rootState(...)` is the source of canonical game shape

`GameDefinitionBuilder` now requires `rootState(...)` and no longer relies on
game-definition `initialState(...)`.

### 2. Builder derives canonical game artifacts

`build()` now produces:

- `stateFacade`
- `canonicalGameStateSchema`
- `defaultCanonicalGameState`

These are derived from the decorated root state graph instead of being authored
as a second plain-state definition.

### 3. Default canonical game state is synthesized from state defaults

The engine now derives default canonical game state by:

- instantiating the root state class
- reading field initializers
- auto-instantiating missing nested `t.state(...)` fields
- allowing missing `t.optional(...)` values as `undefined`
- failing on other missing required fields
- dehydrating the temporary state graph back into plain canonical data

### 4. `createInitialState()` uses `defaultCanonicalGameState`

The executor now:

- clones `defaultCanonicalGameState`
- creates runtime
- hydrates writable facades for `setup(...)`
- initializes the stage machine
- returns plain canonical `{ game, runtime }`

### 5. Multi-active memory now captures schema plus initializer

`multiActivePlayer().memory(...)` now uses:

```ts
.memory(
  t.object({ ... }),
  () => initialMemory,
)
```

instead of the older type-only form.

### 6. Splendor was migrated to the new authoring model

The Splendor example now uses:

- field defaults on decorated state classes
- `setup(...)` for dynamic initialization
- no game-definition `initialState(...)`

## Not Implemented Yet

The following parts of the full redesign are still missing.

### 1. Runtime validation of incoming `state.game`

The builder now produces `canonicalGameStateSchema`, but the executor does not
yet validate incoming `state.game` against it in:

- `executeCommand(...)`
- `discoverCommand(...)`
- `listAvailableCommands(...)`
- `getView(...)`

So the engine still trusts incoming canonical game snapshots structurally.

### 2. Runtime validation of incoming `state.runtime`

There is still no engine-owned runtime schema artifact analogous to
`canonicalGameStateSchema`.

The executor does not yet validate:

- `progression`
- `rng`
- `history`
- stage-runtime shape
- multi-active `memory`

when a canonical state is passed in.

### 3. Builder does not yet assemble a runtime schema

The design doc expects the builder to assemble an engine-owned runtime schema
that plugs in game-authored multi-active memory schemas.

That has not been implemented yet.

What exists today:

- multi-active stage definitions store `memorySchema`

What does not exist yet:

- one assembled runtime schema for the full `state.runtime` subtree

### 4. Full validation lifecycle is still missing

The design doc describes validation at several points:

- cloned `defaultCanonicalGameState`
- post-`setup(...)` game state
- initialized runtime state
- incoming canonical state passed into executor APIs
- restored snapshots and replay inputs

Those validation passes are not implemented yet.

### 5. Explicit canonical type helpers are still missing

The code now infers state types better through `rootState(...)`, but there is
still no explicit exported engine helper for:

- canonical game data type
- full canonical `{ game, runtime }` state type

Consumers still rely mostly on inference rather than a named type surface.

### 6. Snapshot and fixture validation is still missing

Replay, harness, and snapshot flows now work with the redesigned canonical game
setup, but they do not yet reject invalid incoming canonical snapshots through
schema validation.

## Why This Was Split

This was intentionally split into two slices:

### Slice 1: builder/setup/schema derivation

The implemented slice focused on:

- removing `initialState(...)`
- deriving canonical game artifacts from `rootState(...)`
- migrating examples to the new initialization model
- changing multi-active memory authoring to include runtime schema

### Slice 2: runtime validation and type surface

The remaining slice should focus on:

- validating incoming `state.game`
- validating incoming `state.runtime`
- assembling runtime schema
- exposing clearer canonical type helpers

This split keeps setup-authoring changes separate from executor trust-boundary
changes.

## Recommended Follow-Up PR Scope

The next PR should implement:

1. an engine-owned runtime schema for `state.runtime`
2. validation of incoming `state.game` against `canonicalGameStateSchema`
3. validation of incoming `state.runtime` against the runtime schema
4. validation hooks for snapshots / replay / scenario fixtures
5. explicit canonical type helpers for consumer DX

That should be treated as a separate feature slice from the already implemented
builder/setup redesign.
