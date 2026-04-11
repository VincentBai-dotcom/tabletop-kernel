# CLI Package Scaffold Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Scaffold `packages/cli` as a Bun workspace package with a minimal `tabletop-cli --help` entrypoint and no artifact-generation commands yet.

**Architecture:** Create a standalone workspace package that depends on `tabletop-engine`, exposes a small internal CLI entrypoint, and starts with one tested behavior: printing help text. Keep the package structure aligned with the CLI design doc so later commands can land without reshaping the package.

**Tech Stack:** Bun workspaces, TypeScript, Bun test, plain internal CLI routing

---

### Task 1: Scaffold the package

**Files:**

- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/cli/src/main.ts`

**Step 1: Scaffold the package with Bun**

Run: `mkdir -p packages/cli && cd packages/cli && bun init -y`
Expected: Bun creates a minimal package scaffold.

**Step 2: Adjust the scaffold to match repo conventions**

Expected changes:

- package name should align with the CLI command direction
- package should be ESM and workspace-friendly
- package should depend on `tabletop-engine`
- package should expose a `tabletop-cli` bin entry

**Step 3: Commit scaffold-only package files**

```bash
git add packages/cli/package.json packages/cli/tsconfig.json
git commit -m "build: scaffold cli workspace package"
```

### Task 2: Add a tested help entrypoint

**Files:**

- Modify: `packages/cli/src/main.ts`
- Create: `packages/cli/tests/main.test.ts`

**Step 1: Write the failing test**

Test behavior:

- `run(["--help"])` returns exit code `0`
- output includes `tabletop-cli`
- output includes the top-level commands `generate` and `validate`

**Step 2: Run test to verify it fails**

Run: `bun test --cwd packages/cli`
Expected: FAIL because the CLI entrypoint is not implemented yet.

**Step 3: Write the minimal implementation**

Implementation shape:

- export `run(argv: string[])`
- support `--help` and empty args
- print a static help string for now

**Step 4: Run test to verify it passes**

Run: `bun test --cwd packages/cli`
Expected: PASS

**Step 5: Commit help entrypoint**

```bash
git add packages/cli/src/main.ts packages/cli/tests/main.test.ts
git commit -m "feat: add cli help entrypoint"
```

### Task 3: Verify workspace integration

**Files:**

- Modify if needed: `package.json`

**Step 1: Run package and workspace verification**

Run:

- `bun test --cwd packages/cli`
- `bunx tsc -b`

Expected:

- CLI package tests pass
- workspace typecheck passes

**Step 2: Add any small workspace script needed**

Only if useful and minimal.

**Step 3: Commit integration cleanup**

```bash
git add package.json packages/cli
git commit -m "build: wire cli package into workspace"
```
