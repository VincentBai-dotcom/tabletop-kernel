import type { DevelopmentLevel } from "./data/types.ts";
import type { GemTokenColor } from "./states/constants.ts";
import type { ReturnTokensPayload } from "./states/token-counts-state.ts";

export {
  GEM_TOKEN_COLORS,
  TOKEN_COLORS,
  type GemTokenColor,
  type TokenColor,
} from "./states/constants.ts";
export {
  type ReturnTokensPayload,
  TokenCountsState,
} from "./states/token-counts-state.ts";
export { SplendorBoardState } from "./states/board-state.ts";
export { SplendorEndGameState } from "./states/end-game-state.ts";
export { SplendorPlayerState } from "./states/player-state.ts";
export { SplendorGameState } from "./states/game-state.ts";

export interface TakeThreeDistinctGemsPayload {
  colors: [GemTokenColor, GemTokenColor, GemTokenColor];
  returnTokens?: ReturnTokensPayload;
}

export interface TakeTwoSameGemsPayload {
  color: GemTokenColor;
  returnTokens?: ReturnTokensPayload;
}

export interface ReserveFaceUpCardPayload {
  level: DevelopmentLevel;
  cardId: number;
  returnTokens?: ReturnTokensPayload;
}

export interface ReserveDeckCardPayload {
  level: DevelopmentLevel;
  returnTokens?: ReturnTokensPayload;
}

export interface BuyFaceUpCardPayload {
  level: DevelopmentLevel;
  cardId: number;
  chosenNobleId?: number;
}

export interface BuyReservedCardPayload {
  cardId: number;
  chosenNobleId?: number;
}
