# Discovery Draft Flow Design

## Problem

The current discovery API is modeled around `partialCommand`.

That is too loose for the actual interaction pattern:

- discovery is usually a guided flow
- different commands have distinct step sequences
- many flows are command-specific but also branch on earlier selections
- card games often have one `play_card` command with different follow-up steps per card

In practice, consumers already treat `partialCommand.payload` as an in-progress
draft rather than a real partial final command payload.

That mismatch causes three problems:

1. the types imply final payload shape too early
2. invalid intermediate states are easy to express
3. frontend/server interaction is harder to standardize for AsyncAPI

## Goals

- separate guided discovery state from final executable command payload
- support command-specific and card-specific branching flows
- preserve one command per action family, not one command per card
- let consumers model discovery state in their own domain language
- make frontend interaction stepwise and explicit
- support future AsyncAPI generation for both final command submission and
  discovery interaction

## Non-Goals

- full kernel-owned finite-state-machine authoring for discovery
- automatic inference of per-step schemas from arbitrary discovery logic
- replacing command validation with discovery

`validate()` remains the final authority before execution.

## Decision

Replace `partialCommand` with a separate discovery request shape:

- `CommandInput<TPayload>`
  final executable command input
- `DiscoveryInput<TDraft>`
  in-progress discovery draft

`discover()` should consume `DiscoveryInput<TDraft>` and return a standard
result envelope with two modes:

- incomplete:
  - current `step`
  - list of options
  - each option advances to `nextDraft`
- complete:
  - final `payload`

So discovery becomes:

- explicit guided draft flow

instead of:

- arbitrary partial final payload

## Recommended Runtime Surface

### Discovery input

```ts
interface DiscoveryInput<
  Draft extends Record<string, unknown> = Record<string, unknown>,
> {
  type: string;
  actorId?: string;
  draft?: Draft;
}
```

### Discovery context

```ts
type DiscoveryContext<
  FacadeGameState extends object = object,
  TDraft extends Record<string, unknown> = Record<string, unknown>,
> = CommandAvailabilityContext<FacadeGameState> & {
  discoveryInput: DiscoveryInput<TDraft>;
};
```

### Discovery result

```ts
interface DiscoveryOption<
  TDraft extends Record<string, unknown> = Record<string, unknown>,
> {
  id: string;
  nextDraft: TDraft;
  metadata?: Record<string, unknown>;
}

type CommandDiscoveryResult<
  TDraft extends Record<string, unknown> = Record<string, unknown>,
  TPayload extends Record<string, unknown> = Record<string, unknown>,
> =
  | {
      complete: false;
      step: string;
      options: DiscoveryOption<TDraft>[];
      metadata?: Record<string, unknown>;
    }
  | {
      complete: true;
      payload: TPayload;
      metadata?: Record<string, unknown>;
    };
```

### Command definition

The command definition should carry both:

- final payload type
- discovery draft type

Conceptually:

```ts
type CommandDefinition<
  GameState,
  Payload,
  Draft = Payload,
> = {
  payloadSchema: ...;
  discoveryDraftSchema?: ...;
  discover?(context: DiscoveryContext<GameState, Draft>): CommandDiscoveryResult<Draft, Payload> | null;
  validate(... final payload ...)
  execute(... final payload ...)
}
```

`Draft = Payload` remains a sensible default for simple commands that do not
need a different guided flow model.

## Consumer experience

### Example: simple gem-take command

Simple commands can still use a draft close to the final payload.

```ts
const takeTwoSameGemsPayloadSchema = t.object({
  color: t.optional(t.string()),
  returnTokens: t.optional(t.record(t.string(), t.number())),
});

type TakeTwoSameGemsPayload = typeof takeTwoSameGemsPayloadSchema.static;
type TakeTwoSameGemsDraft = TakeTwoSameGemsPayload;
```

That keeps the current consumer ergonomics where it makes sense.

### Example: one `play_card` command with card-specific flows

```ts
const playCardPayloadSchema = t.object({
  cardId: t.number(),
  targets: t.optional(t.array(t.number())),
});

type PlayCardPayload = typeof playCardPayloadSchema.static;

const playCardDraftSchema = t.object({
  step: t.string(),
  cardId: t.optional(t.number()),
  targets: t.optional(t.array(t.number())),
});

type PlayCardDraft = typeof playCardDraftSchema.static;
```

Then:

- initial draft returns playable cards
- chosen card may immediately complete if it needs no target
- or it may continue into one or more target-selection steps

This keeps:

- one stable `play_card` command
- flexible branching inside discovery

without creating one command per card.

## AsyncAPI implications

Discovery and execution are different protocol surfaces and should be modeled
separately.

### Final command submission

This continues to use `payloadSchema`.

Example:

```json
{
  "type": "play_card",
  "actorId": "p1",
  "payload": {
    "cardId": 12,
    "targets": [101]
  }
}
```

### Discovery request

This should use `discoveryDraftSchema`.

Example:

```json
{
  "type": "play_card",
  "actorId": "p1",
  "draft": {
    "step": "select_target",
    "cardId": 12
  }
}
```

### Discovery response

This should use a standard envelope:

- incomplete:
  - `complete: false`
  - `step`
  - `options[].nextDraft`
- complete:
  - `complete: true`
  - final `payload`

This gives the kernel a stable discovery protocol surface without forcing the
consumer into one fixed authoring model.

## Migration direction

### Engine

- replace `partialCommand` with `discoveryInput`
- replace `nextPartialCommand` with `nextDraft`
- make discovery result a discriminated complete/incomplete union
- add optional `discoveryDraftSchema`

### Examples

- migrate Splendor discovery helpers and commands to use `draft`
- update terminal client flow to build up `draft` and only materialize final
  command once discovery completes

### Protocol

- keep command payload AsyncAPI generation intact
- defer full generated discovery AsyncAPI until `discoveryDraftSchema` is wired
  through protocol descriptor generation

## Recommendation

Implement this redesign now.

It matches how discovery already works in practice, improves frontend and
hosted-protocol clarity, and avoids overcommitting to one-command-per-card
surfaces that would scale badly in card games.
