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
- command definitions are currently authored mainly as object literals that
  conform to `CommandDefinition`, which is not the most readable style for
  larger games

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

### 3. Command Definitions Should Support A Class-Oriented Authoring Style

The target consumer experience should not force all command definitions to be
authored as plain object literals.

The kernel should support a more OOP-friendly style where consumers can define
commands as classes that implement the command-definition contract.

Reason:

- larger games benefit from stronger structure around each command
- class-based authoring is often easier to read than large inline object
  literals
- it gives consumers a clearer place to put command-local helpers and internal
  organization

This does not require removing object-literal command definitions immediately,
but the target consumer experience should explicitly support class-based command
authoring.

### 4. Game Definition Should Take A Root State

The builder should take one explicit root state, not require the consumer to
manually wire many nested state pieces together one by one.

Example direction:

```ts
new GameDefinitionBuilder("splendor")
  .rootState(GameState)
  .commands(SplendorCommandList)
  .progression(...)
  .build();
```

The target authoring model is:

- the consumer defines state through classes
- the builder starts from the explicit root state
- the builder converts those classes into the canonical plain state tree that
  the executor uses internally

Reason:

- explicit root state keeps the overall game shape understandable
- the consumer should not need to register every sub-state manually
- the kernel can preserve the current canonical plain-data runtime model without
  forcing the consumer to author state as a giant nested interface file

### 5. The Builder Should Take Commands As A List

The builder should not force long chains like:

```ts
.command(new TakeThreeDistinctGemsCommand())
.command(new BuyFaceUpCardCommand())
.command(new ReserveCardCommand())
```

Instead, the consumer should define commands as a list and pass that list into
the builder.

Example direction:

```ts
const SplendorCommandList = [
  new TakeThreeDistinctGemsCommand(),
  new BuyFaceUpCardCommand(),
];

new GameDefinitionBuilder("splendor")
  .rootState(GameState)
  .commands(SplendorCommandList)
  .progression(...)
  .build();
```

Reason:

- a single game can have many commands
- passing commands as a list is more ergonomic than long chained registration
- command identity should come from the command definition itself rather than an
  external object key
- this avoids ambiguity between a registration key and the command's real name
- it fits naturally with class-based command authoring

## Current Preferred Direction

The locked direction so far is:

- game definitions should be authored through
  `new GameDefinitionBuilder(...).build()`
- the runtime object currently named `Kernel` should be renamed toward
  `GameExecutor` or a similarly explicit reducer-style name
- command definitions should support a class-oriented authoring style instead of
  only object literals conforming to `CommandDefinition`
- the builder should take one explicit root state and convert authored state
  classes into the canonical plain state tree used internally
- the builder should take commands as a list instead of forcing long chains of
  individual `.command(...)` calls

## Follow-Up

More consumer-experience changes may be added to this doc later.
