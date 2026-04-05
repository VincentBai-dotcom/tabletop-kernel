# Chained Command Authoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current one-shot command factory authoring API with the chained builder API described in `docs/design/2026-04-05-chained-command-authoring-design.md`, while preserving runtime command shape and current type inference quality.

**Architecture:** Keep the runtime command contract unchanged and confine the redesign to the authoring/type layer. Introduce a typed staged builder in `packages/tabletop-engine`, then migrate the Splendor example commands to prove the new consumer experience and verify that executor, protocol, and AsyncAPI behavior remain unchanged.

**Tech Stack:** TypeScript, Bun, TypeBox, existing `tabletop-engine` command/protocol runtime

---

### Task 1: Lock the builder surface in tests first

**Files:**

- Modify: `packages/tabletop-engine/tests/command-factory.test.ts`
- Reference: `docs/design/2026-04-05-chained-command-authoring-design.md`

**Step 1: Add or update authoring-surface tests for non-discoverable commands**

Add tests that model the desired chained builder usage:

```ts
const defineTestCommand = createCommandFactory<TestGameState>();

const command = defineTestCommand({
  commandId: "pass_turn",
  commandSchema: passTurnSchema,
})
  .validate(({ game, command }) => {
    void game;
    void command;
    return { ok: true };
  })
  .execute(({ game }) => {
    game.turns += 1;
  })
  .build();
```

Assert at compile time and runtime that:

- the built value is accepted by the engine as a command definition
- `validate` and `execute` contexts receive typed `game` and `command`
- the built command exposes `commandId`, `commandSchema`, `validate`, and `execute`
- no discovery fields are present unless discovery is configured

**Step 2: Add or update authoring-surface tests for discoverable commands**

Add tests for:

```ts
const command = defineTestCommand({
  commandId: "take_gems",
  commandSchema: commandSchema,
})
  .discoverable({
    discoverySchema,
    discover({ discovery }) {
      return {
        complete: true,
        input: {
          colors: discovery.input?.selectedColors ?? [],
        },
      };
    },
  })
  .isAvailable(({ game, runtime }) => {
    void game;
    void runtime;
    return true;
  })
  .validate(({ command }) => {
    void command.input;
    return { ok: true };
  })
  .execute(({ command }) => {
    void command.input;
  })
  .build();
```

Assert that:

- `discover` receives typed `discovery.input`
- `validate` / `execute` receive typed `command.input`
- the built command exposes `discoverySchema` and `discover`

**Step 3: Add type-level regression coverage for chain ordering**

Add test cases that intentionally exercise:

- `.validate(...).execute(...).build()`
- `.discoverable(...).validate(...).execute(...).build()`
- `.isAvailable(...).discoverable(...).validate(...).execute(...).build()`

The purpose is to lock the intended flexible ordering before implementation.

**Step 4: Run the targeted test file to confirm failures or gaps**

Run:

```bash
bun test --cwd packages/tabletop-engine command-factory.test.ts
```

Expected:

- new tests fail or type checks fail because the current one-shot API does not support the chained authoring flow yet

**Step 5: Commit**

```bash
git add packages/tabletop-engine/tests/command-factory.test.ts
git commit -m "test: lock chained command authoring api"
```

### Task 2: Introduce staged builder types in the engine

**Files:**

- Modify: `packages/tabletop-engine/src/command-factory.ts`
- Modify: `packages/tabletop-engine/src/types/command.ts`
- Modify: `packages/tabletop-engine/src/index.ts`
- Reference: `docs/design/2026-04-05-chained-command-authoring-design.md`

**Step 1: Replace the current overloaded one-shot factory typing with builder types**

In `packages/tabletop-engine/src/types/command.ts`, add the staged builder types needed for:

- base builder after `defineCommand({ commandId, commandSchema })`
- optional `.discoverable(...)`
- optional `.isAvailable(...)`
- required `.validate(...)`
- required `.execute(...)`
- final `.build()`

Keep the final built value aligned with the existing runtime command shape:

- `commandId`
- `commandSchema`
- optional `discoverySchema`
- optional `discover`
- optional `isAvailable`
- required `validate`
- required `execute`

Do not redesign the runtime contract here.

**Step 2: Implement the builder in `command-factory.ts`**

Refactor `createCommandFactory(...)` so:

- the first call still binds `FacadeGameState`
- `defineCommand({ commandId, commandSchema })` returns a chainable builder
- `.discoverable(...)` is the only way to add discovery support
- `.build()` applies the existing command brand and returns `DefinedCommand`

Keep the internal implementation small and data-oriented. Prefer assembling a mutable internal accumulator object closed over by the builder methods rather than inventing an elaborate runtime class hierarchy.

**Step 3: Preserve current inference quality**

Ensure the builder carries forward:

- `FacadeGameState`
- `TCommandInput` from `commandSchema["static"]`
- `TDiscoveryInput` from `discoverySchema["static"]`

The resulting command lifecycle contexts must remain engine-supplied and inferred automatically.

**Step 4: Export any new public builder types intentionally**

If the new builder types need to appear in the public API, export them from:

- `packages/tabletop-engine/src/index.ts`

If they are only internal implementation details, keep them internal.

**Step 5: Run targeted type and unit verification**

Run:

```bash
bunx tsc -b
bun test --cwd packages/tabletop-engine command-factory.test.ts
```

Expected:

- typecheck passes
- command-factory tests pass with the new chained API

**Step 6: Commit**

```bash
git add packages/tabletop-engine/src/types/command.ts packages/tabletop-engine/src/command-factory.ts packages/tabletop-engine/src/index.ts packages/tabletop-engine/tests/command-factory.test.ts
git commit -m "refactor: add chained command authoring builder"
```

### Task 3: Remove the old one-shot consumer API and migrate engine-facing tests

**Files:**

- Search/modify: `packages/tabletop-engine/tests/**/*.ts`
- Search/modify: `packages/tabletop-engine/src/**/*.ts`
- Reference: `packages/tabletop-engine/src/command-factory.ts`

**Step 1: Find all direct uses of the current one-shot command factory**

Search for:

```bash
rg "createCommandFactory|define.*Command\\(" packages/tabletop-engine
```

Identify:

- tests still authoring commands with the current one-shot object literal
- any internal helpers or docs depending on that old form

**Step 2: Migrate engine package tests to the chained builder**

Update any engine package tests so they use:

- base `defineCommand({ commandId, commandSchema })`
- optional `.discoverable(...)`
- `.build()` finalization

Do not leave parallel examples of the removed API behind.

**Step 3: Remove old one-shot builder signatures**

Delete the old public typing path that accepts the full final command object in the initial `defineCommand(...)` call.

This is intentionally non-backward-compatible.

**Step 4: Run engine package verification**

Run:

```bash
bunx tsc -b
bun test --cwd packages/tabletop-engine
```

Expected:

- engine package compiles
- engine package tests pass

**Step 5: Commit**

```bash
git add packages/tabletop-engine/src packages/tabletop-engine/tests
git commit -m "refactor: remove one-shot command factory api"
```

### Task 4: Migrate Splendor command authoring to the chained builder

**Files:**

- Modify: `examples/splendor/src/commands/*.ts`
- Modify: `examples/splendor/src/commands/shared.ts`
- Modify: `examples/splendor/src/commands/index.ts`
- Reference: `examples/splendor/src/game.ts`

**Step 1: Migrate one Splendor command completely first**

Pick one command, preferably:

- `examples/splendor/src/commands/take-three-distinct-gems.ts`

Rewrite it to:

- start from `defineSplendorCommand({ commandId, commandSchema })`
- use `.discoverable(...)` only when needed
- add `.isAvailable(...)`, `.validate(...)`, `.execute(...)`
- end with `.build()`

Use that one command to shake out any remaining builder typing problems before migrating the rest.

**Step 2: Migrate the rest of the Splendor commands**

Apply the same pattern across:

- buy commands
- reserve commands
- gem-taking commands

Remove any command-authoring helper types or patterns that only existed for the old one-shot form.

**Step 3: Clean up shared command authoring helpers**

Review `examples/splendor/src/commands/shared.ts` and delete any leftovers that were only supporting the old API shape.

Keep only helpers that are still genuinely used by the migrated command implementations.

**Step 4: Run Splendor-focused verification**

Run:

```bash
bunx tsc -b
bun test --cwd examples/splendor
```

Expected:

- examples compile
- Splendor tests pass

**Step 5: Commit**

```bash
git add examples/splendor/src/commands examples/splendor/src/game.ts
git commit -m "refactor: migrate splendor commands to chained builder"
```

### Task 5: Verify terminal client and protocol surfaces still work

**Files:**

- Modify if needed: `examples/splendor-terminal/src/**/*.ts`
- Modify if needed: `packages/tabletop-engine/src/protocol/**/*.ts`
- Modify if needed: `packages/tabletop-engine/tests/**/*.ts`
- Modify if needed: `examples/splendor/asyncapi.json`

**Step 1: Run protocol and client verification without changing code first**

Run:

```bash
bun test --cwd examples/splendor-terminal
bun test --cwd packages/tabletop-engine
bunx tsc -b
```

Expected:

- terminal client tests still pass
- protocol tests still pass
- no compile regressions outside direct command authoring

**Step 2: Fix any fallout caused by the authoring-layer migration**

If any protocol or client test breaks, keep fixes minimal and authoring-layer-focused.

Do not redesign runtime protocol behavior here. The chained builder is intended to keep the built command object contract unchanged.

**Step 3: Regenerate or verify AsyncAPI output if necessary**

If the repo still keeps a checked-in generated Splendor AsyncAPI artifact, regenerate it only if the existing command-authoring migration affects generated output or tests assert the artifact directly.

**Step 4: Run full verification**

Run:

```bash
bun run lint
bunx tsc -b
bun test --cwd packages/tabletop-engine
bun test --cwd examples/splendor
bun test --cwd examples/splendor-terminal
```

Expected:

- all commands pass
- no regressions in engine, example game, or terminal client

**Step 5: Live verification in terminal client**

Run the local terminal flow and play two user turns, for example:

1. `Take gems white, blue, green`
2. `Reserve L1 #9 Blue 0pt`

Confirm:

- discovery still works
- command execution still works
- bot turns still progress
- the game remains playable end to end

**Step 6: Commit**

```bash
git add packages/tabletop-engine examples/splendor examples/splendor-terminal
git commit -m "test: verify chained command authoring end to end"
```

### Task 6: Update docs to reflect the new command authoring API

**Files:**

- Modify: `docs/design/2026-03-31-command-factory-migration-design.md`
- Modify: `docs/design/2026-04-05-chained-command-authoring-design.md`
- Search/modify: `README.md`
- Search/modify: `packages/tabletop-engine/README.md`
- Search/modify: `examples/splendor/**/*.md`

**Step 1: Search for stale examples of the removed one-shot API**

Run:

```bash
rg "commandSchema:|discoverable\\(|createCommandFactory|define.*Command\\({" docs README.md packages/tabletop-engine examples/splendor
```

Identify doc snippets that still present the removed one-shot API as current.

**Step 2: Update docs to match the chained builder**

Revise consumer-facing examples so they show:

- `defineCommand({ commandId, commandSchema })`
- chained optional steps
- `.build()`

Do not leave old and new command-authoring styles side by side unless the text explicitly says the old one was replaced.

**Step 3: Run formatting/lint verification**

Run:

```bash
bun run lint
```

Expected:

- docs and markdown formatting stay clean

**Step 4: Commit**

```bash
git add docs README.md packages/tabletop-engine/README.md examples/splendor
git commit -m "docs: update command authoring examples to chained builder"
```
