# RNG Model Decisions

This is a living design document for the deterministic RNG topic.

Update this file whenever an RNG-model design decision is agreed during discussion so future work can rely on persisted repo context instead of session memory.

## Agreed So Far

### RNG ownership

Randomness should be treated as a kernel-owned deterministic service rather than left entirely to consumer-managed ambient randomness.

Current high-level direction:

- the kernel should provide the main RNG mechanism used by deterministic game logic
- consumer game rules should use kernel RNG rather than arbitrary ambient random libraries when they want replay-safe behavior
- RNG state should be part of the engine's deterministic and serializable runtime story

Implication:

- deterministic replay, simulations, and tests can rely on persisted RNG state rather than hidden library internals
- randomness remains available to consumers, but through a kernel-controlled service rather than unconstrained ambient APIs

Rationale:

- randomness affects replay, serialization, auditability, and cross-host consistency
- kernel-owned RNG fits the repo goal of deterministic simulation and reusable runtime infrastructure
- leaving randomness fully outside the kernel would weaken key guarantees this runtime is supposed to provide

## Current discussion

We are discussing the near-term design goals in strict order.

Current topic:

6. deterministic RNG service
