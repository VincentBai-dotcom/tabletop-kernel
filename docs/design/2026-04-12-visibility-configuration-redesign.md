# Visibility Configuration Redesign

## Problem

The current class-property state authoring model is still the preferred DX.

That means:

- keep `@State()` / `@field(t(...))`-style state field authoring ergonomics
- keep class properties as the main source of local static inference
- keep methods on state classes for local domain behavior

The main problem is not canonical state authoring. The main problem is
visibility.

Today hidden-information rules are authored through visibility decorators such
as:

- `@hidden(...)`
- `@visibleToSelf(...)`
- `@OwnedByPlayer()`

This creates two issues:

1. TypeScript cannot infer exact `getView(...)` output from decorator metadata.
2. The current runtime projection logic walks the full state tree generically at
   `getView(...)` time, which is more expensive and less structured than it
   needs to be.

## Decision

Keep state field authoring as it is today, but move visibility and ownership
authoring out of decorators and into an explicit class-level configuration API:

```ts
configureVisibility(SplendorPlayerState, {
  ownedBy: "id",
  fields: {
    reservedCardIds: visibleToSelf({
      summary: t.object({
        count: t.number(),
      }),
      derive(value) {
        return { count: value.length };
      },
    }),
  },
});
```

This replaces:

- `@hidden(...)`
- `@visibleToSelf(...)`
- `@OwnedByPlayer()`

as the primary visibility authoring path.

## Authoring Model

State authoring stays class-property based:

```ts
@State()
class SplendorPlayerState {
  @field(t.string())
  id = "";

  @field(t.array(t.number()))
  reservedCardIds: number[] = [];

  @field(t.array(t.number()))
  purchasedCardIds: number[] = [];

  reserveCard(cardId: number) {
    this.reservedCardIds.push(cardId);
  }
}

configureVisibility(SplendorPlayerState, {
  ownedBy: "id",
  fields: {
    reservedCardIds: visibleToSelf({
      summary: t.object({
        count: t.number(),
      }),
      derive(value) {
        return { count: value.length };
      },
    }),
  },
});
```

This preserves the existing state-class DX while making visibility rules
type-visible in ordinary values instead of runtime-only decorators.

## API Shape

### `configureVisibility(...)`

Recommended shape:

```ts
configureVisibility(StateClass, {
  ownedBy?: "fieldName",
  fields?: {
    [fieldName]: hidden(...) | visibleToSelf(...),
  },
});
```

This is preferred over:

- arbitrary static property names on the class
- `defineVisibility<Class>()` generic authoring
- `satisfies VisibilityConfig<Class>`-style typing

because `configureVisibility(...)` is explicit, short, and definition-time in
intent.

### `hidden(...)`

```ts
hidden()

hidden({
  summary: t.object(...),
  derive(value) {
    return ...
  },
})
```

Semantics:

- `hidden()` means the visible field becomes `{ __hidden: true }`
- `hidden({ summary, derive })` means the visible field becomes
  `{ __hidden: true, value: Summary }`

### `visibleToSelf(...)`

```ts
visibleToSelf()

visibleToSelf({
  summary: t.object(...),
  derive(value) {
    return ...
  },
})
```

Semantics:

- `visibleToSelf()` means the visible field becomes
  `OriginalFieldValue | { __hidden: true }`
- `visibleToSelf({ summary, derive })` means the visible field becomes
  `OriginalFieldValue | { __hidden: true, value: Summary }`

### Inline `derive(...)`

The new API should support inline derive functions directly.

Example:

```ts
configureVisibility(SplendorPlayerState, {
  ownedBy: "id",
  fields: {
    reservedCardIds: visibleToSelf({
      summary: t.object({
        count: t.number(),
      }),
      derive(value) {
        return { count: value.length };
      },
    }),
  },
});
```

This is preferred over method-name indirection such as:

```ts
derive: "summarizeReservedCards";
```

because inline derive functions:

- are shorter
- avoid string indirection
- are easier to type
- keep summary logic next to visibility config

## Ownership

Ownership should move into the same visibility configuration API:

```ts
configureVisibility(SplendorPlayerState, {
  ownedBy: "id",
  fields: {
    reservedCardIds: visibleToSelf(),
  },
});
```

This replaces `@OwnedByPlayer()`.

Reason:

- ownership is fundamentally a view-projection concern
- it is used to resolve `visibleToSelf(...)`
- it belongs with visibility rules, not as a separate class decorator

The engine should validate:

- `ownedBy` references a real field on the state class
- that field uses `t.string()`

## Runtime Projection Design

The current runtime projection strategy should be refactored.

The engine should not keep a generic “walk the entire tree and inspect every
node” projector as the primary model.

Instead:

1. `GameDefinitionBuilder.build()` should compile visibility into a projection
   plan for each reachable state class.
2. Each compiled state projector should know:
   - which field provides owner context
   - which fields are plain pass-through
   - which fields require hidden transformation
   - which fields recurse into nested state projection
3. `getView(...)` should execute those compiled projectors against the canonical
   game state.

So the engine still projects nested visible state recursively, but it does so
through precompiled field plans rather than generic full-tree reflection.

## Why Not Plain Path Lists

A flat list of hidden paths is not enough.

Visibility depends on runtime structure such as:

- nested `Record<string, PlayerState>`
- arrays of nested states
- nearest owned ancestor
- viewer id vs runtime owner id

So the engine needs structured compiled projectors, not just a list of string
paths to patch.

## Static Typing Goal

This redesign should make exact `getView(...)` typing possible without changing
normal state field authoring.

The critical change is:

- field shape stays on the class property type
- visibility rules move into a normal typed value through
  `configureVisibility(...)`

That gives TypeScript a type-visible source of:

- hidden envelopes
- self-visible unions
- hidden summaries

without forcing state field authoring into a fully schema-first model.

## What Stays

- class-property state authoring
- `@field(t(...))`
- state methods for local domain behavior
- plain canonical `{ game, runtime }` executor state
- engine-owned `getView(...)`

## What Changes

- `@hidden(...)` becomes legacy
- `@visibleToSelf(...)` becomes legacy
- `@OwnedByPlayer()` becomes legacy
- visibility is configured with `configureVisibility(...)`
- `getView(...)` moves to compiled projector plans instead of generic tree
  traversal as the primary runtime approach

## Legacy Surface To Remove Later

After this redesign is implemented, remove or deprecate:

- `@hidden(...)`
- `@visibleToSelf(...)`
- `@OwnedByPlayer()`

from the primary engine authoring path.

The existing projection implementation in
[project.ts](/home/vincent-bai/Documents/github/tabletop-kernel/packages/tabletop-engine/src/state-facade/project.ts)
should also be refactored so the runtime uses compiled visibility projectors
instead of the current generic traversal model.
