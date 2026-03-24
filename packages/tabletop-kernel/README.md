# tabletop-kernel

Reusable runtime kernel package for tabletop and board-game rules engines.

## Current scope

This package currently provides a runtime skeleton with:

- canonical `{ game, runtime }` state types
- command definitions with `validate` and `execute`
- transactional command execution
- nested progression definitions with kernel-managed lifecycle resolution
- semantic event collection
- deterministic RNG primitives
- snapshot and replay helpers
- a small scenario-style test harness

## Intentional deferrals

The current package does **not** yet implement:

- a first-class visibility / hidden-information subsystem
- a first-class public internal-step abstraction
- rich trigger resolution beyond the current skeleton
- richer stack / queue resolution models

## Scripts

```bash
bun run test
bun run typecheck
```
