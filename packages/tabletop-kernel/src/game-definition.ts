import type { Command, CommandDefinition } from "./types/command";
import type { ProgressionDefinition } from "./types/progression";

export interface GameDefinition<
  GameState extends Record<string, unknown> = Record<string, unknown>,
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
}

export interface GameDefinitionInput<
  GameState extends Record<string, unknown> = Record<string, unknown>,
  Commands extends Record<string, CommandDefinition<GameState, any, any>> = Record<
    string,
    CommandDefinition<GameState, any, any>
  >,
> extends Omit<GameDefinition<GameState, Commands>, "name"> {
  name: string;
}

export function defineGame<
  GameState extends Record<string, unknown> = Record<string, unknown>,
  Commands extends Record<string, CommandDefinition<GameState, any, any>> = Record<
    string,
    CommandDefinition<GameState, any, any>
  >,
>(config: GameDefinitionInput<GameState, Commands>): GameDefinition<GameState, Commands> {
  return config;
}
