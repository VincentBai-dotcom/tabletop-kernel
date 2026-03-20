import type { RuntimeState, RNGApi } from "tabletop-kernel";
import { developmentCardsByLevel } from "./data/cards.ts";
import { nobleTiles } from "./data/nobles.ts";
import type { SplendorGameState, SplendorPlayerState } from "./state.ts";
import { createBank, emptyTokens } from "./model/token-ops.ts";

export function createPlayer(playerId: string): SplendorPlayerState {
  return {
    id: playerId,
    tokens: emptyTokens(),
    reservedCardIds: [],
    purchasedCardIds: [],
    nobleIds: [],
  };
}

export function createInitialGameState(playerIds: readonly string[]): SplendorGameState {
  return {
    playerOrder: [...playerIds],
    players: Object.fromEntries(
      playerIds.map((playerId) => [playerId, createPlayer(playerId)]),
    ) as Record<string, SplendorPlayerState>,
    bank: emptyTokens(),
    board: {
      faceUpByLevel: {
        1: [],
        2: [],
        3: [],
      },
      deckByLevel: {
        1: [],
        2: [],
        3: [],
      },
      nobleIds: [],
    },
    endGame: null,
    winnerIds: null,
  };
}

export function setupSplendorGame(
  game: SplendorGameState,
  runtime: RuntimeState,
  rng: RNGApi,
  playerIds: readonly string[],
): void {
  game.bank = createBank(playerIds.length);

  for (const level of [1, 2, 3] as const) {
    const deck = [...rng.shuffle(developmentCardsByLevel[level].map((card) => card.id))];
    game.board.faceUpByLevel[level] = deck.splice(0, 4);
    game.board.deckByLevel[level] = deck;
  }

  game.board.nobleIds = [
    ...rng.shuffle(nobleTiles.map((noble) => noble.id)).slice(
      0,
      playerIds.length + 1,
    ),
  ];
  runtime.progression.segments.turn!.ownerId = playerIds[0];
}
