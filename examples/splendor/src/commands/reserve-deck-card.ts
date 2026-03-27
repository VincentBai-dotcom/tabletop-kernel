import type { CommandDefinition } from "tabletop-kernel";
import {
  completeDiscovery,
  createReturnTokenDiscovery,
  SPLENDOR_DISCOVERY_STEPS,
} from "../discovery.ts";
import type { ReserveDeckCardPayload, SplendorGameState } from "../state.ts";
import { PlayerOps } from "../model/player-ops.ts";
import { applyReturnTokens, validateReturnTokens } from "../model/token-ops.ts";
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

export class ReserveDeckCardCommand implements CommandDefinition<SplendorGameState> {
  readonly commandId = "reserve_deck_card";

  isAvailable(context: SplendorAvailabilityContext) {
    return guardedAvailability(() => {
      const actorId = assertAvailableActor(context);
      const game = getSplendorGameFacade(context.game);
      const player = game.players[actorId]!;

      if (player.reservedCardIds.length >= 3) {
        return false;
      }

      return Object.values(game.board.deckByLevel).some(
        (cards) => cards.length > 0,
      );
    });
  }

  discover(context: SplendorDiscoveryContext) {
    const actorId = assertAvailableActor(context);
    const game = getSplendorGameFacade(context.game);
    const payload = readPayload<Partial<ReserveDeckCardPayload>>(
      context.partialCommand,
    );

    if (!payload.level) {
      return {
        step: SPLENDOR_DISCOVERY_STEPS.selectDeckLevel,
        options: Object.entries(game.board.deckByLevel)
          .filter(([, cardIds]) => cardIds.length > 0)
          .map(([level]) => ({
            id: level,
            value: {
              ...payload,
              level: Number(level),
            },
            metadata: {
              level: Number(level),
              source: "deck",
            },
          })),
      };
    }

    const player = PlayerOps.clone(game.players[actorId]!);

    if (game.bank.gold > 0) {
      player.tokens.gold += 1;
    }

    const requiredReturnCount = Math.max(
      new PlayerOps(player).getTokenCount() - 10,
      0,
    );
    const returnDiscovery = createReturnTokenDiscovery(
      payload,
      player.tokens,
      requiredReturnCount,
    );

    return returnDiscovery ?? completeDiscovery(payload);
  }

  validate({ runtime, game, commandInput }: SplendorValidationContext) {
    return guardedValidate(() => {
      const splendorGame = getSplendorGameFacade(game);
      assertGameActive(splendorGame);
      const actorId = assertActivePlayer(runtime, commandInput.actorId);
      const payload = readPayload<ReserveDeckCardPayload>(commandInput);
      const player = PlayerOps.clone(splendorGame.players[actorId]!);

      if (player.reservedCardIds.length >= 3) {
        return { ok: false, reason: "reserved_limit_reached" };
      }

      if (!payload.level) {
        return { ok: false, reason: "level_required" };
      }

      if (splendorGame.board.deckByLevel[payload.level].length === 0) {
        return { ok: false, reason: "deck_empty" };
      }

      if (splendorGame.bank.gold > 0) {
        player.tokens.gold += 1;
      }

      const requiredReturnCount = Math.max(
        new PlayerOps(player).getTokenCount() - 10,
        0,
      );

      if (
        !validateReturnTokens(player, payload.returnTokens, requiredReturnCount)
      ) {
        return { ok: false, reason: "invalid_return_tokens" };
      }

      return { ok: true };
    });
  }

  execute({ game, commandInput, emitEvent }: SplendorExecuteContext) {
    const actorId = commandInput.actorId!;
    const payload = readPayload<ReserveDeckCardPayload>(commandInput);
    const splendorGame = getSplendorGameFacade(game);
    const player = splendorGame.getPlayer(actorId).state;
    const reservedCardId = splendorGame.board.reserveDeckCard(payload.level);

    player.reservedCardIds.push(reservedCardId);

    const receivedGold = splendorGame.bank.gold > 0;

    if (receivedGold) {
      splendorGame.bank.adjustColor("gold", -1);
      player.tokens.gold += 1;
    }

    applyReturnTokens(player, splendorGame.bank, payload.returnTokens);
    emitEvent({
      category: "domain",
      type: "card_reserved",
      payload: {
        actorId,
        source: "deck",
        level: payload.level,
        cardId: reservedCardId,
        receivedGold,
        returnTokens: payload.returnTokens ?? null,
      },
    });
  }
}

export const reserveDeckCardCommand = new ReserveDeckCardCommand();
