import type {
  Command,
  Discovery,
  InternalCommandAvailabilityContext,
  InternalDiscoveryContext,
  InternalExecuteContext,
  InternalValidationContext,
} from "../types/command";
import type { GameEvent } from "../types/event";
import type { CanonicalState } from "../types/state";
import type { RNGApi } from "../types/rng";

export function createValidationContext<
  CanonicalGameState extends object,
  FacadeGameState extends object,
  TCommandInput extends Command,
>(
  state: CanonicalState<CanonicalGameState>,
  game: Readonly<FacadeGameState>,
  command: TCommandInput,
): InternalValidationContext<
  CanonicalGameState,
  FacadeGameState,
  TCommandInput
> {
  return {
    state,
    game,
    runtime: state.runtime,
    command,
  };
}

export function createCommandAvailabilityContext<
  CanonicalGameState extends object,
  FacadeGameState extends object,
>(
  state: CanonicalState<CanonicalGameState>,
  game: Readonly<FacadeGameState>,
  commandType: string,
  actorId: string,
): InternalCommandAvailabilityContext<CanonicalGameState, FacadeGameState> {
  return {
    state,
    game,
    runtime: state.runtime,
    commandType,
    actorId,
  };
}

export function createDiscoveryContext<
  CanonicalGameState extends object,
  FacadeGameState extends object,
  TDiscoveryInput extends Record<string, unknown>,
>(
  state: CanonicalState<CanonicalGameState>,
  game: Readonly<FacadeGameState>,
  discovery: Discovery<TDiscoveryInput>,
): InternalDiscoveryContext<
  CanonicalGameState,
  FacadeGameState,
  TDiscoveryInput
> {
  return {
    ...createCommandAvailabilityContext(
      state,
      game,
      discovery.type,
      discovery.actorId,
    ),
    discovery,
    input: discovery.input,
  };
}

export function createExecuteContext<
  CanonicalGameState extends object,
  FacadeGameState extends object,
  TCommandInput extends Command,
>(
  state: CanonicalState<CanonicalGameState>,
  game: FacadeGameState,
  command: TCommandInput,
  rng: RNGApi,
  emitEvent: (event: GameEvent) => void,
): InternalExecuteContext<CanonicalGameState, FacadeGameState, TCommandInput> {
  return {
    state,
    command,
    game,
    runtime: state.runtime,
    rng,
    emitEvent,
  };
}
