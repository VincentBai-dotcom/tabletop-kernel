# State Facade Authoring Design

## Purpose

This document records the target direction for game-state authoring ergonomics
in `tabletop-kernel`.

The goal is to let consumers author game state in an object-oriented,
domain-shaped way while preserving the kernel's current pure canonical-state
model.

## Problem

The current authoring model expects consumers to define game state mainly as
plain nested interfaces and then mutate the plain state tree directly in
commands.

That causes two problems:

- the state authoring experience becomes hard to read as games get larger
- commands become too coupled to the raw canonical tree shape

The kernel still wants to preserve:

- plain serializable canonical state
- deterministic replay and snapshots
- reducer-style execution semantics

So the problem is not the canonical runtime model itself. The problem is the
consumer-facing authoring layer.

## Locked Direction

The kernel should provide a class-oriented state authoring layer built on top
of the existing plain canonical state tree.

The consumer experience should look more like:

```ts
class PlayerState {
  health: number;
  hand: HandState;

  dealDamage(amount: number) {
    this.health -= amount;
  }
}
```

Commands should receive the root state object rather than the raw plain state
tree.

The state objects used by commands are not the canonical stored state. They are
temporary hydrated facades over a cloned plain state tree.

## Chosen Model

The chosen approach is:

- build-time compilation of the root state class into metadata
- runtime hydration of temporary facade objects over a cloned plain state tree

This keeps the current kernel execution model intact while improving the
consumer-facing authoring model.

## High-Level Flow

### Definition Time

The consumer defines:

- a root state class
- nested sub-state classes reachable from that root
- command definitions that operate on the root state object

The builder should take one explicit root state:

```ts
new GameDefinitionBuilder("splendor")
  .rootState(GameState)
  .commands(SplendorCommandList)
  .progression(...)
  .build();
```

When `build()` is called, the kernel compiles metadata from the root state
class graph.

That compiled metadata should describe:

- the root state class
- nested state class relationships
- field layout
- hydration logic
- how commands are wrapped to run against hydrated facades

### Execution Time

The executor should continue operating on plain canonical state.

For each execution:

1. receive canonical plain state
2. clone the canonical state into a working copy
3. hydrate a temporary root state facade over the cloned plain game tree
4. run command logic against that facade
5. discard the facade objects
6. return the mutated plain canonical clone

So the kernel remains pure-function-shaped externally:

- input state
- input command
- output next state

The object layer exists only for consumer ergonomics.

## Command Experience

Commands should receive the hydrated root state object in `execute()`.

Example target experience:

```ts
class BuyCardCommand implements CommandDefinition<GameState, BuyCardInput> {
  commandId = "buy_card";

  execute({ game, commandInput }) {
    game.market.buyCard(commandInput.payload.cardId, commandInput.actorId);
  }
}
```

Here:

- `game` is a temporary hydrated root state object
- it is backed by the cloned canonical plain data
- any state mutation should happen through state methods

## Mutation Rule

Locked direction:

- commands should not mutate state fields directly
- commands should mutate only through state object methods

So this is the intended pattern:

```ts
game.player(actorId).takeToken("red");
```

And this is not the intended pattern:

```ts
game.players[0].tokens.red += 1;
```

Reason:

- mutation boundaries become explicit
- domain behavior lives with the state object that owns it
- commands become orchestration layers rather than raw tree mutation scripts
- this leaves room for future effect-resolution abstractions

## Pure Functional Behavior

The kernel preserves purity at the executor boundary, not by forbidding
internal mutation completely.

The design is:

- externally pure reducer-style execution
- internally mutable working copy during a single execution

That means:

- the canonical stored state remains plain data
- replay and snapshots remain unchanged in principle
- facade objects are temporary and never become part of persisted state

This is effectively:

- internally mutable
- externally pure

which matches the current kernel execution model while providing a better
consumer-facing DSL.

## Validation And Discovery

Recommended direction:

- `validate()` receives a readonly hydrated root state facade
- `discover()` receives a readonly hydrated root state facade
- `execute()` receives a mutable hydrated root state facade

Reason:

- validation and discovery should not mutate state
- execution is the only phase that should mutate the working copy

## What This Design Does Not Change

This design does not require changing the `GameExecutor` runtime model.

The executor can continue to use:

- plain canonical state
- cloned working state
- deterministic runtime state
- command execution returning a new canonical state

The change is in:

- how the builder compiles game definitions
- how commands are wrapped
- what object is handed to the consumer during command execution

## Why This Direction Was Chosen

Compared with a fully reflective runtime-only approach, this design is better
because:

- metadata is compiled once at build time
- runtime behavior is more predictable
- the kernel preserves its current canonical-state architecture

Compared with requiring manual serializers/deserializers, this design is better
because:

- the consumer does not need excessive boilerplate
- the authoring model stays focused on game-domain objects

## Open Question

The next unresolved design question is:

- how the builder should determine which fields are nested state objects and
  which are plain scalar/data fields

That question should be decided before implementation begins.
