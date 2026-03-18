# tabletop-kernel Design

## Purpose

`tabletop-kernel` is a reusable, transport-agnostic runtime for board-game rules engines.

The goal is to let an agent or human implement a game's rules on top of a stable kernel instead of repeatedly rebuilding the same runtime infrastructure for:

- turn and phase progression
- event handling
- triggered abilities
- resolution queues or stacks
- hidden information
- deterministic randomness
- serialization
- replay
- simulation
- testing

This is a living design document. It should be updated as architectural decisions change.

## Non-Goals

`tabletop-kernel` should not decide how games are hosted or rendered.

Out of scope for the kernel:

- browser UI frameworks
- Unity-specific gameplay architecture
- Godot-specific gameplay architecture
- matchmaking, accounts, or commerce systems
- transport-specific assumptions such as WebSocket-only, HTTP-only, Steam-only, or peer-to-peer-only hosting

Frontend and product teams should be able to build on top of the kernel using whatever client technology they want.

## Core Design Principles

### 1. Engine semantics first

The kernel should model game semantics directly instead of forcing everything through a transport or UI abstraction.

Examples:

- domain events should be first-class
- triggered abilities should be first-class
- hidden-information handling should eventually be coherent, but does not need to be a first-class kernel subsystem in the first implementation pass
- replay should be first-class

### 2. Pure runtime core

The core runtime should be deterministic and embeddable.

That means the main engine should be usable:

- in a local single-player session
- in a simulation harness
- in automated tests
- in a server-authoritative online match
- behind an API used by Unity, Godot, web, or custom clients

### 3. Host-agnostic architecture

The kernel should not assume where it runs.

It should support multiple hosts:

- local in-memory host
- Node server host
- simulation/test host
- external host adapters for engines or native clients

### 4. Agent-first authoring

The repository is meant to be used mainly by agents and secondarily by humans.

This means the architecture should prefer:

- explicit data models
- deterministic behavior
- strong testability
- small composable abstractions
- minimal hidden magic

### 5. Same language for kernel and rules

Game-specific rule implementations should use the same language as the kernel so agents and humans can build on one consistent toolchain and mental model.

## Language Choice

### Decision

The default language for `tabletop-kernel` should be **TypeScript**.

### Why TypeScript

TypeScript is the best fit for the current goals because:

- the project is agent-first, and TypeScript is a strong language for generated and edited business-logic code
- game rules will be written in the same language as the kernel
- the runtime needs to work well on web and server targets
- the architecture is intentionally host-agnostic, so Unity should be treated as one consumer among many rather than the primary design center
- TypeScript is well-suited to a pure deterministic runtime library plus adapters

### Why not C# as the default

C# would be the strongest choice if native in-process Unity execution were the main requirement.

That is not the situation here.

Unity is only one possible distribution target, alongside:

- web
- custom engines
- Godot
- server-side authoritative hosts
- local simulation tools

Because of that, choosing C# would optimize too early for one host environment instead of the kernel itself.

### Important caveat

Choosing TypeScript does **not** mean the engine must only run on a remote server.

The intended model is:

- the core engine is a pure TypeScript library
- online multiplayer can use a server-authoritative Node host
- offline local play, local bots, tests, and simulations can use the same engine locally
- Unity or other engines can consume the engine through adapters or service boundaries

## High-Level Architecture

The repo should eventually separate into a few conceptual layers.

### 1. Core runtime

Responsible for:

- authoritative state
- progression state
- command processing
- event emission
- trigger registration and collection
- resolution handling
- deterministic randomness
- serialization boundaries
- replay/history

This layer must remain transport-agnostic.

### 2. Game Definition Interface

`tabletop-kernel` should expose a stable interface that consumers use to define a game.

The kernel itself should not implement game-specific rules.

Instead, consumers should provide game definitions that plug into kernel contracts such as:

- setup logic
- legal command definitions
- domain event definitions
- trigger definitions
- resolution policies
- visibility policies when or if the kernel later standardizes them
- end-condition logic

The responsibility split should be:

- `tabletop-kernel` provides runtime primitives, contracts, and execution semantics
- the consumer implements the actual game rules using those contracts

### 3. Host adapters

Host adapters should provide runtime integration without changing engine semantics.

Examples:

- local in-memory execution
- Node authoritative match host
- simulation runner
- replay runner
- external protocol adapter for Unity, Godot, or custom frontends

### 4. Tooling and testing

The repo should provide first-class tooling for:

- deterministic tests
- fixture creation
- replay inspection
- simulation branching
- bot evaluation
- debugging engine state and pending resolutions

## Target Runtime Capabilities

The kernel should eventually provide explicit support for the following capabilities.

### Turn and phase progression

Support:

- turn order
- phases
- steps/stages
- simultaneous action windows where needed

### Event model

The kernel should distinguish between:

- lifecycle commands
- domain events

It should not collapse all runtime activity into a single ambiguous queue.

### Trigger engine

The kernel should be able to:

- detect triggers from domain events
- create pending trigger instances
- order them according to game rules
- request player choices where needed
- resolve them deterministically

### Resolution model

Different games need different resolution structures.

The kernel should be designed to support:

- immediate resolution
- FIFO queues
- LIFO stacks
- other game-specific timing/resolution policies

### Hidden information

Visibility should be part of the engine model, not only a final rendering filter.

The kernel should support:

- observer-specific state views
- secret zones
- controlled reveals
- replay/log views that differ by observer

### Randomness

The kernel should provide:

- deterministic seeded randomness
- serializable RNG state
- test overrides and mocks
- random outcomes that can be replayed

### Serialization and replay

The kernel should define:

- serializable state boundaries
- durable snapshots
- semantic history logs
- deterministic replay and rewind support

### Test harness

The kernel should expose a dedicated test/simulation harness so games can be tested without UI or transport layers.

## Recommended Host Model

The architecture should assume multiple valid ways to run the same engine.

### Local mode

Used for:

- offline play
- local bots
- AI self-play
- debugging
- tests

### Online authoritative mode

Used for:

- multiplayer matches
- persistence-backed play
- anti-cheat or validation needs
- shared canonical state

### External-client mode

Used when a frontend is written in:

- Unity
- Godot
- a custom engine
- a web app
- a native desktop/mobile client

In this model, the frontend consumes the engine rather than redefining it.

## Short Language Summary

Short version:

TypeScript is the right default because `tabletop-kernel` is an agent-first, host-agnostic runtime whose rules should be written in the same language as the kernel. The design should optimize for portable engine semantics across web, server, local simulation, and external clients rather than optimizing for native execution inside one engine such as Unity.

## Near-Term Design Goals

The next design and implementation work should define:

1. the runtime state model
2. the command and event pipeline
3. the trigger engine model
4. the resolution model
5. the RNG and replay model
6. the simulation/test harness
7. the external host protocol shape
8. whether hidden-information handling needs a first-class kernel model after initial implementation experience

## Open Questions

These are not resolved yet:

- what the exact state schema should look like
- how commands, events, and effects should be separated
- whether stack/queue support should be pluggable or always present
- how strongly typed game definitions should be
- whether the repo should become a monorepo with separate runtime, protocol, and tooling packages

## Document Status

Status: active living design

This file is intended to be revised frequently as the project architecture becomes more concrete.
