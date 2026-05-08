# Schema TypeBox Extension Model Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `tabletop-engine` serializable schema fields real TypeBox schemas extended with engine metadata.

**Architecture:** Replace the current hidden `.schema` wrapper model with an extension model where `t.number()`, `t.object(...)`, and other serializable fields return TypeBox schema objects decorated with engine metadata. Keep `t.state(...)` engine-only and continue rejecting state fields from transport schemas.

**Tech Stack:** TypeScript, Bun test, TypeBox.

---

### Task 1: Add Runtime-Shape Tests

**Files:**

- Modify: `packages/tabletop-engine/tests/schema.test.ts`

**Step 1: Write failing tests**

Add tests that prove serializable fields are real TypeBox schemas and do not expose the hidden wrapper `.schema` property:

```ts
test("serializable fields are TypeBox schemas with engine metadata", () => {
  const numberField = t.number();
  const objectField = t.object({
    count: numberField,
  });

  expect(numberField).toMatchObject({
    type: "number",
    kind: "number",
  });
  expect("schema" in numberField).toBe(false);

  expect(objectField).toMatchObject({
    type: "object",
    kind: "object",
    properties: {
      count: numberField,
    },
  });
  expect(objectField.properties.count).toBe(numberField);
  expect("schema" in objectField).toBe(false);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
bun test --cwd packages/tabletop-engine tests/schema.test.ts
```

Expected: FAIL because current fields are wrappers and still have hidden `.schema`.

**Step 3: Commit**

Commit the failing test only:

```bash
git add packages/tabletop-engine/tests/schema.test.ts
git commit -m "test: capture schema field runtime shape"
```

### Task 2: Convert Field Types

**Files:**

- Modify: `packages/tabletop-engine/src/schema/types.ts`

**Step 1: Update type definitions**

Remove `readonly schema?: ...` from serializable field types. Keep TypeBox intersections and engine metadata:

```ts
export type NumberFieldType = TNumber & {
  kind: "number";
};
```

Update `ExtractSchema<TField>` so serializable fields are treated as schemas directly. Keep `NestedStateFieldType` excluded from `SerializableFieldType`.

**Step 2: Run typecheck**

Run:

```bash
bunx tsc -b --pretty false
```

Expected: FAIL until constructors are updated.

### Task 3: Rewrite Schema Constructors

**Files:**

- Modify: `packages/tabletop-engine/src/schema/index.ts`

**Step 1: Replace wrapper construction**

Remove `withSchema(...)`. Use `Object.assign(Type.*(...), metadata)` for all serializable fields.

**Step 2: Simplify TypeBox conversion**

Make `toTypeBoxSchema(field)` return `field` for non-state fields and `Type.Unknown()` for `state`.

**Step 3: Update record key handling**

Return primitive key schemas directly, falling back to `Type.String()` only where necessary.

**Step 4: Run focused tests**

Run:

```bash
bun test --cwd packages/tabletop-engine tests/schema.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/tabletop-engine/src/schema/types.ts packages/tabletop-engine/src/schema/index.ts packages/tabletop-engine/tests/schema.test.ts
git commit -m "refactor: make schema fields extend TypeBox schemas"
```

### Task 4: Full Verification

**Files:**

- No code changes expected.

**Step 1: Run package verification**

```bash
bunx tsc -b --pretty false
bun test --cwd packages/tabletop-engine
bun test --cwd examples/splendor/engine
```

**Step 2: Fix only issues caused by the migration**

If failures appear, make the minimal schema-type-system fix and rerun the failing command.

**Step 3: Commit verification fixes if needed**

```bash
git add <changed files>
git commit -m "fix: update schema extension migration fallout"
```
