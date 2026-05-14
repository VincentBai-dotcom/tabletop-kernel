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
import type { CanonicalGameStateShape } from "../state-facade/canonical";

export function createValidationContext<
  FacadeGameState extends object,
  TCommandInput extends Command,
>(
  state: CanonicalState<CanonicalGameStateShape<FacadeGameState>>,
  game: Readonly<FacadeGameState>,
  command: TCommandInput,
): InternalValidationContext<FacadeGameState, TCommandInput> {
  return {
    state,
    game,
    runtime: state.runtime,
    command,
  };
}

export function createCommandAvailabilityContext<
  FacadeGameState extends object,
>(
  state: CanonicalState<CanonicalGameStateShape<FacadeGameState>>,
  game: Readonly<FacadeGameState>,
  commandType: string,
  actorId: string,
): InternalCommandAvailabilityContext<FacadeGameState> {
  return {
    state,
    game,
    runtime: state.runtime,
    commandType,
    actorId,
  };
}

export function createDiscoveryContext<
  FacadeGameState extends object,
  TDiscoveryInput extends Record<string, unknown>,
>(
  state: CanonicalState<CanonicalGameStateShape<FacadeGameState>>,
  game: Readonly<FacadeGameState>,
  discovery: Discovery<TDiscoveryInput>,
): InternalDiscoveryContext<FacadeGameState, TDiscoveryInput> {
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
  FacadeGameState extends object,
  TCommandInput extends Command,
>(
  state: CanonicalState<CanonicalGameStateShape<FacadeGameState>>,
  game: FacadeGameState,
  command: TCommandInput,
  rng: RNGApi,
  emitEvent: (event: GameEvent) => void,
): InternalExecuteContext<FacadeGameState, TCommandInput> {
  return {
    state,
    command,
    game,
    runtime: state.runtime,
    rng,
    emitEvent,
  };
}
