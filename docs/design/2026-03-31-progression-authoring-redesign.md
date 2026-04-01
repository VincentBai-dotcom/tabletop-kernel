# Progression Authoring Redesign

## Status

Accepted as the target direction for the next progression authoring redesign.

This document does not implement the redesign. It records the intended
authoring model so later work can migrate the current progression API toward it.

## Problem

The current progression authoring model is structurally correct, but the
consumer experience is too cumbersome.

Current pain points:

- nested segment trees are verbose to author and hard to scan
- the authoring shape gets messy as the game flow becomes more complex
- progression hooks currently receive raw `commandInput`, which encourages
  command-specific branching and unsafe payload casts in progression code
- simple fixed turn structures and complex asymmetric flows are forced into the
  same low-level authoring shape

This is acceptable for the first implementation, but it is not the desired
long-term API.

## Design Goal

Redesign progression authoring as a hybrid model:

- declarative first for fixed progression structures
- imperative escape hatch later for games whose progression varies heavily by
  character, faction, scenario, or dynamic rule state

Implementation priority:

1. ship the declarative-first model
2. add the imperative escape hatch later

## Primary Direction

The engine should provide a higher-level declarative progression authoring
surface for the common case.

This declarative model should make simple games easy to express:

- fixed turn loops
- rounds made of repeated turns
- stable phase order
- predictable ownership transfer
- segment-local lifecycle hooks where needed

The declarative model should remain inspectable by the engine so it can support:

- runtime normalization
- deterministic execution
- protocol and tooling support
- future debugging and visualization

## Future Escape Hatch

The engine should later support a more imperative progression mode for games
where the flow genuinely cannot be expressed cleanly as a stable declarative
structure.

Examples:

- asymmetric characters with different turn structures
- dynamic action trees whose available steps depend on prior choices
- scenario-specific or expansion-specific progression rewrites
- games with highly stateful interrupts or branching control transfer

This imperative mode should be added later, not used to shape the first
redesign.

The declarative-first model remains the primary authoring path.

## Hook Context Direction

Progression hooks should continue to receive the hydrated mutable facade `game`.

That is desirable because progression logic often needs to:

- inspect authoritative game state
- mutate state as part of entering or exiting a segment
- emit domain events
- use RNG where appropriate

However, progression hooks should not receive raw `commandInput`.

Instead, progression hooks should move toward a narrower execution summary.

Desired progression hook context shape:

- `game`
- `runtime`
- `segment`
- `progression`
- `rng` where lifecycle hooks need it
- `emitEvent` where lifecycle hooks need it
- `actorId`
- optionally `commandType`

Not desired in the public hook context:

- raw `commandInput.payload`

Reason:

- progression logic should be about flow, ownership, phase changes, and cleanup
- command-specific payload inspection belongs in command execution, not in
  progression orchestration
- exposing raw payload couples progression hooks to the whole command registry
  and pushes consumers toward unsafe narrowing

## Command Boundary

Progression should know stable execution facts, not command-local payload
details.

Good progression inputs:

- actor who acted
- command type that just succeeded
- current segment
- current game state

Bad progression inputs:

- command-specific payload fields such as `chosenNobleId`
- unions of unrelated command payload types

If progression logic depends on command-specific payload data, that is a signal
that the logic likely belongs in the command `execute()` path instead.

## Authoring Principles

The redesigned API should optimize for these principles:

- simple fixed structures should be short to author and easy to read
- progression structure should remain explicit and inspectable
- the authoring model should not force consumers into deep nested boilerplate
- progression code should not need to understand command payload unions
- asymmetric and dynamic games should remain possible later without forcing
  today’s simple games onto a low-level imperative API

## Scope Of This Decision

This document intentionally does not lock:

- the exact new builder or helper names
- the exact shape of the declarative progression DSL
- the later imperative escape hatch API
- migration sequencing from the current nested progression definition

Those should be decided in a follow-up implementation plan and then in the
implementation PRs.

## Accepted Outcome

The current direction is:

- redesign progression authoring as a hybrid model
- make declarative progression authoring the first-class default
- add an imperative escape hatch later for asymmetric or highly dynamic games
- keep `game` exposed in progression hooks
- remove raw `commandInput` from the public progression hook context in the
  redesign
- expose stable execution facts like `actorId` and possibly `commandType`
  instead
