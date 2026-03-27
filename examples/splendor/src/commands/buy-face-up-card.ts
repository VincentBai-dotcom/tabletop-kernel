import type { CommandDefinition } from "tabletop-kernel";
import {
  completeDiscovery,
  createNobleDiscovery,
  SPLENDOR_DISCOVERY_STEPS,
} from "../discovery.ts";
import type { BuyFaceUpCardPayload, SplendorGameState } from "../state.ts";
import { PlayerOps } from "../model/player-ops.ts";
import { applyTokenDelta } from "../model/token-ops.ts";
import {
  assertAvailableActor,
  assertActivePlayer,
  assertGameActive,
  guardedAvailability,
  guardedValidate,
  getSplendorGameFacade,
  readPayload,
  type SplendorAvailabilityContext,
  type SplendorDiscoveryContext,
  type SplendorExecuteContext,
  type SplendorValidationContext,
} from "./shared.ts";

export class BuyFaceUpCardCommand implements CommandDefinition<SplendorGameState> {
  readonly commandId = "buy_face_up_card";

  isAvailable(context: SplendorAvailabilityContext) {
    return guardedAvailability(() => {
      const actorId = assertAvailableActor(context);
      const game = getSplendorGameFacade(context.game);
      const player = game.getPlayer(actorId);

      return Object.entries(game.board.faceUpByLevel).some(([level, cardIds]) =>
        cardIds.some((cardId) => {
          const card = game.getCard(cardId);

          return (
            card.level === Number(level) &&
            player.getAffordablePayment(card) !== null
          );
        }),
      );
    });
  }

  discover(context: SplendorDiscoveryContext) {
    const actorId = assertAvailableActor(context);
    const game = getSplendorGameFacade(context.game);
    const payload = readPayload<Partial<BuyFaceUpCardPayload>>(
      context.partialCommand,
    );
    const player = game.getPlayer(actorId);

    if (!payload.level || !payload.cardId) {
      return {
        step: SPLENDOR_DISCOVERY_STEPS.selectFaceUpCard,
        options: Object.entries(game.board.faceUpByLevel).flatMap(
          ([level, cardIds]) =>
            cardIds
              .filter((cardId) => {
                const card = game.getCard(cardId);

                return player.getAffordablePayment(card) !== null;
              })
              .map((cardId) => ({
                id: `${level}:${cardId}`,
                value: {
                  ...payload,
                  level: Number(level),
                  cardId,
                },
                metadata: {
                  level: Number(level),
                  cardId,
                  source: "face_up",
                },
              })),
        ),
      };
    }

    const hypotheticalPlayer = new PlayerOps(PlayerOps.clone(player.state));
    hypotheticalPlayer.buyCard(payload.cardId);
    const eligibleNobles = game.getEligibleNobles(hypotheticalPlayer);
    const nobleDiscovery = createNobleDiscovery(payload, eligibleNobles);

    return nobleDiscovery ?? completeDiscovery(payload);
  }

  validate({ state, game, commandInput }: SplendorValidationContext) {
    return guardedValidate(() => {
      const splendorGame = getSplendorGameFacade(game);
      assertGameActive(splendorGame);
      const actorId = assertActivePlayer(state, commandInput.actorId);
      const payload = readPayload<BuyFaceUpCardPayload>(commandInput);

      if (!payload.cardId || !payload.level) {
        return { ok: false, reason: "level_and_card_required" };
      }

      if (
        !splendorGame.board.faceUpByLevel[payload.level].includes(
          payload.cardId,
        )
      ) {
        return { ok: false, reason: "card_not_face_up" };
      }

      const player = splendorGame.getPlayer(actorId);
      const card = splendorGame.getCard(payload.cardId);

      if (!player.getAffordablePayment(card)) {
        return { ok: false, reason: "card_not_affordable" };
      }

      const hypotheticalPlayer = new PlayerOps(PlayerOps.clone(player.state));
      hypotheticalPlayer.buyCard(payload.cardId);

      const eligibleNobles = splendorGame.getEligibleNobles(hypotheticalPlayer);

      if (eligibleNobles.length > 1 && !payload.chosenNobleId) {
        return { ok: false, reason: "chosen_noble_required" };
      }

      if (
        payload.chosenNobleId &&
        !eligibleNobles.some((noble) => noble.id === payload.chosenNobleId)
      ) {
        return { ok: false, reason: "invalid_chosen_noble" };
      }

      return { ok: true };
    });
  }

  execute({ game, commandInput, emitEvent }: SplendorExecuteContext) {
    const actorId = commandInput.actorId!;
    const payload = readPayload<BuyFaceUpCardPayload>(commandInput);
    const splendorGame = getSplendorGameFacade(game);
    const player = splendorGame.getPlayer(actorId);
    const card = splendorGame.getCard(payload.cardId);
    const payment = player.getAffordablePayment(card);

    if (!payment) {
      throw new Error("card_not_affordable");
    }

    applyTokenDelta(player.state.tokens, payment, -1);
    applyTokenDelta(splendorGame.bank, payment, 1);
    player.buyCard(card.id);
    splendorGame.board.removeFaceUpCard(payload.level, card.id);
    splendorGame.board.replenishFaceUpCard(payload.level);
    emitEvent({
      category: "domain",
      type: "card_purchased",
      payload: {
        actorId,
        source: "face_up",
        level: payload.level,
        cardId: card.id,
        payment,
      },
    });
  }
}

export const buyFaceUpCardCommand = new BuyFaceUpCardCommand();
