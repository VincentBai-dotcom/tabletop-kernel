# Visibility Projection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the first viewer-specific visibility projection system to `tabletop-kernel`, producing plain serializable visible output from canonical state.

**Architecture:** Extend the state-facade metadata layer with visibility decorators, compile ownership/visibility metadata from the root state, and add a kernel projection API that walks canonical state automatically. Default projection preserves canonical structure, while state-level hooks can fully replace the projected shape for complex cases.

**Tech Stack:** TypeScript, Bun, existing `@State()` / `@field(t...)` metadata system, Bun tests

---

### Task 1: Add failing tests for visibility metadata and projection API

**Files:**

- Modify: `packages/tabletop-kernel/tests/state-facade.test.ts`
- Modify: `packages/tabletop-kernel/tests/kernel-execution.test.ts`

**Step 1: Write the failing tests**

Add tests that assert:

- state metadata can capture visibility decorators
- `@OwnedByPlayer()` establishes ownership metadata
- `@visibleToSelf` without an owning ancestor fails at build time
- a projected visible result returns:
  - `game`
  - `progression`
  - no `rng`
  - no `history`
- `@hidden` projects to `{ __hidden: true }`
- `@visibleToSelf` projects visible data for the owner and a hidden envelope for non-owners
- a state-level custom visibility hook can replace projected shape completely

**Step 2: Run tests to verify they fail**

Run:

```bash
bun test --cwd packages/tabletop-kernel tests/state-facade.test.ts
bun test --cwd packages/tabletop-kernel tests/kernel-execution.test.ts
```

Expected: failures for missing decorators, missing projection API, or incorrect output shape.

**Step 3: Commit**

```bash
git add packages/tabletop-kernel/tests/state-facade.test.ts packages/tabletop-kernel/tests/kernel-execution.test.ts
git commit -m "test: add visibility projection coverage"
```

### Task 2: Add visibility metadata primitives

**Files:**

- Modify: `packages/tabletop-kernel/src/state-facade/metadata.ts`
- Modify: `packages/tabletop-kernel/src/index.ts`
- Test: `packages/tabletop-kernel/tests/state-facade.test.ts`

**Step 1: Add minimal metadata types**

Add runtime metadata support for:

- `@hidden()`
- `@visibleToSelf()`
- `@OwnedByPlayer()`

Add only the metadata necessary for the first implementation:

- hidden field marker
- self-visible field marker
- owning-player class marker using the `id` convention
- optional state-level custom visibility hook metadata if needed

**Step 2: Run the focused metadata tests**

Run:

```bash
bun test --cwd packages/tabletop-kernel tests/state-facade.test.ts
```

Expected: metadata tests pass; projection tests still fail.

**Step 3: Commit**

```bash
git add packages/tabletop-kernel/src/state-facade/metadata.ts packages/tabletop-kernel/src/index.ts packages/tabletop-kernel/tests/state-facade.test.ts
git commit -m "feat: add visibility metadata decorators"
```

### Task 3: Compile ownership and visibility rules from root state

**Files:**

- Modify: `packages/tabletop-kernel/src/state-facade/compile.ts`
- Modify: `packages/tabletop-kernel/src/game-definition.ts`
- Test: `packages/tabletop-kernel/tests/game-definition.test.ts`
- Test: `packages/tabletop-kernel/tests/state-facade.test.ts`

**Step 1: Add failing build-time validation test**

Add or extend tests to cover:

- `@visibleToSelf` requires a nearest owning ancestor
- `@OwnedByPlayer()` state must have an `id` field shape compatible with the convention

**Step 2: Implement compile-time validation**

Compile enough visibility metadata to support projection:

- field visibility kind
- nearest owner-context ancestry
- optional custom state visibility hook presence

Reject invalid authoring during `GameDefinitionBuilder.build()`.

**Step 3: Run tests**

Run:

```bash
bun test --cwd packages/tabletop-kernel tests/game-definition.test.ts
bun test --cwd packages/tabletop-kernel tests/state-facade.test.ts
```

Expected: compile/validation tests pass.

**Step 4: Commit**

```bash
git add packages/tabletop-kernel/src/state-facade/compile.ts packages/tabletop-kernel/src/game-definition.ts packages/tabletop-kernel/tests/game-definition.test.ts packages/tabletop-kernel/tests/state-facade.test.ts
git commit -m "feat: validate visibility projection metadata"
```

### Task 4: Implement visibility projection walker

**Files:**

- Create: `packages/tabletop-kernel/src/state-facade/project.ts`
- Modify: `packages/tabletop-kernel/src/kernel/create-kernel.ts`
- Modify: `packages/tabletop-kernel/src/types/state.ts`
- Modify: `packages/tabletop-kernel/src/index.ts`
- Test: `packages/tabletop-kernel/tests/kernel-execution.test.ts`

**Step 1: Add the visible output type**

Add a plain visible output type for the first implementation, something equivalent to:

```ts
type VisibleState<TVisibleGame> = {
  game: TVisibleGame;
  progression: ProgressionState;
};
```

Also add a `Viewer` type for:

- player
- spectator

**Step 2: Implement automatic projection**

Create a projection walker that:

- starts from canonical `{ game, runtime }`
- returns `{ game, progression }`
- preserves structure by default
- applies `@hidden`
- applies `@visibleToSelf`
- uses the nearest owning-player ancestor
- wraps hidden fields in:
  - `{ __hidden: true }`
  - `{ __hidden: true, value: ... }`

**Step 3: Expose a kernel API**

Add a public API on the executor, for example:

```ts
getView(state, viewer);
```

The executor should remain pure and should not mutate canonical state.

**Step 4: Run projection tests**

Run:

```bash
bun test --cwd packages/tabletop-kernel tests/kernel-execution.test.ts
```

Expected: projection tests pass.

**Step 5: Commit**

```bash
git add packages/tabletop-kernel/src/state-facade/project.ts packages/tabletop-kernel/src/kernel/create-kernel.ts packages/tabletop-kernel/src/types/state.ts packages/tabletop-kernel/src/index.ts packages/tabletop-kernel/tests/kernel-execution.test.ts
git commit -m "feat: add visibility state projection api"
```

### Task 5: Add state-level custom visibility hook support

**Files:**

- Modify: `packages/tabletop-kernel/src/state-facade/metadata.ts`
- Modify: `packages/tabletop-kernel/src/state-facade/project.ts`
- Test: `packages/tabletop-kernel/tests/state-facade.test.ts`
- Test: `packages/tabletop-kernel/tests/kernel-execution.test.ts`

**Step 1: Add failing tests**

Cover:

- custom state visibility hook receives only `viewer`
- hook fully replaces projected shape for that state
- hidden envelope consistency is preserved for hidden child summaries

**Step 2: Implement minimal hook support**

Add one state-level hook convention and support it in projection. Keep it small:

- no field-level custom visibility override yet
- no extra context argument

**Step 3: Run tests**

Run:

```bash
bun test --cwd packages/tabletop-kernel tests/state-facade.test.ts
bun test --cwd packages/tabletop-kernel tests/kernel-execution.test.ts
```

Expected: custom state visibility tests pass.

**Step 4: Commit**

```bash
git add packages/tabletop-kernel/src/state-facade/metadata.ts packages/tabletop-kernel/src/state-facade/project.ts packages/tabletop-kernel/tests/state-facade.test.ts packages/tabletop-kernel/tests/kernel-execution.test.ts
git commit -m "feat: support custom state visibility hooks"
```

### Task 6: Add one concrete example in Splendor

**Files:**

- Modify: `examples/splendor/src/states/*.ts`
- Modify: `examples/splendor/tests/game.test.ts`

**Step 1: Add a small visibility example**

Add a focused hidden-information example in Splendor, such as:

- projecting reserved or hidden card-related state differently by viewer
- or a minimal synthetic hidden field if Splendor does not yet expose a natural consumer-visible hidden path

Keep this example small. Do not redesign Splendor around hidden information.

**Step 2: Run example tests**

Run:

```bash
bun test --cwd examples/splendor
```

Expected: Splendor still passes and demonstrates the projection API.

**Step 3: Commit**

```bash
git add examples/splendor/src examples/splendor/tests/game.test.ts
git commit -m "test: cover visibility projection in splendor"
```

### Task 7: Final verification and docs cleanup

**Files:**

- Modify: `packages/tabletop-kernel/src/index.ts` if export cleanup is needed
- Modify: `docs/design/2026-03-18-visibility-model-decisions.md` only if implementation details require minor alignment

**Step 1: Run full verification**

Run:

```bash
bunx tsc -b
bun run lint
bun test --cwd packages/tabletop-kernel
bun test --cwd examples/splendor
bun test --cwd examples/splendor-terminal
```

Expected: all pass.

**Step 2: Commit final cleanup if needed**

```bash
git add packages/tabletop-kernel/src docs/design/2026-03-18-visibility-model-decisions.md
git commit -m "docs: align visibility projection api"
```
