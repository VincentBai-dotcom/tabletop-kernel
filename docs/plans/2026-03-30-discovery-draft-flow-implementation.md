# Discovery Draft Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `partialCommand` discovery with a draft-based step flow that separates in-progress discovery state from final executable command payload.

**Architecture:** Discovery becomes its own request/result surface: `DiscoveryInput<TDraft>` goes into `discover()`, and `CommandDiscoveryResult<TDraft, TPayload>` returns either the next step options or a completed final payload. Final execution input remains `CommandInput<TPayload>`.

**Tech Stack:** TypeScript, Bun, TypeBox-backed schema helpers, tabletop-engine runtime, Splendor example, splendor-terminal client.

---

### Task 1: Add failing engine type tests for discovery draft flow

**Files:**

- Modify: `packages/tabletop-engine/tests/types.test.ts`
- Test: `packages/tabletop-engine/tests/types.test.ts`

**Step 1: Write failing tests**

Add coverage for:

- `DiscoveryInput`
- `DiscoveryContext` using `discoveryInput.draft`
- `CommandDiscoveryResult` incomplete variant using `nextDraft`
- `CommandDiscoveryResult` complete variant using `payload`
- `CommandDefinition<GameState, Payload, Draft>`

**Step 2: Run targeted test/typecheck to verify failure**

Run:

```bash
bunx tsc -b
bun test --cwd packages/tabletop-engine tests/types.test.ts
```

Expected:

- type errors or failing tests referencing missing discovery draft types

**Step 3: Implement minimal type changes**

Modify:

- `packages/tabletop-engine/src/types/command.ts`

Add:

- `DiscoveryInput`
- discovery draft generic on contexts/definitions
- new `CommandDiscoveryResult` union

Keep:

- `validate()` and `execute()` on final `CommandInput<TPayload>`

**Step 4: Re-run targeted verification**

Run:

```bash
bunx tsc -b
bun test --cwd packages/tabletop-engine tests/types.test.ts
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add packages/tabletop-engine/src/types/command.ts packages/tabletop-engine/tests/types.test.ts
git commit -m "refactor: model discovery as draft flow"
```

### Task 2: Add failing executor tests for draft-based discovery

**Files:**

- Modify: `packages/tabletop-engine/tests/kernel-execution.test.ts`
- Test: `packages/tabletop-engine/tests/kernel-execution.test.ts`

**Step 1: Write failing tests**

Add or update tests to verify:

- `discoverCommand(state, discoveryInput)` reads `discoveryInput.draft`
- incomplete discovery returns `nextDraft`
- complete discovery returns final `payload`

**Step 2: Run targeted tests to verify failure**

Run:

```bash
bun test --cwd packages/tabletop-engine tests/kernel-execution.test.ts
```

Expected:

- FAIL around old `partialCommand` assumptions

**Step 3: Implement runtime wiring**

Modify:

- `packages/tabletop-engine/src/runtime/contexts.ts`
- `packages/tabletop-engine/src/runtime/game-executor.ts`

Replace:

- `partialCommand`

With:

- `discoveryInput`

Update executor signature to:

- accept `DiscoveryInput`
- return the new discovery union untouched

**Step 4: Re-run targeted tests**

Run:

```bash
bun test --cwd packages/tabletop-engine tests/kernel-execution.test.ts
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add packages/tabletop-engine/src/runtime/contexts.ts packages/tabletop-engine/src/runtime/game-executor.ts packages/tabletop-engine/tests/kernel-execution.test.ts
git commit -m "refactor: wire discovery draft flow through executor"
```

### Task 3: Update protocol and public exports

**Files:**

- Modify: `packages/tabletop-engine/src/index.ts`
- Modify: `packages/tabletop-engine/src/protocol/describe.ts`
- Modify: `packages/tabletop-engine/src/protocol/asyncapi.ts`
- Test: `packages/tabletop-engine/tests/protocol.test.ts`
- Test: `packages/tabletop-engine/tests/asyncapi.test.ts`

**Step 1: Write failing tests**

Cover:

- protocol descriptor still compiles command payload schemas
- AsyncAPI generation still works for final command submission

Discovery-specific AsyncAPI generation can remain deferred for now.

**Step 2: Run targeted tests to verify failure**

Run:

```bash
bun test --cwd packages/tabletop-engine tests/protocol.test.ts
bun test --cwd packages/tabletop-engine tests/asyncapi.test.ts
```

Expected:

- FAIL if imports or command generic assumptions are stale

**Step 3: Apply minimal updates**

Keep final command payload generation intact.

Adjust public exports/types so consumers can import:

- `DiscoveryInput`
- updated `CommandDiscoveryResult`

**Step 4: Re-run targeted tests**

Run:

```bash
bun test --cwd packages/tabletop-engine tests/protocol.test.ts
bun test --cwd packages/tabletop-engine tests/asyncapi.test.ts
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add packages/tabletop-engine/src/index.ts packages/tabletop-engine/src/protocol/describe.ts packages/tabletop-engine/src/protocol/asyncapi.ts packages/tabletop-engine/tests/protocol.test.ts packages/tabletop-engine/tests/asyncapi.test.ts
git commit -m "refactor: preserve protocol output with discovery drafts"
```

### Task 4: Migrate Splendor command discovery to draft input

**Files:**

- Modify: `examples/splendor/src/commands/shared.ts`
- Modify: `examples/splendor/src/commands/*.ts`
- Modify: `examples/splendor/src/discovery.ts`
- Test: `examples/splendor/tests/game.test.ts`

**Step 1: Write failing tests**

Update or add tests that verify:

- discovery starts from empty draft
- follow-up discovery advances with `draft`
- complete discovery returns final payload

**Step 2: Run Splendor tests to verify failure**

Run:

```bash
bun test --cwd examples/splendor
```

Expected:

- FAIL on old `partialCommand` behavior

**Step 3: Implement minimal migration**

Use:

- `discoveryInput.draft`

Instead of:

- `partialCommand.payload`

Update helper types and discovery builders so:

- options return `nextDraft`
- final complete result returns `payload`

Keep command validation and execution unchanged.

**Step 4: Re-run Splendor tests**

Run:

```bash
bun test --cwd examples/splendor
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add examples/splendor/src/commands/shared.ts examples/splendor/src/commands examples/splendor/src/discovery.ts examples/splendor/tests/game.test.ts
git commit -m "refactor: migrate splendor discovery to drafts"
```

### Task 5: Migrate splendor-terminal to draft-based discovery

**Files:**

- Modify: `examples/splendor-terminal/src/actions.ts`
- Modify: `examples/splendor-terminal/src/session.ts`
- Modify: `examples/splendor-terminal/src/types.ts`
- Test: `examples/splendor-terminal/tests/actions.test.ts`

**Step 1: Write failing tests**

Cover:

- `buildCommandFromDiscovery()` accumulates `draft`
- final returned command is only built when discovery completes with `payload`

**Step 2: Run terminal tests to verify failure**

Run:

```bash
bun test --cwd examples/splendor-terminal
```

Expected:

- FAIL on old partial command flow

**Step 3: Implement minimal migration**

Session:

- `discoverCommand(discoveryInput)`

Terminal action builder:

- keep a discovery input with `draft`
- convert complete discovery payload to final command

**Step 4: Re-run terminal tests**

Run:

```bash
bun test --cwd examples/splendor-terminal
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add examples/splendor-terminal/src/actions.ts examples/splendor-terminal/src/session.ts examples/splendor-terminal/src/types.ts examples/splendor-terminal/tests/actions.test.ts
git commit -m "refactor: use discovery drafts in terminal client"
```

### Task 6: Full verification and live terminal play

**Files:**

- No new code expected

**Step 1: Run full verification**

Run:

```bash
bun run lint
bunx tsc -b
bun test --cwd packages/tabletop-engine
bun test --cwd examples/splendor
bun test --cwd examples/splendor-terminal
```

Expected:

- all PASS

**Step 2: Verify in the live terminal client**

Run:

```bash
bun run --cwd examples/splendor-terminal start
```

Play two full table rounds and confirm:

- human discovery flow still works
- bot reveal loop still works
- final command execution still works

**Step 3: Commit verification-only follow-up if needed**

```bash
git add ...
git commit -m "test: verify discovery draft flow end to end"
```
