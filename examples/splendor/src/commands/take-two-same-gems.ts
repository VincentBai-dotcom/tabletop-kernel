import type { CommandDefinition } from "tabletop-kernel";
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

export class TakeTwoSameGemsCommand implements CommandDefinition<SplendorGameState> {
  readonly commandId = "take_two_same_gems";

  isAvailable(context: SplendorAvailabilityContext) {
    return guardedAvailability(() => {
      assertAvailableActor(context);
      const game = getSplendorGameFacade(context.game);

      return Object.entries(game.bank).some(
        ([color, count]) => color !== "gold" && count >= 4,
      );
    });
  }

  discover(context: SplendorDiscoveryContext) {
    const actorId = assertAvailableActor(context);
    const game = getSplendorGameFacade(context.game);
    const payload = readPayload<
      Partial<TakeTwoSameGemsPayload> & {
        returnTokens?: ReturnTokensPayload;
      }
    >(context.partialCommand);

    if (!payload.color) {
      return {
        step: SPLENDOR_DISCOVERY_STEPS.selectGemColor,
        options: Object.entries(game.bank)
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

    const player = PlayerOps.clone(game.players[actorId]!);
    player.tokens[payload.color] += 2;
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

  validate({ state, game, commandInput }: SplendorValidationContext) {
    return guardedValidate(() => {
      const splendorGame = getSplendorGameFacade(game);
      assertGameActive(splendorGame);
      const actorId = assertActivePlayer(state, commandInput.actorId);
      const payload = readPayload<TakeTwoSameGemsPayload>(commandInput);

      if (!payload.color) {
        return { ok: false, reason: "color_required" };
      }

      if (splendorGame.bank[payload.color] < 4) {
        return { ok: false, reason: "not_enough_tokens_for_double_take" };
      }

      const player = PlayerOps.clone(splendorGame.players[actorId]!);
      player.tokens[payload.color] += 2;
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
    const payload = readPayload<TakeTwoSameGemsPayload>(commandInput);
    const splendorGame = getSplendorGameFacade(game);
    const player = splendorGame.getPlayer(actorId).state;

    splendorGame.bank.adjustColor(payload.color, -2);
    player.tokens[payload.color] += 2;
    applyReturnTokens(player, splendorGame.bank, payload.returnTokens);
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
