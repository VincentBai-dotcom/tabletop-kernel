# Client/Server Interaction Design

This document explores how a host application can use `tabletop-kernel` in a central authoritative server model without making the kernel itself transport-specific.

The goal here is not to lock a single networking protocol today.

The goal is to clarify the interaction shapes that a host is likely to need once a game runs on a server and multiple clients must stay in sync.

## Why This Topic Exists

`tabletop-kernel` is explicitly transport-agnostic.

That does not remove the need to think about client/server interaction.

If a game runs on a central authoritative server, the host still needs answers to questions like:

- what does the client send to the server
- what does the server send back
- what gets broadcast to other players
- how do hidden-information views work
- how do reconnects and spectators work
- how do replay and audit artifacts relate to live synchronization

The kernel should avoid hardcoding a protocol, but it should expose stable runtime artifacts that make these interaction models easy to build.

## Core Invariants

Any central-server model built around this kernel should preserve these invariants:

- the server is authoritative over canonical `{ game, runtime }` state
- clients submit commands rather than mutating state directly
- the server validates and executes commands
- the server decides what each viewer is allowed to see
- client-visible data may differ by viewer when hidden information matters
- reconnect and replay should come from authoritative server artifacts, not client-local guesswork

## The Main Interaction Surfaces

A server host built on `tabletop-kernel` will usually need some subset of these surfaces:

- command submission
- execution result for the submitting client
- state synchronization for all connected viewers
- viewer-specific projection or redaction
- event/history stream for replay, debugging, or spectators
- snapshot/checkpoint loading for reconnects or catch-up

The main design question is how much of that should travel in the immediate request/response path versus a separate update stream.

## Option 1: Simple Command/Result RPC

Shape:

- client sends a command
- server executes it immediately
- server returns one rich response to the caller

Example response contents:

- accepted or rejected
- validation metadata on rejection
- caller-visible committed events
- caller-visible updated state or state projection
- newly opened pending choices

Benefits:

- simplest model to build first
- easy for local tools, tests, bots, and early prototypes
- straightforward mental model

Weaknesses:

- weak fit for multiplayer fan-out by itself
- other clients still need a separate update mechanism
- reconnect and spectator flows become ad hoc unless another sync path exists

Good fit:

- local development
- single-client tools
- initial debugging surfaces
- synchronous agent-driven play

## Option 2: Command RPC Plus Authoritative State Broadcast

Shape:

- client sends a command to the server
- server validates and executes it
- server broadcasts updated viewer-specific state to all relevant clients
- the submitting client may receive only a light acknowledgement, or the same update via the broadcast path

Broadcast payload choices:

- full viewer-specific snapshot
- patch/diff
- minimal update envelope that includes visible pending choices and metadata

Benefits:

- natural fit for multiplayer sessions
- keeps server authority clear
- reconnect and late-join behavior can reuse the same state-view mechanism

Weaknesses:

- patch/diff design can get complex
- full snapshots are simpler but more bandwidth-heavy
- event/debug consumers may still need another stream

Good fit:

- standard online turn-based games
- multiple simultaneous viewers
- authoritative browser/native clients

## Option 3: Command RPC Plus Event Stream

Shape:

- client sends a command
- server executes it
- server emits committed events to subscribed clients
- clients derive visible UI updates from those events, often with periodic snapshots for recovery

Benefits:

- strong audit and replay story
- good for observers, logs, and devtools
- aligns with trigger/history concepts already present in the design

Weaknesses:

- clients must interpret the event stream correctly
- hidden-information filtering becomes more delicate
- purely event-driven clients are harder to build than snapshot-driven clients
- initial sync and reconnect still need snapshots or checkpoints

Good fit:

- rich developer tooling
- spectator/replay products
- systems that want a semantic live feed

## Option 4: Hybrid Snapshot Plus Event/Delta Model

Shape:

- client joins or reconnects by receiving a viewer-specific snapshot
- client submits commands via request/response
- server broadcasts incremental viewer-specific updates after each accepted execution
- updates may contain both:
  - visible committed events
  - state delta or refreshed projection

Benefits:

- strongest general-purpose model
- easy reconnect path through snapshots
- efficient live sync through deltas or events
- works for players, spectators, bots, and replay tools
- lets hosts choose how much logic lives client-side versus server-side

Weaknesses:

- more moving parts
- requires clearer envelope design
- visibility filtering must be applied consistently across multiple artifact types

Good fit:

- long-lived multiplayer games
- spectator support
- reconnect-heavy products
- future-proof transport layers

## State Sync Format Choices

Regardless of the higher-level interaction model, the server still needs a sync format.

The main choices are:

### Full viewer-specific snapshots

Benefits:

- simplest correctness story
- easiest reconnect path
- easiest clients to implement

Weaknesses:

- more bandwidth
- repetitive for small updates

### Patches or deltas

Benefits:

- smaller payloads
- better for frequent updates

Weaknesses:

- harder to make robust
- patch drift and version mismatch are real risks
- reconnect still needs snapshots

### Events only

Benefits:

- semantically meaningful
- great for audit trails and replay

Weaknesses:

- weak standalone sync mechanism
- clients must reconstruct enough state to render correctly

## Hidden Information Implications

Once hidden information matters, a central server cannot assume one uniform payload for everyone.

The server host will need viewer-specific handling for at least:

- state projection
- visible pending choices
- event payload filtering
- debug/log views

That means the client/server interaction model should assume that:

- the authoritative server owns full canonical state
- each outbound payload may be viewer-specific
- submitted commands may still reference hidden entities or private zones, but legality is checked server-side

This is one reason a pure client-derived event model is usually weaker than a server-projected view model.

## Recommended Near-Term Direction

The best default direction for `tabletop-kernel` hosts is:

- command submission via request/response
- authoritative viewer-specific snapshot on join/reconnect
- authoritative viewer-specific update broadcast after accepted execution
- optional visible committed events attached to those updates for debugging, replay, and tooling

This is effectively Option 4 in a conservative form.

Why this looks like the best default:

- it preserves the kernel's transport-agnostic stance
- it fits multiplayer better than pure RPC
- it fits reconnect better than pure events
- it fits replay/debugging better than pure snapshots
- it does not force every client to become an event interpreter

## What The Kernel Should Expose To Support These Models

To support the interaction patterns above, the kernel should continue exposing or eventually expose:

- canonical state snapshots
- command execution results
- committed events
- pending choices
- deterministic replay artifacts
- viewer-projection hooks or visibility contracts when that subsystem is revisited

The host layer can then choose whether to transmit:

- only snapshots
- only results plus broadcasts
- results plus events
- or a hybrid envelope

without forcing `tabletop-kernel` itself to become a networking framework.

## Open Questions

These questions are intentionally left open for later:

- should the kernel provide a standard update-envelope type for hosts
- should committed events be first-class in live client updates or mainly for tooling
- should reconnect always use full snapshots, or may it use checkpoints plus replay tail
- how should viewer-specific projections interact with pending choices once visibility becomes first-class
- whether optimistic client UI should be encouraged, tolerated, or kept entirely host-defined
