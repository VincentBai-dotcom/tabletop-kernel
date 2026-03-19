import type { ProgressionState } from "./progression";
import type { RNGState } from "./rng";

export interface HistoryEntry {
  id: string;
  commandType: string;
  actorId?: string;
}

export interface HistoryState {
  entries: HistoryEntry[];
}

export interface PendingChoice {
  id: string;
  type: string;
  actorId?: string;
}

export interface PendingState {
  choices: PendingChoice[];
}

export interface RuntimeState {
  progression: ProgressionState;
  rng: RNGState;
  history: HistoryState;
  pending: PendingState;
}

export interface CanonicalState<
  GameState = Record<string, unknown>,
  Runtime extends RuntimeState = RuntimeState,
> {
  game: GameState;
  runtime: Runtime;
}
