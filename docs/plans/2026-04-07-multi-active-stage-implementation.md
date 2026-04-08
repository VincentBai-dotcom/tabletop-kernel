# Multi-Active Stage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `multiActivePlayer` stage support to the stage-machine progression system, including authoring, runtime state, and executor flow.

**Architecture:** Extend the existing stage-machine types and chained stage builder with a third stage kind rather than layering a separate subsystem on top. Keep multi-active coordination engine-owned at the stage-runtime layer, while letting the stage author control command timing and ordering through typed memory and an imperative `onSubmit(...)` hook.

**Tech Stack:** TypeScript, Bun, existing `tabletop-engine` stage-machine runtime and test suite.

---

### Task 1: Add failing type coverage for multi-active stage authoring

**Files:**

- Modify: `packages/tabletop-engine/tests/types.test.ts`

**Step 1: Write the failing test**

Add a new type-level test that authors a `multiActivePlayer` stage with:

- `.memory<T>(() => ...)`
- `.activePlayers(...)`
- `.commands([...])`
- `.onSubmit(...)`
- `.isComplete(...)`
- `.nextStages(...)`
- `.transition(...)`

The test should assert:

- `memory` is strongly typed in all multi-active hooks
- `currentStage.kind === "multiActivePlayer"` narrows to `activePlayerIds`
- `.build()` is hidden until required multi-active methods are present

**Step 2: Run test to verify it fails**

Run: `bun test --cwd packages/tabletop-engine tests/types.test.ts`

Expected: FAIL because `multiActivePlayer`, `memory`, and related types do not exist yet.

**Step 3: Write minimal implementation**

No production code in this task.

**Step 4: Run test to verify it passes**

Not applicable yet.

**Step 5: Commit**

```bash
git add packages/tabletop-engine/tests/types.test.ts
git commit -m "test: define multi-active stage authoring contract"
```

### Task 2: Add failing runtime tests for multi-active execution flow

**Files:**

- Modify: `packages/tabletop-engine/tests/kernel-execution.test.ts`
- Modify: `packages/tabletop-engine/tests/game-definition.test.ts`
- Modify: `packages/tabletop-engine/tests/helpers/stages.ts`

**Step 1: Write the failing tests**

Add runtime tests that cover:

- initial multi-active stage setup stores `activePlayerIds`
- inactive-player submissions are rejected
- a valid submission calls `onSubmit(...)`
- `activePlayers(...)` is recomputed after submission using stage memory
- `isComplete(...)` gates transition
- `transition(...)` only runs once complete
- command registration from multi-active stages is included in the game definition command map

Use a minimal test game and a simple command that mutates a scalar counter or log.

**Step 2: Run tests to verify they fail**

Run:

```bash
bun test --cwd packages/tabletop-engine tests/kernel-execution.test.ts
bun test --cwd packages/tabletop-engine tests/game-definition.test.ts
```

Expected: FAIL because multi-active runtime and compilation behavior do not exist yet.

**Step 3: Write minimal implementation**

No production code in this task.

**Step 4: Run tests to verify they pass**

Not applicable yet.

**Step 5: Commit**

```bash
git add packages/tabletop-engine/tests/kernel-execution.test.ts packages/tabletop-engine/tests/game-definition.test.ts packages/tabletop-engine/tests/helpers/stages.ts
git commit -m "test: lock multi-active stage execution behavior"
```

### Task 3: Extend progression types and runtime state

**Files:**

- Modify: `packages/tabletop-engine/src/types/progression.ts`
- Modify: `packages/tabletop-engine/src/types/state.ts`
- Modify: `packages/tabletop-engine/src/index.ts`

**Step 1: Write the minimal implementation**

Add:

- `MultiActivePlayerStageState`
- union updates for `StageState`
- `MultiActivePlayerStageDefinition`
- multi-active hook context types:
  - memory
  - `activePlayers(...)`
  - `onSubmit(...)`
  - `isComplete(...)`
  - `transition(...)`
- progression runtime support for current multi-active memory
- exported types from the package root

Keep memory plain serializable runtime data, not `@State`-hydrated facade state.

**Step 2: Run targeted tests**

Run:

```bash
bun test --cwd packages/tabletop-engine tests/types.test.ts
```

Expected: still FAIL, but with fewer missing-type errors and now failing deeper in builder/runtime behavior.

**Step 3: Refine types until the type-level tests pass**

Update any type aliases or exported names needed so the new authoring contract is expressible.

**Step 4: Run test to verify it passes**

Run:

```bash
bun test --cwd packages/tabletop-engine tests/types.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/tabletop-engine/src/types/progression.ts packages/tabletop-engine/src/types/state.ts packages/tabletop-engine/src/index.ts packages/tabletop-engine/tests/types.test.ts
git commit -m "refactor: add multi-active progression types"
```

### Task 4: Extend the stage builder with `.multiActivePlayer()`

**Files:**

- Modify: `packages/tabletop-engine/src/stage-factory.ts`
- Modify: `packages/tabletop-engine/src/index.ts`

**Step 1: Write the minimal implementation**

Add builder support for:

- `.multiActivePlayer()`
- `.memory<T>(() => initialMemory)`
- `.activePlayers(...)`
- `.commands([...])`
- `.onSubmit(...)`
- `.isComplete(...)`
- `.nextStages(...)`
- `.transition(...)`
- `.build()`

Keep `.build()` unavailable until the required multi-active methods are present.

**Step 2: Run targeted tests**

Run:

```bash
bun test --cwd packages/tabletop-engine tests/types.test.ts
```

Expected: PASS on authoring-surface tests, with runtime tests still failing.

**Step 3: Clean up any duplicate builder typing**

Keep the builder implementation aligned with the existing chained style and avoid unnecessary overloads.

**Step 4: Run test to verify it passes**

Run:

```bash
bun test --cwd packages/tabletop-engine tests/types.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/tabletop-engine/src/stage-factory.ts packages/tabletop-engine/src/index.ts packages/tabletop-engine/tests/types.test.ts
git commit -m "refactor: add multi-active stage builder"
```

### Task 5: Implement multi-active command registration in game definition compilation

**Files:**

- Modify: `packages/tabletop-engine/src/game-definition.ts`
- Modify: `packages/tabletop-engine/tests/game-definition.test.ts`

**Step 1: Write the minimal implementation**

Update reachable stage compilation and command map generation so:

- multi-active stages are traversed like other stage kinds
- their commands are added to the game command registry
- duplicate command id checks continue to work

**Step 2: Run targeted tests**

Run:

```bash
bun test --cwd packages/tabletop-engine tests/game-definition.test.ts
```

Expected: PASS

**Step 3: Verify nothing regressed in existing stage kinds**

Run a nearby builder test or the whole file again.

**Step 4: Run test to verify it passes**

Run:

```bash
bun test --cwd packages/tabletop-engine tests/game-definition.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/tabletop-engine/src/game-definition.ts packages/tabletop-engine/tests/game-definition.test.ts
git commit -m "refactor: compile multi-active stage commands"
```

### Task 6: Implement executor support for multi-active stage flow

**Files:**

- Modify: `packages/tabletop-engine/src/runtime/game-executor.ts`
- Modify: `packages/tabletop-engine/src/runtime/events.ts` (only if stage events need new state shapes)
- Modify: `packages/tabletop-engine/tests/kernel-execution.test.ts`

**Step 1: Write the minimal implementation**

Extend the executor to:

- initialize multi-active stages on entry with:
  - stage id
  - kind
  - `activePlayerIds`
  - initialized memory
- expose memory to multi-active hooks
- reject submissions from actors not in the current active set
- call `onSubmit(...)` after stage-level actor/command checks
- provide `execute(command)` in the `onSubmit(...)` context
- recompute active players after each accepted submission
- run `isComplete(...)`
- only call `transition(...)` once complete
- preserve `lastActingStage` semantics for single-active stages

**Step 2: Run targeted tests**

Run:

```bash
bun test --cwd packages/tabletop-engine tests/kernel-execution.test.ts
```

Expected: PASS

**Step 3: Refine runtime state transitions**

Check event emission and stage-entered/stage-exited behavior for multi-active transitions so they stay consistent with the existing stage-machine model.

**Step 4: Run test to verify it passes**

Run:

```bash
bun test --cwd packages/tabletop-engine tests/kernel-execution.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/tabletop-engine/src/runtime/game-executor.ts packages/tabletop-engine/src/runtime/events.ts packages/tabletop-engine/tests/kernel-execution.test.ts
git commit -m "refactor: execute multi-active stages"
```

### Task 7: Full verification and cleanup

**Files:**

- Review modified files only

**Step 1: Run the full verification set**

Run:

```bash
bun run lint
bunx tsc -b
bun test --cwd packages/tabletop-engine
bun test --cwd examples/splendor
bun test --cwd examples/splendor-terminal
```

Expected: all PASS

**Step 2: Inspect git status**

Run:

```bash
git status --short
```

Expected: clean worktree

**Step 3: Commit any final cleanup**

If verification surfaced a small cleanup, commit it separately with a focused message.

**Step 4: Prepare branch for review**

Summarize:

- new stage kind
- runtime shape changes
- test coverage added

**Step 5: Commit**

No-op if already clean.
