import type { RuntimeState } from "tabletop-engine";

export function getLastActingPlayerId(runtime: Readonly<RuntimeState>): string {
  const actorId = runtime.progression.lastActingStage?.activePlayerId;

  if (!actorId) {
    throw new Error("last_acting_player_missing");
  }

  return actorId;
}
