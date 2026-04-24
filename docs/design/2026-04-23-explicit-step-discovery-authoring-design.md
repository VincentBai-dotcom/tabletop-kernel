# Explicit Step Discovery Authoring Design

## Purpose

Refine the current step-authored discovery API into a more direct authoring
model.

This redesign is intentionally not backward compatible. The current
`discoverable((flow) => flow.step(...))` shape should be removed rather than
supported alongside the new model.

## Problem

The current API already models discovery as steps, but the authoring shape still
has two unnecessary pieces of framework ceremony:

- a root `discoverable((flow) => ...)` callback
- implicit start-step and transition behavior based on declaration order

Example of the current shape:

```ts
.discoverable((flow) =>
  flow.step("select_face_up_card", (step) =>
    step
      .input(selectFaceUpCardDiscoveryInputSchema)
      .output(selectFaceUpCardDiscoveryOutputSchema)
      .resolve(({ actorId, game, discovery }) => {
        // ...
        return [
          {
            id: "1:42",
            output: { ... },
            nextInput: { ... },
            nextStep: "select_face_up_card",
          },
        ];
      }),
  ),
)
```

Problems with this shape:

- the outer `flow` callback adds no real semantic value
- declaration order still matters for start-step inference
- declaration order still matters for fallback `nextStep` inference
- the API looks more engine-driven than domain-driven
- discovery steps are not authored as first-class objects

The result is workable, but still not as clean as the rest of the command
builder API.

## Design Goals

- Make discovery steps first-class authored values.
- Remove the outer `flow` callback entirely.
- Remove order-based start-step inference.
- Remove order-based `nextStep` fallback behavior.
- Keep step authoring incremental through a staged builder.
- Preserve per-option branching by letting `resolve(...)` return `nextStep`.
- Make the initial step explicit through `.initial()`.
- Let terminal completion stay explicit through `{ complete: true, input }`.
- Keep generated protocol and SDK typing precise.

## New Authoring Shape

`discoverable(...)` should accept one or more built discovery step definitions
directly:

```ts
defineCommand({
  commandId: "buy_face_up_card",
  commandSchema: buyFaceUpCardCommandSchema,
})
  .discoverable(
    discoveryStep("select_face_up_card")
      .initial()
      .input(selectFaceUpCardDiscoveryInputSchema)
      .output(selectFaceUpCardDiscoveryOutputSchema)
      .resolve(({ actorId, game, discovery }) => {
        const draft = discovery.input;
        const player = game.getPlayer(actorId);

        if (draft.selectedLevel && draft.selectedCardId) {
          return {
            complete: true,
            input: {
              level: draft.selectedLevel,
              cardId: draft.selectedCardId,
            },
          };
        }

        return Object.entries(game.board.faceUpByLevel).flatMap(
          ([level, cardIds]) =>
            cardIds
              .filter((cardId) => {
                const card = game.getCard(cardId);
                return player.getAffordablePayment(card) !== null;
              })
              .map((cardId) => {
                const card = game.getCard(cardId);

                return {
                  id: `${level}:${cardId}`,
                  output: {
                    level: Number(level),
                    cardId,
                    bonusColor: card.bonusColor,
                    prestigePoints: card.prestigePoints,
                    source: "face_up",
                  },
                  nextStep: "select_face_up_card",
                  nextInput: {
                    ...draft,
                    selectedLevel: Number(level),
                    selectedCardId: cardId,
                  },
                };
              }),
        );
      })
      .build(),
  )
  .validate(...)
  .execute(...)
  .build();
```

For multi-step discovery:

```ts
.discoverable(
  discoveryStep("select_face_up_card")
    .initial()
    .input(selectFaceUpCardDiscoveryInputSchema)
    .output(selectFaceUpCardDiscoveryOutputSchema)
    .resolve(({ discovery }) => {
      // ...
      return [
        {
          id: "1:42",
          output: { ... },
          nextStep: "select_return_token",
          nextInput: { ... },
        },
      ];
    })
    .build(),

  discoveryStep("select_return_token")
    .input(selectReturnTokenDiscoveryInputSchema)
    .output(selectReturnTokenDiscoveryOutputSchema)
    .resolve(({ discovery }) => {
      // ...
      return {
        complete: true,
        input: { ... },
      };
    })
    .build(),
)
```

This makes discovery read as a list of explicit authored steps rather than as a
mini DSL hidden inside a callback.

## Discovery Step Builder

Discovery steps should be created through a staged builder:

```ts
discoveryStep("select_face_up_card")
  .initial()
  .input(...)
  .output(...)
  .resolve(...)
  .build()
```

Required members:

- `.input(...)`
- `.output(...)`
- `.resolve(...)`
- `.build()`

Optional members:

- `.initial()`

The staged typing should still prevent invalid authoring order:

- `.resolve(...)` is not available before `.input(...).output(...)`
- `.build()` is not available before `.resolve(...)`

This keeps the good TypeScript ergonomics of the current staged builder while
making the authored result a concrete step value.

## Initial Step Semantics

The start step should no longer come from declaration order.

Instead:

- exactly one discovery step must be marked with `.initial()`
- that step becomes `discovery.startStep`
- zero initial steps is an error
- more than one initial step is an error

This is better than positional inference because it makes the starting point
part of the authored semantics rather than an incidental side effect of source
order.

## Step Resolution Semantics

Each step has one resolver:

```ts
resolve(context): StepOption[] | StepComplete | null
```

A step option has this shape:

```ts
{
  id: string;
  output: StepOutput;
  nextStep: string;
  nextInput: NextStepInput;
}
```

`nextStep` should be required on every non-complete option.

Reason:

- branching is a runtime decision
- the next step may depend on the current discovery input
- the next step may depend on the specific option being emitted
- fallback inference from declaration order hides control flow

The engine should no longer infer `nextStep` from order.

A completion result stays:

```ts
{
  complete: true;
  input: CommandInput;
}
```

This is the only terminal discovery result. There is no separate notion of a
"terminal step" in step metadata.

## No Step-Level `nextStep()`

The engine should not add a step-level `.nextStep(...)` builder method.

That API only works when every option emitted by a step goes to the same next
step. Once discovery supports real branching, `nextStep` belongs to each
returned option, not to the step definition.

So the correct separation is:

- step definition owns `input`, `output`, `resolve`, and `initial`
- resolver output owns `nextStep` and `nextInput`

## Runtime Validation Rules

When building a command definition, the engine should validate:

- at least one discovery step exists
- every step id is unique
- exactly one step is marked initial
- every step has `inputSchema`
- every step has `outputSchema`
- every step has `resolve`

When describing protocol or executing discovery, the engine should validate:

- `startStep` references a declared step
- every returned option has a non-empty `nextStep`
- every returned `nextStep` references a declared step
- every returned `output` matches the current step output schema
- every returned `complete.input` matches the command schema

Invalid discovery authoring or invalid resolver output should fail closed.

## Protocol Descriptor Shape

The protocol descriptor should continue to expose:

```ts
{
  startStep: string;
  steps: [
    {
      stepId: string;
      inputSchema,
      outputSchema,
    },
  ];
}
```

The difference is how `startStep` is derived:

- old design: first declared step
- new design: the step marked `.initial()`

There should be no `defaultNextStep` in the protocol descriptor because the
engine no longer owns implicit transitions.

## Discovery Request And Result Shape

The request shape stays explicit:

```ts
{
  type: "buy_face_up_card",
  actorId: "player-1",
  step: "select_face_up_card",
  input: {}
}
```

The result shape stays explicit:

```ts
{
  complete: false,
  step: "select_face_up_card",
  options: [
    {
      id: "1:42",
      output: { ... },
      nextStep: "select_return_token",
      nextInput: { ... },
    },
  ],
}
```

The important change is semantic, not transport-level:

- `nextStep` is always authored by the resolver
- the engine does not synthesize fallback `nextStep` from order

## Generated SDK Shape

The generated SDK should keep the current command-specific unions:

- `BuyFaceUpCardDiscoveryRequest`
- `BuyFaceUpCardDiscoveryResult`
- `buyFaceUpCardDiscoveryStart`

The start helper should be derived from the step marked `.initial()`, not from
the first declared step.

Example:

```ts
export const buyFaceUpCardDiscoveryStart = {
  type: "buy_face_up_card",
  step: "select_face_up_card",
  input: {},
} satisfies BuyFaceUpCardDiscoveryStart;
```

## Builder API Surface

The public API should move from:

```ts
.discoverable((flow) =>
  flow.step("a", (step) => step.input(...).output(...).resolve(...)),
)
```

to:

```ts
.discoverable(
  discoveryStep("a")
    .initial()
    .input(...)
    .output(...)
    .resolve(...)
    .build(),
)
```

This means:

- remove `DiscoveryFlowBuilder`
- remove flow-level `.step(...)`
- add a reusable `discoveryStep(stepId)` builder entrypoint
- let `discoverable(...)` accept a variadic list of built step definitions

This surface is simpler because it matches the conceptual model directly:
discovery is a list of steps.

## Migration Direction

This redesign should be treated as a breaking replacement.

Do not keep:

- `discoverable((flow) => ...)`
- implicit first-step inference
- implicit order-based `nextStep` fallback
- protocol metadata for default next step

All command authoring should move to the explicit step-object model.

## Recommendation

Adopt the explicit step-object model:

- `discoverable(stepA, stepB, ...)`
- `discoveryStep(stepId)...build()`
- `.initial()` required on exactly one step
- `resolve(...)` returns per-option `nextStep`
- no step-level `.nextStep(...)`
- no order-based fallback behavior

This keeps the good part of the current redesign, explicit per-step schemas,
while removing the remaining framework ceremony and hidden control-flow rules.
