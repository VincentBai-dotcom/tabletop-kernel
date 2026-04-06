# Stage-Machine Progression Rewrite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the legacy nested progression-segment subsystem with the new stage-machine design based on `defineStage(...)`, `singleActivePlayer`, and `automatic`, with no backward compatibility.

**Architecture:** Remove the old segment tree types and runtime entirely. Introduce a new authored stage builder plus a compiled stage graph rooted at `initialStage`, store only serializable current-stage data in runtime, and make `GameDefinitionBuilder` derive both the reachable stage graph and command registry from stages. Migrate Splendor to the new stage API and update all affected tests, protocol schemas, and runtime events.

**Tech Stack:** TypeScript, Bun, TypeBox, existing state facade system, existing command builder system.

---

### Task 1: Replace progression public types with stage-machine types

**Files:**

- Modify: `packages/tabletop-engine/src/types/progression.ts`
- Modify: `packages/tabletop-engine/src/types/state.ts`
- Modify: `packages/tabletop-engine/src/types/visibility.ts`
- Modify: `packages/tabletop-engine/src/index.ts`
- Test: `packages/tabletop-engine/tests/types.test.ts`

**Step 1: Write the failing type tests**

Add or replace type-level assertions in `packages/tabletop-engine/tests/types.test.ts` to cover:

- `defineStage("turn").singleActivePlayer()...build()`
- `defineStage("gameEnd").automatic().build()`
- `runtime.progression.currentStage.kind === "activePlayer"` exposing `activePlayerId`
- `runtime.progression.currentStage.kind === "automatic"` exposing no active-player field
- `transition(({ nextStages, self }) => ...)` seeing only statically declared next stages plus `self`

**Step 2: Run the targeted type test file**

Run: `bun test --cwd packages/tabletop-engine tests/types.test.ts`
Expected: FAIL because the new stage-machine types and builder do not exist yet.

**Step 3: Replace legacy progression types**

In `packages/tabletop-engine/src/types/progression.ts`:

- delete `ProgressionSegmentDefinition`, `ProgressionSegmentState`, `ProgressionNavigation`, completion-policy types, lifecycle-hook types, and nested-root `ProgressionDefinition`
- add new public stage-machine types:
  - `SingleActivePlayerStageDefinition`
  - `AutomaticStageDefinition`
  - `StageDefinition`
  - `StageBuilder`-related authored types as needed
  - `CurrentSingleActivePlayerStageState`
  - `CurrentAutomaticStageState`
  - `CurrentStageState`
  - `ProgressionState` with `currentStage`
- add transition-context public types that expose:
  - readonly `game`
  - readonly `runtime`
  - `self`
  - `nextStages`
  - `command` for `singleActivePlayer` transition only
- keep runtime state serializable by storing only stage ids/kinds and active player ids

Update `packages/tabletop-engine/src/types/state.ts` and `packages/tabletop-engine/src/types/visibility.ts` to reference the new `ProgressionState`.

Update `packages/tabletop-engine/src/index.ts` exports to remove the old progression exports and expose the new stage-machine surface.

**Step 4: Run the targeted type test file**

Run: `bun test --cwd packages/tabletop-engine tests/types.test.ts`
Expected: PASS or fail only on later unimplemented stage-builder/runtime details.

**Step 5: Commit**

```bash
git add packages/tabletop-engine/src/types/progression.ts packages/tabletop-engine/src/types/state.ts packages/tabletop-engine/src/types/visibility.ts packages/tabletop-engine/src/index.ts packages/tabletop-engine/tests/types.test.ts
git commit -m "refactor: replace progression public types"
```

### Task 2: Add the chained stage builder API

**Files:**

- Create: `packages/tabletop-engine/src/stage-factory.ts`
- Modify: `packages/tabletop-engine/src/index.ts`
- Test: `packages/tabletop-engine/tests/types.test.ts`
- Test: `packages/tabletop-engine/tests/game-definition.test.ts`

**Step 1: Write the failing tests**

Add tests for:

- `defineStage("turn").singleActivePlayer().activePlayer(...).commands([...]).transition(...).build()`
- `.nextStages({...})` exposing named refs in `transition(...)`
- `self` always present in `transition(...)`
- `.automatic().build()` being valid for terminal stages
- `.commands(...)` no longer being required on `GameDefinitionBuilder` when an initial stage is supplied

**Step 2: Run the targeted tests**

Run:

- `bun test --cwd packages/tabletop-engine tests/types.test.ts`
- `bun test --cwd packages/tabletop-engine tests/game-definition.test.ts`

Expected: FAIL because the stage builder is not implemented.

**Step 3: Implement `defineStage(...)`**

Create `packages/tabletop-engine/src/stage-factory.ts`:

- base `defineStage(id)` returns a builder that only exposes:
  - `.singleActivePlayer()`
  - `.automatic()`
- `singleActivePlayer` chain must support:
  - `.activePlayer(...)`
  - `.commands(...)`
  - `.nextStages(...)`
  - `.transition(...)`
  - `.build()`
- `automatic` chain must support:
  - `.run(...)`
  - `.nextStages(...)`
  - `.transition(...)`
  - `.build()`
- enforce:
  - `singleActivePlayer` requires `activePlayer`, `commands`, and `transition`
  - `automatic` requires only `.automatic()` before `.build()`
  - `transition(...)` receives `self` and named `nextStages`
  - `transition(...)` may only return `self` or one of `nextStages`

Export `defineStage` and any public builder types from `packages/tabletop-engine/src/index.ts`.

**Step 4: Run the targeted tests**

Run:

- `bun test --cwd packages/tabletop-engine tests/types.test.ts`
- `bun test --cwd packages/tabletop-engine tests/game-definition.test.ts`

Expected: PASS or fail only on builder integration not yet implemented.

**Step 5: Commit**

```bash
git add packages/tabletop-engine/src/stage-factory.ts packages/tabletop-engine/src/index.ts packages/tabletop-engine/tests/types.test.ts packages/tabletop-engine/tests/game-definition.test.ts
git commit -m "feat: add stage builder api"
```

### Task 3: Replace game-definition progression registration with initial stage compilation

**Files:**

- Modify: `packages/tabletop-engine/src/game-definition.ts`
- Test: `packages/tabletop-engine/tests/game-definition.test.ts`

**Step 1: Write the failing runtime/builder tests**

Update `packages/tabletop-engine/tests/game-definition.test.ts` to cover:

- `.initialStage(stage)` instead of `.progression(...)`
- omission of `.commands(...)`
- reachable command registry derivation from stages
- duplicate command ids across staged command references rejected once at build time
- duplicate stage ids in the reachable graph rejected
- undeclared returned transition targets impossible by type or impossible at compile time

**Step 2: Run the targeted test**

Run: `bun test --cwd packages/tabletop-engine tests/game-definition.test.ts`
Expected: FAIL because `GameDefinitionBuilder` still uses `.progression(...)` and `.commands(...)`.

**Step 3: Rewrite `GameDefinitionBuilder`**

In `packages/tabletop-engine/src/game-definition.ts`:

- remove `progression(...)`
- remove `.commands(...)`
- add `.initialStage(stage)`
- compile the reachable stage graph from that initial stage
- derive the command registry from all reachable stage `commands(...)`
- dedupe command objects by `commandId`
- preserve root-state compilation and setup/rng behavior

Delete old command-list plumbing from the builder state if no longer needed.

**Step 4: Run the targeted test**

Run: `bun test --cwd packages/tabletop-engine tests/game-definition.test.ts`
Expected: PASS or fail only in downstream runtime/protocol code that still expects legacy progression.

**Step 5: Commit**

```bash
git add packages/tabletop-engine/src/game-definition.ts packages/tabletop-engine/tests/game-definition.test.ts
git commit -m "refactor: compile stages in game builder"
```

### Task 4: Replace progression normalization, contexts, and executor runtime with stage-machine execution

**Files:**

- Delete: `packages/tabletop-engine/src/runtime/progression-normalize.ts`
- Delete: `packages/tabletop-engine/src/runtime/progression-lifecycle.ts`
- Modify: `packages/tabletop-engine/src/runtime/game-executor.ts`
- Modify: `packages/tabletop-engine/src/runtime/contexts.ts`
- Modify: `packages/tabletop-engine/src/types/command.ts`
- Test: `packages/tabletop-engine/tests/kernel-execution.test.ts`

**Step 1: Write the failing runtime tests**

Update `packages/tabletop-engine/tests/kernel-execution.test.ts` to cover:

- initial runtime stores `runtime.progression.currentStage`
- `singleActivePlayer` computes `activePlayerId`
- wrong actor commands are rejected by stage ownership
- automatic stages run immediately after a successful player command
- runtime transitions emit stage enter/exit events and update `currentStage`
- terminal automatic stage stops progression without legacy segment data

**Step 2: Run the targeted runtime test**

Run: `bun test --cwd packages/tabletop-engine tests/kernel-execution.test.ts`
Expected: FAIL because the executor still runs legacy segment lifecycle logic.

**Step 3: Replace stage execution internals**

In `packages/tabletop-engine/src/runtime/game-executor.ts`:

- remove `normalizeProgressionDefinition(...)`
- remove `resolveProgressionLifecycle(...)`
- initialize runtime from compiled initial stage
- gate player command execution by:
  - current stage kind must be `activePlayer`
  - `command.actorId` must equal `currentStage.activePlayerId`
  - command must belong to the current stage’s static command set
- after successful command execution:
  - evaluate the stage transition
  - enter the next stage
  - if the next stage is `automatic`, run it and continue until reaching:
    - `singleActivePlayer`, or
    - terminal `automatic`
- keep runtime fully serializable by storing only `currentStage`

In `packages/tabletop-engine/src/runtime/contexts.ts`:

- delete old progression completion/lifecycle helpers
- add stage transition and stage-entry context creators as needed
- remove segment navigation APIs

In `packages/tabletop-engine/src/types/command.ts`:

- remove `setCurrentSegmentOwner(...)` from execute contexts
- adjust any command/runtime context types that still depend on legacy progression shape

Delete the legacy normalization and lifecycle runtime modules once the executor no longer uses them.

**Step 4: Run the targeted runtime test**

Run: `bun test --cwd packages/tabletop-engine tests/kernel-execution.test.ts`
Expected: PASS or fail only in protocol/example code still expecting legacy progression.

**Step 5: Commit**

```bash
git add packages/tabletop-engine/src/runtime/game-executor.ts packages/tabletop-engine/src/runtime/contexts.ts packages/tabletop-engine/src/types/command.ts packages/tabletop-engine/tests/kernel-execution.test.ts
git rm packages/tabletop-engine/src/runtime/progression-normalize.ts packages/tabletop-engine/src/runtime/progression-lifecycle.ts
git commit -m "refactor: execute stage-machine progression"
```

### Task 5: Replace progression runtime events and protocol/view schema

**Files:**

- Modify: `packages/tabletop-engine/src/runtime/events.ts`
- Modify: `packages/tabletop-engine/src/protocol/describe.ts`
- Modify: `packages/tabletop-engine/src/protocol/asyncapi.ts` if required by schema changes
- Test: `packages/tabletop-engine/tests/asyncapi.test.ts`
- Test: `packages/tabletop-engine/tests/protocol.test.ts`

**Step 1: Write the failing protocol/event tests**

Update tests to assert:

- visible/protocol progression shape uses `currentStage`
- runtime events are stage-based instead of segment-based
- no serialized `segments`, `rootId`, `current`, `ownerId`, or `activePath`

**Step 2: Run the targeted tests**

Run:

- `bun test --cwd packages/tabletop-engine tests/protocol.test.ts`
- `bun test --cwd packages/tabletop-engine tests/asyncapi.test.ts`

Expected: FAIL because protocol schemas and runtime events still describe segments.

**Step 3: Replace stage runtime serialization/event payloads**

In `packages/tabletop-engine/src/runtime/events.ts`:

- replace `segment_entered` / `segment_exited` payloads with `stage_entered` / `stage_exited` or an agreed stage-based equivalent
- include only serializable stage metadata such as:
  - `stageId`
  - `kind`
  - `activePlayerId` when relevant

In `packages/tabletop-engine/src/protocol/describe.ts` and `packages/tabletop-engine/src/protocol/asyncapi.ts`:

- replace segment-tree schemas with the new `runtime.progression.currentStage` schema
- ensure view/protocol generation matches the new serializable runtime shape exactly

**Step 4: Run the targeted tests**

Run:

- `bun test --cwd packages/tabletop-engine tests/protocol.test.ts`
- `bun test --cwd packages/tabletop-engine tests/asyncapi.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/tabletop-engine/src/runtime/events.ts packages/tabletop-engine/src/protocol/describe.ts packages/tabletop-engine/src/protocol/asyncapi.ts packages/tabletop-engine/tests/protocol.test.ts packages/tabletop-engine/tests/asyncapi.test.ts
git commit -m "refactor: expose stage runtime in protocol"
```

### Task 6: Migrate Splendor to the new stage-machine API

**Files:**

- Modify: `examples/splendor/src/game.ts`
- Modify: `examples/splendor/src/setup.ts`
- Modify: `examples/splendor/src/commands/shared.ts`
- Test: `examples/splendor/tests/game.test.ts`
- Test: `examples/splendor-terminal/tests/session.test.ts`

**Step 1: Write the failing example tests**

Update Splendor tests to assert:

- `runtime.progression.currentStage.kind === "activePlayer"`
- `runtime.progression.currentStage.activePlayerId` rotates correctly
- runtime events use stage-based payloads

**Step 2: Run the targeted example tests**

Run:

- `bun test --cwd examples/splendor`
- `bun test --cwd examples/splendor-terminal`

Expected: FAIL because Splendor still uses `.progression(...)`, setup assigns `segments.turn.ownerId`, and command helpers inspect the legacy runtime shape.

**Step 3: Rewrite Splendor progression**

In `examples/splendor/src/game.ts`:

- define stages with `defineStage(...)`
- replace `.progression(...)` and `.commands(...)` with `.initialStage(...)`
- model turn cleanup and next-player selection using an `automatic` stage where needed
- keep endgame as a terminal automatic stage

In `examples/splendor/src/setup.ts`:

- stop mutating `runtime.progression.segments.turn!.ownerId`
- rely on the initial stage’s `activePlayer(...)` logic

In `examples/splendor/src/commands/shared.ts`:

- replace `assertActivePlayer(...)` to read `runtime.progression.currentStage`
- remove all legacy segment-runtime assumptions

**Step 4: Run the targeted example tests**

Run:

- `bun test --cwd examples/splendor`
- `bun test --cwd examples/splendor-terminal`

Expected: PASS.

**Step 5: Commit**

```bash
git add examples/splendor/src/game.ts examples/splendor/src/setup.ts examples/splendor/src/commands/shared.ts examples/splendor/tests/game.test.ts examples/splendor-terminal/tests/session.test.ts
git commit -m "refactor: migrate splendor to stage machine"
```

### Task 7: Remove remaining legacy progression code and finish verification

**Files:**

- Modify: any remaining engine/example files still referencing `segment`, `ownerId`, `completionPolicy`, `resolveNext`, `onEnter`, `onExit`, or `.progression(...)`
- Test: full repo verification

**Step 1: Search for leftover legacy progression references**

Run:

```bash
rg -n "segment|ownerId|completionPolicy|resolveNext|onEnter|onExit|\\.progression\\(" packages/tabletop-engine/src packages/tabletop-engine/tests examples/splendor examples/splendor-terminal
```

Expected: only intentional non-progression matches remain.

**Step 2: Remove dead code and update any remaining callers**

Delete or rewrite any leftover progression code paths so there is no backward-compatible segment subsystem remaining.

**Step 3: Run full verification**

Run:

```bash
bun run lint
bunx tsc -b
bun test --cwd packages/tabletop-engine
bun test --cwd examples/splendor
bun test --cwd examples/splendor-terminal
```

Expected: all pass.

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove legacy progression system"
```
