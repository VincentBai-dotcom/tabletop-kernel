# Explicit Step Discovery Authoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current `discoverable((flow) => ...)` discovery authoring API with explicit built step objects, require one `.initial()` step, and remove all implicit order-based start-step and next-step behavior.

**Architecture:** Keep the discovery runtime request/result transport shape intact, but change how discovery definitions are authored and compiled. The command builder should accept variadic built step definitions, the engine should derive `startStep` from the one step marked initial, and runtime/protocol generation should stop relying on declaration-order fallback next-step logic.

**Tech Stack:** TypeScript, Bun tests, tabletop-engine command builder/runtime/protocol, tabletop-cli SDK generation, Splendor example game, Splendor terminal client.

---

### Task 1: Lock The New Authoring Contract With Failing Tests

**Files:**

- Modify: `packages/tabletop-engine/tests/command-factory.test.ts`
- Modify: `packages/tabletop-engine/tests/types.test.ts`

**Step 1: Write failing runtime tests for explicit step authoring**

Add tests covering:

- `discoverable(discoveryStep("a").initial()...build())` works
- missing `.initial()` throws `command_builder_missing_initial_discovery_step`
- duplicate `.initial()` throws `command_builder_duplicate_initial_discovery_step`
- duplicate step ids still throw

Use a small fixture command similar to the existing step-authored discovery test.

**Step 2: Write failing type-level tests**

Add type assertions covering:

- `discoveryStep("x")` staged builder only exposes `.initial()` optionally plus `.input(...)`
- `.build()` is only available after `.resolve(...)`
- `discoverable(...)` accepts built step definitions directly
- `discoverable((flow) => ...)` is rejected

Keep the tests minimal and in the existing type-test style.

**Step 3: Run targeted tests to confirm failure**

Run: `bun test --cwd packages/tabletop-engine tests/command-factory.test.ts tests/types.test.ts`

Expected: FAIL because the builder still expects `flow.step(...)` and still infers start-step by order.

**Step 4: Commit**

```bash
git add packages/tabletop-engine/tests/command-factory.test.ts packages/tabletop-engine/tests/types.test.ts
git commit -m "test: lock explicit discovery step authoring"
```

### Task 2: Replace The Discovery Builder Surface

**Files:**

- Modify: `packages/tabletop-engine/src/types/command.ts`
- Modify: `packages/tabletop-engine/src/command-factory.ts`
- Modify: `packages/tabletop-engine/src/index.ts`

**Step 1: Replace flow-builder types with built-step types**

In `packages/tabletop-engine/src/types/command.ts`:

- remove `DiscoveryFlowBuilder`
- remove `DiscoverableCommandBuilderConfig`
- make `DiscoveryStepOption.nextStep` required
- remove `defaultNextStep` from `DiscoveryStepDefinition`
- add `initial: boolean` to built step metadata
- define a built-step type for `discoverable(...)` input
- introduce a staged `DiscoveryStepBuilder` that supports:
  - `.initial()`
  - `.input(...)`
  - `.output(...)`
  - `.resolve(...)`
  - `.build()`

Keep staged typing strict. Do not reintroduce flat step objects in consumer-facing authoring.

**Step 2: Add a reusable `discoveryStep(stepId)` entrypoint**

In `packages/tabletop-engine/src/command-factory.ts`:

- expose a top-level `discoveryStep(stepId)` helper from the factory module
- have it accumulate:
  - `stepId`
  - `initial`
  - `inputSchema`
  - `outputSchema`
  - `resolve`
- make `.build()` produce a concrete discovery step definition value

**Step 3: Change `discoverable(...)` to accept built steps**

Still in `packages/tabletop-engine/src/command-factory.ts`:

- replace `discoverable(configure)` with `discoverable(...steps)`
- remove flow-builder creation entirely
- compute `startStep` from the single `.initial()` step
- validate:
  - at least one step
  - unique step ids
  - exactly one initial step
  - input/output/resolve exist

**Step 4: Export the new builder surface**

In `packages/tabletop-engine/src/index.ts`:

- export `discoveryStep`
- export any new public step-definition types that consumers or generated types need

**Step 5: Run targeted tests**

Run: `bun test --cwd packages/tabletop-engine tests/command-factory.test.ts tests/types.test.ts`

Expected: PASS

**Step 6: Commit**

```bash
git add packages/tabletop-engine/src/types/command.ts packages/tabletop-engine/src/command-factory.ts packages/tabletop-engine/src/index.ts packages/tabletop-engine/tests/command-factory.test.ts packages/tabletop-engine/tests/types.test.ts
git commit -m "feat: replace discovery flow builder with step objects"
```

### Task 3: Remove Implicit Runtime And Protocol Fallbacks

**Files:**

- Modify: `packages/tabletop-engine/src/runtime/game-executor.ts`
- Modify: `packages/tabletop-engine/src/protocol/describe.ts`
- Modify: `packages/tabletop-engine/src/protocol/asyncapi.ts`
- Modify: `packages/tabletop-engine/tests/game-execution.test.ts`
- Modify: `packages/tabletop-engine/tests/protocol.test.ts`
- Modify: `packages/tabletop-engine/tests/asyncapi.test.ts`

**Step 1: Write failing tests for required explicit `nextStep`**

Add tests covering:

- runtime rejects discovery option output missing `nextStep`
- protocol no longer contains `defaultNextStep`
- descriptor still exposes `startStep` from the `.initial()` step

**Step 2: Remove order-based next-step inference in runtime**

In `packages/tabletop-engine/src/runtime/game-executor.ts`:

- stop computing `nextStep = option.nextStep ?? step.defaultNextStep`
- require `option.nextStep` to be a declared step
- keep `complete: true` behavior unchanged

**Step 3: Remove `defaultNextStep` from protocol normalization**

In `packages/tabletop-engine/src/protocol/describe.ts`:

- remove `defaultNextStep` from descriptor types
- stop validating unknown `defaultNextStep`
- keep validation for unique step ids and valid `startStep`

**Step 4: Update AsyncAPI generation**

In `packages/tabletop-engine/src/protocol/asyncapi.ts`:

- remove any dependency on `defaultNextStep`
- keep `nextStep` in result schemas because it still exists on the wire

**Step 5: Run targeted tests**

Run: `bun test --cwd packages/tabletop-engine tests/game-execution.test.ts tests/protocol.test.ts tests/asyncapi.test.ts`

Expected: PASS

**Step 6: Commit**

```bash
git add packages/tabletop-engine/src/runtime/game-executor.ts packages/tabletop-engine/src/protocol/describe.ts packages/tabletop-engine/src/protocol/asyncapi.ts packages/tabletop-engine/tests/game-execution.test.ts packages/tabletop-engine/tests/protocol.test.ts packages/tabletop-engine/tests/asyncapi.test.ts
git commit -m "refactor: remove implicit discovery step transitions"
```

### Task 4: Update CLI SDK Generation For Explicit Initial Steps

**Files:**

- Modify: `packages/cli/src/commands/generate-client-sdk.ts`
- Modify: `packages/cli/tests/generate-client-sdk.test.ts`

**Step 1: Add or update tests around generated discovery start helpers**

Extend the client SDK generation test so it asserts:

- per-command discovery aliases still exist
- generated start helpers still exist
- start helpers are derived from the `.initial()` step contract

Do not add backward-compatibility assertions for the removed `flow` API.

**Step 2: Update generation logic if needed**

Only make the minimal changes required to keep the generated SDK aligned with the new descriptor shape after `defaultNextStep` removal and explicit `.initial()` start-step derivation.

**Step 3: Run targeted tests**

Run: `bun test --cwd packages/cli tests/generate-client-sdk.test.ts`

Expected: PASS

**Step 4: Commit**

```bash
git add packages/cli/src/commands/generate-client-sdk.ts packages/cli/tests/generate-client-sdk.test.ts
git commit -m "test: keep discovery sdk generation aligned"
```

### Task 5: Migrate Splendor Commands To Explicit Built Steps

**Files:**

- Modify: `examples/splendor/engine/src/commands/buy-face-up-card.ts`
- Modify: `examples/splendor/engine/src/commands/buy-reserved-card.ts`
- Modify: `examples/splendor/engine/src/commands/choose-noble.ts`
- Modify: `examples/splendor/engine/src/commands/reserve-deck-card.ts`
- Modify: `examples/splendor/engine/src/commands/reserve-face-up-card.ts`
- Modify: `examples/splendor/engine/src/commands/take-three-distinct-gems.ts`
- Modify: `examples/splendor/engine/src/commands/take-two-same-gems.ts`
- Modify: `examples/splendor/engine/src/game.ts`
- Modify: `examples/splendor/engine/tests/game.test.ts`

**Step 1: Convert command authoring to `discoverable(stepA, stepB, ...)`**

For each discoverable command:

- import `discoveryStep` from `tabletop-engine` or the relevant shared surface
- replace `.discoverable((flow) => flow.step(...))` with built steps
- mark exactly one step `.initial()`
- ensure every non-complete returned option has explicit `nextStep`

Do not preserve any implicit next-step assumptions.

**Step 2: Update any command-local helper assumptions**

If Splendor helpers relied on declaration-order fallback behavior, update them so
the resolver explicitly sets `nextStep`.

**Step 3: Update tests**

Add or update tests to confirm:

- Splendor commands still declare discovery flows
- discovery start steps are correct
- discovery options still progress correctly

**Step 4: Regenerate client SDK**

Run: `bun run --cwd examples/splendor/engine generate:client-sdk`

**Step 5: Run targeted tests**

Run: `bun test --cwd examples/splendor/engine`

Expected: PASS

**Step 6: Commit**

```bash
git add examples/splendor/engine/src/commands examples/splendor/engine/src/game.ts examples/splendor/engine/generated/client-sdk.generated.ts examples/splendor/engine/tests/game.test.ts
git commit -m "refactor: migrate splendor to explicit discovery steps"
```

### Task 6: Keep The Terminal Example Compatible

**Files:**

- Modify: `examples/splendor/terminal/src/actions.ts`
- Modify: `examples/splendor/terminal/tests/actions.test.ts`

**Step 1: Update any terminal assumptions about discovery metadata**

Keep the terminal example consuming the generated start helpers and current discovery result shape. Only adjust code if the new exports or generated types changed.

**Step 2: Run targeted tests**

Run: `bun test --cwd examples/splendor/terminal`

Expected: PASS

**Step 3: Commit**

```bash
git add examples/splendor/terminal/src/actions.ts examples/splendor/terminal/tests/actions.test.ts
git commit -m "test: keep terminal compatible with discovery steps"
```

### Task 7: Full Verification

**Files:**

- No code changes expected

**Step 1: Run full repo verification**

Run:

```bash
bun run lint
bunx tsc -b
bun test --cwd packages/tabletop-engine
bun test --cwd packages/cli
bun test --cwd examples/splendor/engine
bun test --cwd examples/splendor/terminal
bun test --cwd examples/splendor/server
```

Expected: all PASS.

**Step 2: If verification requires generated artifacts refresh**

Re-run:

```bash
bun run --cwd examples/splendor/engine generate:client-sdk
```

Then re-run the affected tests only.

**Step 3: Report any design-vs-implementation gaps**

Before finishing, explicitly note whether any technical constraint forced a deviation from:

- explicit built steps
- required `.initial()`
- resolver-owned required `nextStep`
- removal of `flow.step(...)`
- removal of order-based fallback behavior
