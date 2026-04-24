import { t } from "tabletop-engine";
import {
  completeDiscovery,
  createReturnTokenDiscovery,
  SPLENDOR_DISCOVERY_STEPS,
} from "../discovery.ts";
import {
  assertDevelopmentLevel,
  defineSplendorDiscoveryStep,
  guardedAvailability,
  guardedValidate,
  isDevelopmentLevel,
  defineSplendorCommand,
} from "./shared.ts";

const reserveFaceUpCardCommandSchema = t.object({
  level: t.number(),
  cardId: t.number(),
  returnTokens: t.optional(t.record(t.string(), t.number())),
});

export type ReserveFaceUpCardInput =
  typeof reserveFaceUpCardCommandSchema.static;

const selectFaceUpCardDiscoveryInputSchema = t.object({
  selectedLevel: t.optional(t.number()),
  selectedCardId: t.optional(t.number()),
  returnTokens: t.optional(t.record(t.string(), t.number())),
});

const selectFaceUpCardDiscoveryOutputSchema = t.object({
  level: t.number(),
  cardId: t.number(),
  bonusColor: t.string(),
  prestigePoints: t.number(),
  source: t.string(),
});

const selectReturnTokenDiscoveryInputSchema = t.object({
  selectedLevel: t.number(),
  selectedCardId: t.number(),
  returnTokens: t.optional(t.record(t.string(), t.number())),
});

const selectReturnTokenDiscoveryOutputSchema = t.object({
  color: t.string(),
  selectedCount: t.number(),
  requiredReturnCount: t.number(),
});

const reserveFaceUpCardCommand = defineSplendorCommand({
  commandId: "reserve_face_up_card",
  commandSchema: reserveFaceUpCardCommandSchema,
})
  .discoverable(
    defineSplendorDiscoveryStep("select_face_up_card")
      .initial()
      .input(selectFaceUpCardDiscoveryInputSchema)
      .output(selectFaceUpCardDiscoveryOutputSchema)
      .resolve(({ game, discovery }) => {
        const draft = discovery.input;
        const faceUpEntries = Object.entries(game.board.faceUpByLevel) as Array<
          [string, number[]]
        >;

        if (draft.selectedLevel && draft.selectedCardId) {
          return null;
        }

        return faceUpEntries.flatMap(([level, cardIds]) =>
          cardIds.map((cardId: number) => {
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
              nextInput: {
                ...draft,
                selectedLevel: Number(level),
                selectedCardId: cardId,
              },
              nextStep: SPLENDOR_DISCOVERY_STEPS.selectReturnToken,
            };
          }),
        );
      })
      .build(),
    defineSplendorDiscoveryStep("select_return_token")
      .input(selectReturnTokenDiscoveryInputSchema)
      .output(selectReturnTokenDiscoveryOutputSchema)
      .resolve(({ actorId, game, discovery }) => {
        const draft = discovery.input;
        const player = game.getPlayer(actorId).clone();

        if (game.bank.gold > 0) {
          player.tokens.adjustColor("gold", 1);
        }

        const requiredReturnCount = player.getRequiredReturnCount();
        const returnDiscovery = createReturnTokenDiscovery(
          draft,
          player.tokens,
          requiredReturnCount,
        );

        return (
          returnDiscovery ??
          completeDiscovery({
            level: draft.selectedLevel,
            cardId: draft.selectedCardId,
            returnTokens: draft.returnTokens,
          })
        );
      })
      .build(),
  )
  .isAvailable((context) => {
    return guardedAvailability(() => {
      const actorId = context.actorId;
      const game = context.game;
      const player = game.getPlayer(actorId);
      const faceUpPiles = Object.values(game.board.faceUpByLevel) as number[][];

      if (!player.canReserveMoreCards()) {
        return false;
      }

      return faceUpPiles.some((cards) => cards.length > 0);
    });
  })
  .validate(({ game, command }) => {
    return guardedValidate(() => {
      const actorId = command.actorId;
      const input = command.input;
      const player = game.getPlayer(actorId).clone();

      if (!player.canReserveMoreCards()) {
        return { ok: false, reason: "reserved_limit_reached" };
      }

      const level = input.level;

      if (!isDevelopmentLevel(level)) {
        return { ok: false, reason: "invalid_level" };
      }

      if (!game.board.faceUpByLevel[level].includes(input.cardId)) {
        return { ok: false, reason: "card_not_face_up" };
      }

      if (game.bank.gold > 0) {
        player.tokens.adjustColor("gold", 1);
      }

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
    const level = assertDevelopmentLevel(input.level);
    const player = game.getPlayer(actorId);

    player.reserveCard(input.cardId);
    game.board.removeFaceUpCard(level, input.cardId);
    game.board.replenishFaceUpCard(level);

    const receivedGold = player.gainGoldFrom(game.bank);
    player.returnTokensTo(game.bank, input.returnTokens);
    emitEvent({
      category: "domain",
      type: "card_reserved",
      payload: {
        actorId,
        source: "face_up",
        level,
        cardId: input.cardId,
        receivedGold,
        returnTokens: input.returnTokens ?? null,
      },
    });
  })
  .build();

export { reserveFaceUpCardCommand };
