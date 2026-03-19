import type { GameDefinition } from "../game-definition";
import { createExecuteContext, createValidationContext } from "./contexts";
import { createEventCollector } from "./events";
import { cloneCanonicalState } from "./transaction";
import type { Command, CommandDefinition } from "../types/command";
import type { ExecutionFailure, ExecutionResult, ExecutionSuccess } from "../types/result";
import type { CanonicalState, RuntimeState } from "../types/state";
import type { ProgressionSegmentState } from "../types/progression";

type CommandDefinitions<GameState> = Record<
  string,
  CommandDefinition<GameState, RuntimeState, Command>
>;

export interface Kernel<
  GameState extends Record<string, unknown>,
  Commands extends CommandDefinitions<GameState>,
> {
  createInitialState(): CanonicalState<GameState>;
  executeCommand(
    state: CanonicalState<GameState>,
    command: Command,
  ): ExecutionResult<CanonicalState<GameState>>;
}

function createInitialRuntimeState<GameState extends Record<string, unknown>>(
  game: GameDefinition<GameState, CommandDefinitions<GameState>>,
): RuntimeState {
  const segments: Record<string, ProgressionSegmentState> = {};

  for (const [id, segment] of Object.entries(game.progression?.segments ?? {})) {
    segments[id] = {
      ...segment,
      active: game.progression?.initial === id,
    };
  }

  return {
    progression: {
      current: game.progression?.initial ?? null,
      segments,
    },
    rng: {
      seed: game.rngSeed ?? 0,
      cursor: 0,
    },
    history: {
      entries: [],
    },
    pending: {
      choices: [],
    },
  };
}

export function createKernel<
  GameState extends Record<string, unknown>,
  Commands extends CommandDefinitions<GameState>,
>(game: GameDefinition<GameState, Commands>): Kernel<GameState, Commands> {
  return {
    createInitialState() {
      return {
        game: game.initialState(),
        runtime: createInitialRuntimeState(
          game as GameDefinition<GameState, CommandDefinitions<GameState>>,
        ),
      };
    },

    executeCommand(state, command) {
      const definition = game.commands[command.type];

      if (!definition) {
        const failure: ExecutionFailure<CanonicalState<GameState>> = {
          ok: false,
          state,
          reason: "unknown_command",
          metadata: { commandType: command.type },
          events: [],
          pendingChoices: state.runtime.pending.choices,
        };

        return failure;
      }

      const validation = definition.validate(
        createValidationContext(state, command),
      );

      if (!validation.ok) {
        const failure: ExecutionFailure<CanonicalState<GameState>> = {
          ok: false,
          state,
          reason: validation.reason,
          metadata: validation.metadata,
          events: [],
          pendingChoices: state.runtime.pending.choices,
        };

        return failure;
      }

      const workingState = cloneCanonicalState(state);
      const collector = createEventCollector();

      definition.execute(
        createExecuteContext(workingState, command, collector.emit),
      );

      const success: ExecutionSuccess<CanonicalState<GameState>> = {
        ok: true,
        state: workingState,
        events: collector.list(),
        pendingChoices: workingState.runtime.pending.choices,
      };

      return success;
    },
  };
}
