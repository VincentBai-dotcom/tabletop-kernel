import type { DevelopmentLevel } from "./data/types.ts";

export const TOKEN_COLORS = [
  "white",
  "blue",
  "green",
  "red",
  "black",
  "gold",
] as const;

export const GEM_TOKEN_COLORS = TOKEN_COLORS.filter(
  (color) => color !== "gold",
) as readonly GemTokenColor[];

export type TokenColor = (typeof TOKEN_COLORS)[number];
export type GemTokenColor = Exclude<TokenColor, "gold">;

export interface TokenCounts {
  white: number;
  blue: number;
  green: number;
  red: number;
  black: number;
  gold: number;
}

export interface SplendorPlayerState {
  id: string;
  tokens: TokenCounts;
  reservedCardIds: number[];
  purchasedCardIds: number[];
  nobleIds: number[];
}

export interface EndGameState {
  triggeredByPlayerId: string;
  endsAfterPlayerId: string;
}

export interface SplendorGameState {
  playerOrder: string[];
  players: Record<string, SplendorPlayerState>;
  bank: TokenCounts;
  board: {
    faceUpByLevel: Record<DevelopmentLevel, number[]>;
    deckByLevel: Record<DevelopmentLevel, number[]>;
    nobleIds: number[];
  };
  endGame: EndGameState | null;
  winnerIds: string[] | null;
}

export interface ReturnTokensPayload extends Partial<TokenCounts> {}

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
