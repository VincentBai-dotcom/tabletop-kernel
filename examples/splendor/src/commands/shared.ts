import type {
  CommandAvailabilityContext,
  CommandInput,
  CommandInputFromSchema,
  DiscoveryContext,
  ExecuteContext,
  ObjectFieldType,
  ValidationContext,
  ValidationOutcome,
} from "tabletop-engine";
import type { SplendorGameState } from "../state.ts";

type ProgressionRuntime = {
  progression: {
    current: string | null;
    segments: Record<string, { ownerId?: string }>;
  };
};

export type SplendorAvailabilityContext =
  CommandAvailabilityContext<SplendorGameState>;

export type SplendorDiscoveryContext<
  TPayloadSchema extends ObjectFieldType | never = never,
> = DiscoveryContext<SplendorGameState, CommandInputFromSchema<TPayloadSchema>>;

export type SplendorValidationContext<
  TPayloadSchema extends ObjectFieldType | never = never,
> = ValidationContext<
  SplendorGameState,
  CommandInputFromSchema<TPayloadSchema>
>;

export type SplendorExecuteContext<
  TPayloadSchema extends ObjectFieldType | never = never,
> = ExecuteContext<SplendorGameState, CommandInputFromSchema<TPayloadSchema>>;

export function readPayload<T>(commandInput: CommandInput): T {
  return (commandInput.payload ?? {}) as T;
}

export function guardedValidate(
  run: () => ValidationOutcome,
): ValidationOutcome {
  try {
    return run();
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "invalid_command",
    };
  }
}

export function guardedAvailability(run: () => boolean): boolean {
  try {
    return run();
  } catch {
    return false;
  }
}

export function assertGameActive(game: Readonly<SplendorGameState>): void {
  if (game.winnerIds) {
    throw new Error("game_finished");
  }
}

export function assertActivePlayer(
  runtime: ProgressionRuntime,
  actorId: string | undefined,
): string {
  if (!actorId) {
    throw new Error("actor_id_required");
  }

  const currentSegmentId = runtime.progression.current;

  if (!currentSegmentId) {
    throw new Error("no_active_segment");
  }

  const currentOwnerId =
    runtime.progression.segments[currentSegmentId]?.ownerId;

  if (!currentOwnerId || actorId !== currentOwnerId) {
    throw new Error("not_active_player");
  }

  return actorId;
}

export function assertAvailableActor(
  context: CommandAvailabilityContext<SplendorGameState>,
): string {
  assertGameActive(context.game);
  return assertActivePlayer(context.runtime, context.actorId);
}
