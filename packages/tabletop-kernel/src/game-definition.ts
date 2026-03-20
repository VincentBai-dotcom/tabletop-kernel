import type { Command, CommandDefinition } from "./types/command";
import type { ProgressionDefinition } from "./types/progression";
import type { RuntimeState } from "./types/state";
import type { RNGApi } from "./types/rng";

export interface GameSetupContext<
  GameState extends object = object,
> {
  game: GameState;
  runtime: RuntimeState;
  rng: RNGApi;
  playerIds: readonly string[];
}

export interface GameDefinition<
  GameState extends object = object,
  Commands extends Record<string, CommandDefinition<GameState, any, any>> = Record<
    string,
    CommandDefinition<GameState, any, any>
  >,
> {
  name: string;
  initialState: () => GameState;
  commands: Commands;
  progression?: ProgressionDefinition;
  rngSeed?: string | number;
  setup?: (context: GameSetupContext<GameState>) => void;
}

export interface GameDefinitionInput<
  GameState extends object = object,
  Commands extends Record<string, CommandDefinition<GameState, any, any>> = Record<
    string,
    CommandDefinition<GameState, any, any>
  >,
> extends Omit<GameDefinition<GameState, Commands>, "name"> {
  name: string;
}

export function defineGame<
  GameState extends object = object,
  Commands extends Record<string, CommandDefinition<GameState, any, any>> = Record<
    string,
    CommandDefinition<GameState, any, any>
  >,
>(config: GameDefinitionInput<GameState, Commands>): GameDefinition<GameState, Commands> {
  return config;
}
