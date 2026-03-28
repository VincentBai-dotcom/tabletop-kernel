# Splendor State Class Consolidation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the remaining Splendor plain-state interfaces and `*-ops` helpers with `@State()` classes so Splendor uses the state-facade model end to end.

**Architecture:** Move each authored Splendor state into its own file under a dedicated `examples/splendor/src/states/` folder. Compile `players` and other nested structures as real state references, then move game/player/token DSL onto those state classes and update commands/setup/tests to use those methods directly.

**Tech Stack:** TypeScript, Bun, tabletop-kernel state-facade metadata, Splendor example tests

---

### Task 1: Lock the intended state-facade shape with tests

**Files:**

- Modify: `examples/splendor/tests/game.test.ts`

**Steps:**

1. Add a failing test that asserts the compiled root-state metadata records `players` as `record(string -> state(SplendorPlayerState))`.
2. Add a failing execution-level assertion that the hydrated root facade exposes player methods directly rather than returning a `PlayerOps` wrapper.
3. Run: `bun test --cwd examples/splendor --filter splendor`
4. Confirm the new assertions fail for the current interface/ops split.

### Task 2: Introduce per-state classes under `states/`

**Files:**

- Create: `examples/splendor/src/states/token-counts.ts`
- Create: `examples/splendor/src/states/player-state.ts`
- Create: `examples/splendor/src/states/bank-state.ts`
- Create: `examples/splendor/src/states/board-state.ts`
- Create: `examples/splendor/src/states/end-game-state.ts`
- Create: `examples/splendor/src/states/game-state.ts`
- Modify: `examples/splendor/src/state.ts`

**Steps:**

1. Move token constants/types into a shared state-oriented module.
2. Define `@State()` classes for player, bank, board, end-game, and root game state with `@field(...)` metadata.
3. Re-export the public Splendor state types from `state.ts` so existing imports can be migrated incrementally.
4. Update the root facade to use `t.record(t.string(), t.state(() => SplendorPlayerState))`.

### Task 3: Move DSL methods from ops modules onto state classes

**Files:**

- Modify: `examples/splendor/src/states/player-state.ts`
- Modify: `examples/splendor/src/states/bank-state.ts`
- Modify: `examples/splendor/src/states/board-state.ts`
- Modify: `examples/splendor/src/states/game-state.ts`
- Delete: `examples/splendor/src/model/game-ops.ts`
- Delete: `examples/splendor/src/model/player-ops.ts`
- Delete: `examples/splendor/src/model/token-ops.ts`

**Steps:**

1. Move player scoring, discount, reserve, purchase, and payment logic onto `SplendorPlayerState`.
2. Move token/bank mutation helpers onto `SplendorBankState` and `SplendorPlayerState`.
3. Move board mutation helpers and turn-end/noble resolution helpers onto the root/board state classes.
4. Delete the old ops modules once no imports remain.

### Task 4: Update setup, commands, and helper code to use the new state classes

**Files:**

- Modify: `examples/splendor/src/setup.ts`
- Modify: `examples/splendor/src/game.ts`
- Modify: `examples/splendor/src/commands/*.ts`
- Modify: `examples/splendor/src/commands/shared.ts`

**Steps:**

1. Create initial state using the new state class shapes.
2. Replace `PlayerOps` construction with direct `game.getPlayer(...)` state usage.
3. Replace token helper calls with state methods.
4. Remove any remaining interface-based casts tied to the deleted ops layer.

### Task 5: Verify and clean up exports/docs

**Files:**

- Modify: `examples/splendor/src/index.ts`
- Modify: `examples/splendor/tests/game.test.ts`
- Modify: `examples/splendor/README.md` if wording now references the old split

**Steps:**

1. Run focused tests until the new state-class model passes.
2. Run full verification:
   - `bun run lint`
   - `bun test --cwd packages/tabletop-kernel`
   - `bun test --cwd examples/splendor`
   - `bun test --cwd examples/splendor-terminal`
3. Remove stale references to `PlayerOps`, `SplendorGameStateFacade`, or the old model where no longer needed.
