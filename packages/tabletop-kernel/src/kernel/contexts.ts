import type {
  Command,
  ExecuteContext,
  ValidationContext,
} from "../types/command";
import type { KernelEvent } from "../types/event";
import type { CanonicalState, RuntimeState } from "../types/state";
import type { RNGApi } from "../types/rng";

export function createValidationContext<
  GameState,
  Runtime extends RuntimeState,
  Cmd extends Command,
>(
  state: CanonicalState<GameState, Runtime>,
  command: Cmd,
): ValidationContext<GameState, Runtime, Cmd> {
  return {
    state,
    command,
  };
}

export function createExecuteContext<
  GameState,
  Runtime extends RuntimeState,
  Cmd extends Command,
>(
  state: CanonicalState<GameState, Runtime>,
  command: Cmd,
  rng: RNGApi,
  emitEvent: (event: KernelEvent) => void,
): ExecuteContext<GameState, Runtime, Cmd> {
  return {
    state,
    command,
    game: state.game,
    runtime: state.runtime,
    rng,
    emitEvent,
  };
}
