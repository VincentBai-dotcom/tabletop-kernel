# Replay And History Decisions

This is a living design document for the replay and history topic.

Update this file whenever a replay/history design decision is agreed during discussion so future work can rely on persisted repo context instead of session memory.

## Agreed So Far

### Replay basis

Replay should use a hybrid approach based on commands plus checkpoints or snapshots.

Current high-level direction:

- commands or external inputs remain part of the replay story
- checkpoints or snapshots should also be available so replay does not have to start from the absolute beginning every time
- replay should not depend solely on a pure command log or solely on committed events

Implication:

- replay can stay deterministic while still being practical for longer-running games and tooling
- snapshots and command history complement each other rather than competing as exclusive sources

Rationale:

- full command-only replay can become slow or unwieldy for long histories
- checkpointed replay is more practical for debugging, tooling, and resuming from intermediate points
- this hybrid direction fits the earlier decisions around full snapshots and deterministic execution

## Current discussion

We are discussing the near-term design goals in strict order.

Current topic:

8. replay/history model
