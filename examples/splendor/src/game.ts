import {
  type AutomaticStageDefinition,
  createStageFactory,
  GameDefinitionBuilder,
  type GameDefinition,
  type SingleActivePlayerStageDefinition,
} from "tabletop-engine";
import { chooseNobleCommand, createCommands } from "./commands/index.ts";
import { createInitialGameState, setupSplendorGame } from "./setup.ts";
import type { SplendorGameState } from "./state.ts";
import { SplendorGameState as SplendorRootState } from "./state.ts";

export interface CreateSplendorGameOptions {
  playerIds: string[];
  seed?: string | number;
}

export function createSplendorGame(
  options: CreateSplendorGameOptions,
): GameDefinition<SplendorGameState, SplendorGameState> {
  const { playerIds, seed } = options;

  if (playerIds.length < 2 || playerIds.length > 4) {
    throw new Error("splendor_requires_2_to_4_players");
  }

  const defineStage = createStageFactory<SplendorGameState>();
  const commands = createCommands();
  const gameEndStage: AutomaticStageDefinition<SplendorGameState> = defineStage(
    "gameEnd",
  )
    .automatic()
    .build();
  const chooseNobleStage = createChooseNobleStage();

  function createChooseNobleStage(): SingleActivePlayerStageDefinition<SplendorGameState> {
    return defineStage("chooseNoble")
      .singleActivePlayer()
      .activePlayer(({ runtime }) => {
        const previousActorId =
          runtime.progression.lastActingStage?.activePlayerId;

        if (!previousActorId) {
          throw new Error("last_acting_player_missing");
        }

        return previousActorId;
      })
      .commands([chooseNobleCommand])
      .nextStages(() => ({
        checkVictoryConditionStage,
      }))
      .transition(({ nextStages }) => {
        return nextStages.checkVictoryConditionStage;
      })
      .build();
  }
  const resolveNobleStage: AutomaticStageDefinition<SplendorGameState> =
    defineStage("resolveNoble")
      .automatic()
      .run(({ game, runtime, emitEvent }) => {
        const actorId = runtime.progression.lastActingStage?.activePlayerId;

        if (!actorId) {
          throw new Error("last_acting_player_missing");
        }

        const player = game.getPlayer(actorId);
        const eligibleNobles = game.getEligibleNobles(player);

        if (eligibleNobles.length !== 1) {
          return;
        }

        const claimedNobleId = game.resolveNobleVisit(player);

        if (claimedNobleId === null) {
          return;
        }

        emitEvent({
          category: "domain",
          type: "noble_claimed",
          payload: {
            actorId,
            nobleId: claimedNobleId,
          },
        });
      })
      .nextStages(() => ({
        chooseNobleStage,
        checkVictoryConditionStage,
      }))
      .transition(({ game, runtime, nextStages }) => {
        const actorId = runtime.progression.lastActingStage?.activePlayerId;

        if (!actorId) {
          throw new Error("last_acting_player_missing");
        }

        const player = game.getPlayer(actorId);
        const eligibleNobles = game.getEligibleNobles(player);

        return eligibleNobles.length > 1
          ? nextStages.chooseNobleStage
          : nextStages.checkVictoryConditionStage;
      })
      .build();
  const checkVictoryConditionStage = createCheckVictoryConditionStage();

  function createCheckVictoryConditionStage(): AutomaticStageDefinition<SplendorGameState> {
    return defineStage("checkVictoryCondition")
      .automatic()
      .run(({ game, runtime, emitEvent }) => {
        const actorId = runtime.progression.lastActingStage?.activePlayerId;

        if (!actorId) {
          throw new Error("last_acting_player_missing");
        }

        game.resolveTurnEnd(actorId, emitEvent);
      })
      .nextStages(() => ({
        gameEndStage,
        playerTurnStage,
      }))
      .transition(({ game, nextStages }) => {
        return game.winnerIds
          ? nextStages.gameEndStage
          : nextStages.playerTurnStage;
      })
      .build();
  }
  const playerTurnStage = createPlayerTurnStage();

  function createPlayerTurnStage(): SingleActivePlayerStageDefinition<SplendorGameState> {
    return defineStage("playerTurn")
      .singleActivePlayer()
      .activePlayer(({ game, runtime }) => {
        const previousActorId =
          runtime.progression.lastActingStage?.activePlayerId;

        return previousActorId
          ? game.getNextPlayerId(previousActorId)
          : game.playerOrder[0]!;
      })
      .commands(commands)
      .nextStages(() => ({
        resolveNobleStage,
        checkVictoryConditionStage,
      }))
      .transition(({ command, nextStages }) => {
        return command.type === "buy_face_up_card" ||
          command.type === "buy_reserved_card"
          ? nextStages.resolveNobleStage
          : nextStages.checkVictoryConditionStage;
      })
      .build();
  }

  return new GameDefinitionBuilder<SplendorGameState>("splendor")
    .rootState(SplendorRootState)
    .rngSeed(seed)
    .initialState(() => createInitialGameState(playerIds))
    .setup(({ game, runtime, rng }) => {
      setupSplendorGame(game, runtime, rng, playerIds);
    })
    .initialStage(playerTurnStage)
    .build();
}
