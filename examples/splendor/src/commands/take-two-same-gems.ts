import {
  t,
  type CommandDefinition,
  type NumberFieldType,
  type ObjectFieldType,
  type OptionalFieldType,
  type RecordFieldType,
  type StringFieldType,
} from "tabletop-engine";
import {
  completeDiscovery,
  createReturnTokenDiscovery,
  SPLENDOR_DISCOVERY_STEPS,
} from "../discovery.ts";
import type {
  ReturnTokensPayload,
  SplendorGameState,
  TakeTwoSameGemsPayload,
} from "../state.ts";
import {
  assertAvailableActor,
  assertActivePlayer,
  assertGameActive,
  guardedAvailability,
  guardedValidate,
  readPayload,
  type SplendorAvailabilityContext,
  type SplendorDiscoveryContext,
  type SplendorExecuteContext,
  type SplendorValidationContext,
} from "./shared.ts";

type TakeTwoSameGemsPayloadSchema = ObjectFieldType<{
  color: OptionalFieldType<StringFieldType>;
  returnTokens: OptionalFieldType<
    RecordFieldType<StringFieldType, NumberFieldType>
  >;
}>;

const takeTwoSameGemsPayloadSchema: TakeTwoSameGemsPayloadSchema = t.object({
  color: t.optional(t.string()),
  returnTokens: t.optional(t.record(t.string(), t.number())),
});

export class TakeTwoSameGemsCommand implements CommandDefinition<
  SplendorGameState,
  TakeTwoSameGemsPayloadSchema
> {
  readonly commandId = "take_two_same_gems";
  readonly payloadSchema: TakeTwoSameGemsPayloadSchema =
    takeTwoSameGemsPayloadSchema;

  isAvailable(context: SplendorAvailabilityContext) {
    return guardedAvailability(() => {
      assertAvailableActor(context);
      const game = context.game;
      const bankEntries = Object.entries(game.bank) as Array<[string, number]>;

      return bankEntries.some(
        ([color, count]) => color !== "gold" && count >= 4,
      );
    });
  }

  discover(context: SplendorDiscoveryContext<TakeTwoSameGemsPayloadSchema>) {
    const actorId = assertAvailableActor(context);
    const game = context.game;
    const payload = readPayload<
      Partial<TakeTwoSameGemsPayload> & {
        returnTokens?: ReturnTokensPayload;
      }
    >(context.partialCommand);

    if (!payload.color) {
      const bankEntries = Object.entries(game.bank) as Array<[string, number]>;

      return {
        step: SPLENDOR_DISCOVERY_STEPS.selectGemColor,
        options: bankEntries
          .filter(([color, count]) => color !== "gold" && count >= 4)
          .map(([color]) => ({
            id: color,
            value: {
              ...payload,
              color,
            },
            metadata: {
              color,
              amount: 2,
            },
          })),
      };
    }

    const player = game.getPlayer(actorId).clone();
    player.tokens.adjustColor(payload.color, 2);
    const requiredReturnCount = player.getRequiredReturnCount();
    const returnDiscovery = createReturnTokenDiscovery(
      payload,
      player.tokens,
      requiredReturnCount,
    );

    return returnDiscovery ?? completeDiscovery(payload);
  }

  validate({
    runtime,
    game,
    commandInput,
  }: SplendorValidationContext<TakeTwoSameGemsPayloadSchema>) {
    return guardedValidate(() => {
      assertGameActive(game);
      const actorId = assertActivePlayer(runtime, commandInput.actorId);
      const payload = readPayload<TakeTwoSameGemsPayload>(commandInput);

      if (!payload.color) {
        return { ok: false, reason: "color_required" };
      }

      if (game.bank[payload.color] < 4) {
        return { ok: false, reason: "not_enough_tokens_for_double_take" };
      }

      const player = game.getPlayer(actorId).clone();
      player.tokens.adjustColor(payload.color, 2);

      if (
        !player.canReturnTokens(
          payload.returnTokens,
          player.getRequiredReturnCount(),
        )
      ) {
        return { ok: false, reason: "invalid_return_tokens" };
      }

      return { ok: true };
    });
  }

  execute({
    game,
    commandInput,
    emitEvent,
  }: SplendorExecuteContext<TakeTwoSameGemsPayloadSchema>) {
    const actorId = commandInput.actorId!;
    const payload = readPayload<TakeTwoSameGemsPayload>(commandInput);
    const player = game.getPlayer(actorId);

    game.bank.adjustColor(payload.color, -2);
    player.tokens.adjustColor(payload.color, 2);
    player.returnTokensTo(game.bank, payload.returnTokens);
    emitEvent({
      category: "domain",
      type: "double_gem_taken",
      payload: {
        actorId,
        color: payload.color,
        returnTokens: payload.returnTokens ?? null,
      },
    });
  }
}

export const takeTwoSameGemsCommand = new TakeTwoSameGemsCommand();
