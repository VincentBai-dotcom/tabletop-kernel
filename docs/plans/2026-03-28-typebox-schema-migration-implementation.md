# TypeBox Schema Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the kernel's growing `t` runtime type system onto TypeBox under the hood while keeping `t` as the stable public API for state fields, command payloads, and custom views.

**Architecture:** First extract `t` into a dedicated schema module without changing behavior. Then add TypeBox as the underlying representation, migrate the existing supported `t` builders to use it, and finally add the first new shared schema shapes needed by the protocol-schema design (`t.object(...)` and `t.optional(...)`). Keep `t.state(...)` as the kernel-specific extension and leave protocol-generation enforcement for a later iteration.

**Tech Stack:** TypeScript, Bun, TypeBox, existing `@State()` / `@field(t...)` metadata system, Bun tests

---

### Task 1: Lock current `t` behavior with focused tests

**Files:**

- Modify: `packages/tabletop-kernel/tests/state-facade.test.ts`
- Create: `packages/tabletop-kernel/tests/schema.test.ts`

**Step 1: Write the failing tests**

Add tests that assert:

- the current `t` builders still expose the supported schema kinds:
  - `t.number()`
  - `t.string()`
  - `t.boolean()`
  - `t.array(...)`
  - `t.record(...)`
  - `t.state(...)`
- state-facade metadata can consume `t` after extraction into a dedicated schema module
- the first new shared schema builders exist:
  - `t.object(...)`
  - `t.optional(...)`

Use one focused new test file for schema API expectations and keep any state-facade integration checks in existing state-facade tests.

**Step 2: Run tests to verify they fail**

Run:

```bash
bun test --cwd packages/tabletop-kernel tests/schema.test.ts
bun test --cwd packages/tabletop-kernel tests/state-facade.test.ts
```

Expected:

- `schema.test.ts` fails because `t.object(...)` and `t.optional(...)` do not exist yet
- existing integration behavior still passes where unchanged

**Step 3: Commit**

```bash
git add packages/tabletop-kernel/tests/schema.test.ts packages/tabletop-kernel/tests/state-facade.test.ts
git commit -m "test: add schema api coverage"
```

### Task 2: Extract `t` into a dedicated schema module

**Files:**

- Create: `packages/tabletop-kernel/src/schema/types.ts`
- Create: `packages/tabletop-kernel/src/schema/index.ts`
- Modify: `packages/tabletop-kernel/src/state-facade/metadata.ts`
- Modify: `packages/tabletop-kernel/src/index.ts`
- Test: `packages/tabletop-kernel/tests/state-facade.test.ts`

**Step 1: Move schema types and builders out of `state-facade/metadata.ts`**

Create a dedicated schema area under `src/schema` and move the existing:

- field-type interfaces
- `FieldType`
- `StateFieldMetadata` alias if still appropriate
- `t` builder object

Leave `state-facade/metadata.ts` responsible only for:

- decorators
- state metadata storage
- state metadata lookup

**Step 2: Keep behavior unchanged**

Do not introduce TypeBox yet.

The code should still behave exactly as before, just from a new module location.

**Step 3: Run focused tests**

Run:

```bash
bun test --cwd packages/tabletop-kernel tests/state-facade.test.ts
bun test --cwd packages/tabletop-kernel tests/game-definition.test.ts
```

Expected: all pass.

**Step 4: Commit**

```bash
git add packages/tabletop-kernel/src/schema/types.ts packages/tabletop-kernel/src/schema/index.ts packages/tabletop-kernel/src/state-facade/metadata.ts packages/tabletop-kernel/src/index.ts packages/tabletop-kernel/tests/state-facade.test.ts packages/tabletop-kernel/tests/game-definition.test.ts
git commit -m "refactor: extract schema module"
```

### Task 3: Add TypeBox as the underlying schema dependency

**Files:**

- Modify: `package.json`
- Modify: lockfile / install artifacts as needed
- Test: `packages/tabletop-kernel/tests/schema.test.ts`

**Step 1: Add the dependency**

Add TypeBox to the workspace dependency set in the appropriate package scope for `tabletop-kernel`.

Do not change public kernel API yet.

**Step 2: Verify install and baseline typecheck**

Run:

```bash
bun install
bunx tsc -b
```

Expected: install succeeds and typecheck remains green before the internal migration work.

**Step 3: Commit**

```bash
git add package.json bun.lock*
git commit -m "build: add typebox dependency"
```

### Task 4: Rebase existing supported `t` builders onto TypeBox

**Files:**

- Modify: `packages/tabletop-kernel/src/schema/types.ts`
- Modify: `packages/tabletop-kernel/src/schema/index.ts`
- Modify: any consumers that rely on old hand-rolled schema shapes
- Test: `packages/tabletop-kernel/tests/schema.test.ts`
- Test: `packages/tabletop-kernel/tests/state-facade.test.ts`
- Test: `packages/tabletop-kernel/tests/game-definition.test.ts`

**Step 1: Write the failing migration test**

Add assertions that the schema module now exposes TypeBox-backed schemas for:

- `t.number()`
- `t.string()`
- `t.boolean()`
- `t.array(...)`
- `t.record(...)`

Keep `t.state(...)` as a kernel-specific wrapper that is not forwarded directly to TypeBox.

**Step 2: Implement the migration**

Rework the schema internals so:

- ordinary serializable schemas are backed by TypeBox
- `t.state(...)` remains a custom schema kind for state-authoring
- existing state-facade compile/hydration code keeps working

Keep the public `t` API stable.

**Step 3: Run tests**

Run:

```bash
bun test --cwd packages/tabletop-kernel tests/schema.test.ts
bun test --cwd packages/tabletop-kernel tests/state-facade.test.ts
bun test --cwd packages/tabletop-kernel tests/game-definition.test.ts
bunx tsc -b
```

Expected: all pass.

**Step 4: Commit**

```bash
git add packages/tabletop-kernel/src/schema/types.ts packages/tabletop-kernel/src/schema/index.ts packages/tabletop-kernel/src/state-facade/*.ts packages/tabletop-kernel/tests/schema.test.ts packages/tabletop-kernel/tests/state-facade.test.ts packages/tabletop-kernel/tests/game-definition.test.ts
git commit -m "refactor: back schema api with typebox"
```

### Task 5: Add `t.object(...)` and `t.optional(...)`

**Files:**

- Modify: `packages/tabletop-kernel/src/schema/index.ts`
- Modify: `packages/tabletop-kernel/src/schema/types.ts`
- Test: `packages/tabletop-kernel/tests/schema.test.ts`
- Test: `packages/tabletop-kernel/tests/state-facade.test.ts`

**Step 1: Write the failing tests**

Add tests for:

- `t.object({ count: t.number() })`
- `t.optional(t.number())`
- using `t.object(...)` inside `@field(...)` metadata

Do not implement protocol generation yet. This step is only about schema construction support.

**Step 2: Implement the minimal builders**

Expose `t.object(...)` and `t.optional(...)` through the kernel-facing `t` API.

Keep them consistent across:

- state fields
- future command payloads
- future custom view schemas

**Step 3: Run tests**

Run:

```bash
bun test --cwd packages/tabletop-kernel tests/schema.test.ts
bun test --cwd packages/tabletop-kernel tests/state-facade.test.ts
bunx tsc -b
```

Expected: all pass.

**Step 4: Commit**

```bash
git add packages/tabletop-kernel/src/schema/index.ts packages/tabletop-kernel/src/schema/types.ts packages/tabletop-kernel/tests/schema.test.ts packages/tabletop-kernel/tests/state-facade.test.ts
git commit -m "feat: add object and optional schemas"
```

### Task 6: Full verification pass

**Files:**

- No code changes expected unless verification finds issues

**Step 1: Run the full verification suite**

Run:

```bash
bunx tsc -b
bun run lint
bun test --cwd packages/tabletop-kernel
bun test --cwd examples/splendor
bun test --cwd examples/splendor-terminal
```

Expected: all pass.

**Step 2: Commit follow-up fixes if needed**

If verification requires cleanup, make one small fix-only commit.

**Step 3: Stop**

Do not start payload-schema or custom-view-schema APIs in the same batch unless
the verification pass is clean and the next task is explicitly requested.
