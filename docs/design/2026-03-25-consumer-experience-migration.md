# Consumer Experience Migration

## Purpose

This doc records the target consumer-facing API direction for `tabletop-kernel`
based on the current ergonomics feedback.

The goal is to make the kernel easier to understand for the developer who
defines a game on top of it.

This doc is about the **kernel API itself**, not backend architecture or match
hosting.

## Current Problem

The current kernel API is too implementation-oriented:

- `defineGame(...)` returns a plain game definition object, but the name
  suggests something more interactive
- `createKernel(...)` returns an object that is bound to a game definition, but
  the word `kernel` is too vague from the consumer's point of view

The result is that the consumer has to understand internal terminology instead
of reading an API that clearly describes what each object is for.

## Target Direction

The kernel API should move toward a more readable, builder-oriented consumer
experience.

### 1. Game Definition Should Be Built Through A Builder

The consumer should define a game through:

```ts
new GameDefinitionBuilder<SplendorState>("splendor")
  .progression(...)
  .command("take_gems", ...)
  .command("buy_card", ...)
  .build();
```

This is preferred over the current `defineGame(...)` shape.

Reason:

- `GameDefinitionBuilder` is explicit about what the consumer is constructing
- the builder style is more readable for a rule author
- it better matches the mental model of assembling a game definition over time
- `.build()` makes the definition boundary explicit

### 2. `Kernel` Is Bad Naming

`Kernel` is too vague as a consumer-facing name.

The object currently returned by `createKernel(...)` behaves more like a
reducer-style executor:

- it is bound to a game definition
- it creates initial state
- it reduces `state + command -> next state/result`
- it exposes availability and discovery methods over a passed-in state

So the public naming should move toward something like:

- `GameExecutor`
- or another reducer-oriented name in the same family

The purpose of the new naming is to emphasize the actual usage pattern instead
of the implementation term `kernel`.

## Current Preferred Direction

The locked direction so far is:

- game definitions should be authored through
  `new GameDefinitionBuilder(...).build()`
- the runtime object currently named `Kernel` should be renamed toward
  `GameExecutor` or a similarly explicit reducer-style name

## Follow-Up

More consumer-experience changes may be added to this doc later.
