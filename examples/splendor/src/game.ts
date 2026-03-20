import { defineGame } from "tabletop-kernel";
import { createCommands, type SplendorCommandDefinitions } from "./commands/index.ts";
import { createInitialGameState, setupSplendorGame } from "./setup.ts";
import type { SplendorGameState } from "./state.ts";

export interface CreateSplendorGameOptions {
  playerIds: string[];
  seed?: string | number;
}

export function createSplendorGame(options: CreateSplendorGameOptions) {
  const { playerIds, seed } = options;

  if (playerIds.length < 2 || playerIds.length > 4) {
    throw new Error("splendor_requires_2_to_4_players");
  }

  return defineGame<SplendorGameState, SplendorCommandDefinitions>({
    name: "splendor",
    rngSeed: seed,
    progression: {
      initial: "turn",
      segments: {
        turn: {
          id: "turn",
          kind: "turn",
          name: "Turn",
        },
      },
    },
    initialState: () => createInitialGameState(playerIds),
    setup: ({ game, runtime, rng }) => {
      setupSplendorGame(game, runtime, rng, playerIds);
    },
    commands: createCommands(),
  });
}
