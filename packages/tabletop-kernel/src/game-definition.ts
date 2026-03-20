import type { Command, CommandDefinition } from "./types/command";
import type { ProgressionDefinition } from "./types/progression";
import type { RuntimeState } from "./types/state";
import type { RNGApi } from "./types/rng";

type AnyCommandDefinition<GameState extends object> = CommandDefinition<
  GameState,
  RuntimeState,
  Command
>;

export interface GameSetupContext<GameState extends object = object> {
  game: GameState;
  runtime: RuntimeState;
  rng: RNGApi;
  playerIds: readonly string[];
}

export interface GameDefinition<
  GameState extends object = object,
  Commands extends Record<string, AnyCommandDefinition<GameState>> = Record<
    string,
    AnyCommandDefinition<GameState>
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
  Commands extends Record<string, AnyCommandDefinition<GameState>> = Record<
    string,
    AnyCommandDefinition<GameState>
  >,
> extends Omit<GameDefinition<GameState, Commands>, "name"> {
  name: string;
}

export function defineGame<
  GameState extends object = object,
  Commands extends Record<string, AnyCommandDefinition<GameState>> = Record<
    string,
    AnyCommandDefinition<GameState>
  >,
>(
  config: GameDefinitionInput<GameState, Commands>,
): GameDefinition<GameState, Commands> {
  return config;
}
