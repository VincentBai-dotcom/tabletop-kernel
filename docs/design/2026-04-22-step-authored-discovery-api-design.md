# Step-Authored Discovery API Design

## Purpose

Replace the current all-in-one command discovery handler with a step-authored
discovery API.

This redesign is intentionally not backward compatible. The old discovery shape
should be removed rather than supported alongside the new model.

## Problem

The current discovery API gives each command one discovery input schema and one
handler:

```ts
.discoverable({
  discoverySchema: reserveFaceUpCardDiscoverySchema,
  discover(context) {
    // Decides every discovery step in one function.
  },
})
```

This works for local execution, but it is weak for generated clients:

- `step` is only `string`
- option metadata is `Record<string, unknown>`
- the handler mixes multiple UI steps into one function
- the client cannot get a precise discriminated union for each discovery step
- the SDK cannot tell the UI the exact option output shape for a given step

The result is a protocol that is technically usable but too loose for a good web
client experience.

## Design Goals

- Make discovery steps explicit in command authoring.
- Let each step define its own input schema and option output schema.
- Keep authoring incremental with a builder API, not a large flat object.
- Let the client explicitly request which discovery step to run.
- Preserve ergonomic linear flows through step declaration order.
- Let the engine materialize explicit `nextStep` data for clients.
- Generate precise SDK types for discovery requests and results.
- Remove the legacy all-in-one discovery handler.

## New Authoring Shape

Discovery should be authored as a chain of named steps:

```ts
defineCommand({
  commandId: "reserve_face_up_card",
  commandSchema: reserveFaceUpCardCommandSchema,
})
  .discoverable((flow) =>
    flow
      .step("select_face_up_card", (step) =>
        step
          .input(t.object({}))
          .output(
            t.object({
              cardId: t.number(),
              name: t.string(),
              cost: tokenCountsSchema,
            }),
          )
          .resolve(({ game }) =>
            game.board.faceUpCards.map((card) => ({
              id: String(card.id),
              output: {
                cardId: card.id,
                name: card.name,
                cost: card.cost,
              },
              nextInput: {
                cardId: card.id,
              },
            })),
          ),
      )
      .step("return_tokens", (step) =>
        step
          .input(
            t.object({
              cardId: t.number(),
              returnTokens: t.optional(returnTokensSchema),
            }),
          )
          .output(
            t.object({
              color: tokenColorSchema,
              remainingReturnCount: t.number(),
            }),
          )
          .resolve(({ game, input }) => {
            if (!needsToReturnTokens(game, input)) {
              return {
                complete: true,
                input: {
                  cardId: input.cardId,
                  returnTokens: input.returnTokens,
                },
              };
            }

            return getReturnTokenOptions(game, input).map((option) => ({
              id: option.color,
              output: {
                color: option.color,
                remainingReturnCount: option.remainingReturnCount,
              },
              nextStep: "return_tokens",
              nextInput: {
                ...input,
                returnTokens: addReturnToken(input.returnTokens, option.color),
              },
            }));
          }),
      ),
  )
  .validate(...)
  .execute(...)
  .build();
```

There is no root `discoverySchema`. Each step owns the input schema for that
step.

There is no flow-level `.complete(...)`. A step completes discovery by returning
the final command input:

```ts
return {
  complete: true,
  input: commandInput,
};
```

## Step Builder

Each step should be authored through a staged builder:

```ts
step.input(stepInputSchema).output(stepOutputSchema).resolve(resolveStep);
```

This avoids the poor TypeScript ergonomics of a flat object where the compiler
complains until every required field is present.

The step builder should require:

- `.input(...)`
- `.output(...)`
- `.resolve(...)`

The command builder should not allow `.build()` until every declared discovery
step is complete.

## Step Resolution

Each step has one main function:

```ts
resolve(context): StepOption[] | StepComplete
```

A step option has:

```ts
{
  id: string;
  output: StepOutput;
  nextInput: NextStepInput;
  nextStep?: string;
}
```

`output` is data for the UI to render. It is validated and typed by the step's
`.output(...)` schema.

`nextInput` is the input the client should send with the next discovery request.

`nextStep` is optional. If omitted, the engine uses the next step by declaration
order. If provided, it overrides declaration order and supports loops or
branches.

A completion result has:

```ts
{
  complete: true;
  input: CommandInput;
}
```

The completion input must be validated against the command's `commandSchema`.

## Step Ordering

Step declaration order is meaningful.

Rules:

- the first declared step is the default starting step
- omitted `nextStep` means the next declared step
- explicit `nextStep` supports loops and branches
- the engine always sends explicit `nextStep` to clients
- if an option omits `nextStep` on the last declared step, that is an error
- if a step returns completion, no `nextStep` is needed

This keeps authoring concise while keeping the wire protocol explicit.

## Discovery Request Shape

The client should explicitly request the step to run:

```ts
{
  type: "reserve_face_up_card",
  actorId: "player-1",
  step: "select_face_up_card",
  input: {}
}
```

The engine should:

1. find the command by `type`
2. find the discovery step by `step`
3. validate `input` against that step's input schema
4. hydrate the discovery context
5. run only that step's resolver
6. validate option outputs and completion input
7. materialize `nextStep` on every returned option

The engine should not infer which step to run from the input shape.

## Discovery Result Shape

An incomplete result should include the current step and explicit next-step data
for every option:

```ts
{
  complete: false,
  step: "select_face_up_card",
  options: [
    {
      id: "12",
      output: {
        cardId: 12,
        name: "Mine",
        cost: { white: 1 },
      },
      nextStep: "return_tokens",
      nextInput: {
        cardId: 12,
      },
    },
  ],
}
```

A complete result should include the final command input:

```ts
{
  complete: true,
  input: {
    cardId: 12,
    returnTokens: { white: 1 },
  },
}
```

## Generated SDK Shape

The CLI should generate discovery request and result types as discriminated
unions by command and step.

Example request type:

```ts
export type ReserveFaceUpCardDiscoveryRequest =
  | {
      type: "reserve_face_up_card";
      actorId: string;
      step: "select_face_up_card";
      input: {};
    }
  | {
      type: "reserve_face_up_card";
      actorId: string;
      step: "return_tokens";
      input: {
        cardId: number;
        returnTokens?: ReturnTokens;
      };
    };
```

Example result type:

```ts
export type ReserveFaceUpCardDiscoveryResult =
  | {
      complete: false;
      step: "select_face_up_card";
      options: Array<{
        id: string;
        output: {
          cardId: number;
          name: string;
          cost: TokenCounts;
        };
        nextStep: "return_tokens";
        nextInput: {
          cardId: number;
        };
      }>;
    }
  | {
      complete: false;
      step: "return_tokens";
      options: Array<{
        id: string;
        output: {
          color: TokenColor;
          remainingReturnCount: number;
        };
        nextStep: "return_tokens";
        nextInput: {
          cardId: number;
          returnTokens?: ReturnTokens;
        };
      }>;
    }
  | {
      complete: true;
      input: ReserveFaceUpCardCommandInput;
    };
```

The generated SDK should also expose a start helper for the first declared step:

```ts
export const reserveFaceUpCardDiscoveryStart = {
  type: "reserve_face_up_card",
  step: "select_face_up_card",
  input: {},
} satisfies Omit<ReserveFaceUpCardDiscoveryRequest, "actorId">;
```

## Protocol Descriptor Changes

The protocol descriptor should expose per-step discovery metadata instead of a
single `discoverySchema`.

Current shape:

```ts
{
  commandSchema,
  discoverySchema,
}
```

New shape:

```ts
{
  commandSchema,
  discovery: {
    startStep: "select_face_up_card",
    steps: [
      {
        stepId: "select_face_up_card",
        inputSchema,
        outputSchema,
        defaultNextStep: "return_tokens",
      },
      {
        stepId: "return_tokens",
        inputSchema,
        outputSchema,
        defaultNextStep: undefined,
      },
    ],
  },
}
```

The descriptor should preserve step order because default next-step calculation
depends on declaration order.

## Runtime Compatibility

This redesign should remove the legacy discovery API.

Remove support for:

```ts
.discoverable({
  discoverySchema,
  discover,
})
```

Replace it with:

```ts
.discoverable((flow) => flow.step(...).step(...))
```

Existing Splendor discovery commands should be migrated in the same feature.

## Validation Rules

Definition-time validation should reject:

- discoverable commands with no steps
- duplicate step IDs within a command
- steps missing input, output, or resolve
- step input schemas that are not serializable object schemas
- step output schemas that are not serializable object schemas

Runtime validation should reject:

- discovery requests for unknown commands
- discovery requests for non-discoverable commands
- discovery requests for unknown steps
- discovery request input that does not match the requested step input schema
- resolver option output that does not match the step output schema
- resolver option `nextStep` values that do not refer to a declared step
- resolver completion input that does not match the command schema
- options on the last step that omit `nextStep`

## Migration Notes

Splendor command migration should convert each existing all-in-one discovery
handler into one or more explicit steps.

Likely mapping:

- card selection steps output card metadata for UI display
- deck-level selection steps output deck level metadata
- token return steps output token color and remaining return count
- noble selection steps output noble metadata

Existing helpers such as `createReturnTokenDiscovery(...)` and
`createNobleDiscovery(...)` should either be rewritten as step resolver helpers
or removed.

## Deferred Work

This design does not require:

- a separate trigger engine
- a resolution stack
- server room/session SDK generation
- backward compatibility with old discovery handlers

Those concerns should stay outside this feature.
