# Visibility Model Decisions

This is a living design document for the visibility and hidden-information topic.

Update this file whenever a visibility-model design decision is agreed during discussion so future work can rely on persisted repo context instead of session memory.

## Agreed So Far

### Hidden-information model

Hidden information should be modeled primarily as viewer-specific filtered projections of one canonical state.

Current high-level direction:

- the game has one authoritative canonical state
- viewer-specific or actor-specific views are derived projections of that state
- the kernel should provide the mechanism for visibility filtering, while the consumer defines the actual visibility policy for a game

Implication:

- hidden information does not require separate per-player state stores as the primary model
- replay, determinism, and save/load stay aligned with the earlier single-canonical-state decision
- different viewers may legitimately receive different filtered projections of the same underlying state

Rationale:

- keeps one source of truth
- avoids consistency problems across multiple parallel player-specific stores
- matches the earlier command-discovery decision that discovery may vary by viewer without changing canonical truth

## Current discussion

We are discussing the near-term design goals in strict order.

Current topic:

5. visibility / hidden-information model
