import { discoveryStep, t } from "tabletop-engine";
import { SPLENDOR_DISCOVERY_STEPS } from "../discovery.ts";
import { completeDiscovery, createReturnTokenDiscovery } from "../discovery.ts";
import {
  assertGemTokenColor,
  guardedAvailability,
  guardedValidate,
  isGemTokenColor,
  defineSplendorCommand,
} from "./shared.ts";

const takeTwoSameGemsCommandSchema = t.object({
  color: t.string(),
  returnTokens: t.optional(t.record(t.string(), t.number())),
});

export type TakeTwoSameGemsInput = typeof takeTwoSameGemsCommandSchema.static;

const selectGemColorDiscoveryInputSchema = t.object({
  selectedColor: t.optional(t.string()),
  returnTokens: t.optional(t.record(t.string(), t.number())),
});

const selectGemColorDiscoveryOutputSchema = t.object({
  color: t.string(),
  amount: t.number(),
});

const selectReturnTokenDiscoveryInputSchema = t.object({
  selectedColor: t.string(),
  returnTokens: t.optional(t.record(t.string(), t.number())),
});

const selectReturnTokenDiscoveryOutputSchema = t.object({
  color: t.string(),
  selectedCount: t.number(),
  requiredReturnCount: t.number(),
});

const takeTwoSameGemsCommand = defineSplendorCommand({
  commandId: "take_two_same_gems",
  commandSchema: takeTwoSameGemsCommandSchema,
})
  .discoverable(
    discoveryStep("select_gem_color")
      .initial()
      .input(selectGemColorDiscoveryInputSchema)
      .output(selectGemColorDiscoveryOutputSchema)
      .resolve(({ game, discovery }) => {
        const draft = discovery.input;

        if (draft.selectedColor) {
          return null;
        }

        const bankEntries = Object.entries(game.bank) as Array<
          [string, number]
        >;

        return bankEntries
          .filter(([color, count]) => color !== "gold" && count >= 4)
          .map(([color]) => ({
            id: color,
            output: {
              color,
              amount: 2,
            },
            nextInput: {
              ...draft,
              selectedColor: color,
            },
            nextStep: SPLENDOR_DISCOVERY_STEPS.selectReturnToken,
          }));
      })
      .build(),
    discoveryStep("select_return_token")
      .input(selectReturnTokenDiscoveryInputSchema)
      .output(selectReturnTokenDiscoveryOutputSchema)
      .resolve(({ actorId, game, discovery }) => {
        const draft = discovery.input;
        const player = game.getPlayer(actorId).clone();

        if (!isGemTokenColor(draft.selectedColor)) {
          throw new Error("invalid_color");
        }

        player.tokens.adjustColor(draft.selectedColor, 2);
        const requiredReturnCount = player.getRequiredReturnCount();
        const returnDiscovery = createReturnTokenDiscovery(
          draft,
          player.tokens,
          requiredReturnCount,
        );

        return (
          returnDiscovery ??
          completeDiscovery({
            color: draft.selectedColor,
            returnTokens: draft.returnTokens,
          })
        );
      })
      .build(),
  )
  .isAvailable((context) => {
    return guardedAvailability(() => {
      const game = context.game;
      const bankEntries = Object.entries(game.bank) as Array<[string, number]>;

      return bankEntries.some(
        ([color, count]) => color !== "gold" && count >= 4,
      );
    });
  })
  .validate(({ game, command }) => {
    return guardedValidate(() => {
      const actorId = command.actorId;
      const input = command.input;

      const color = input.color;

      if (!isGemTokenColor(color)) {
        return { ok: false, reason: "invalid_color" };
      }

      if (game.bank[color] < 4) {
        return { ok: false, reason: "not_enough_tokens_for_double_take" };
      }

      const player = game.getPlayer(actorId).clone();
      player.tokens.adjustColor(color, 2);

      if (
        !player.canReturnTokens(
          input.returnTokens,
          player.getRequiredReturnCount(),
        )
      ) {
        return { ok: false, reason: "invalid_return_tokens" };
      }

      return { ok: true };
    });
  })
  .execute(({ game, command, emitEvent }) => {
    const actorId = command.actorId;
    const input = command.input;
    const color = assertGemTokenColor(input.color);
    const player = game.getPlayer(actorId);

    game.bank.adjustColor(color, -2);
    player.tokens.adjustColor(color, 2);
    player.returnTokensTo(game.bank, input.returnTokens);
    emitEvent({
      category: "domain",
      type: "double_gem_taken",
      payload: {
        actorId,
        color,
        returnTokens: input.returnTokens ?? null,
      },
    });
  })
  .build();

export { takeTwoSameGemsCommand };
