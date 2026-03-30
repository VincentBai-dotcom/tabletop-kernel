import type { RuntimeState, RNGApi } from "tabletop-engine";
import { developmentCardsByLevel } from "./data/cards.ts";
import { nobleTiles } from "./data/nobles.ts";
import {
  SplendorGameState,
  SplendorPlayerState,
  TokenCountsState,
} from "./state.ts";

export function createPlayer(playerId: string): SplendorPlayerState {
  return SplendorPlayerState.create(playerId);
}

export function createInitialGameState(
  playerIds: readonly string[],
): SplendorGameState {
  return SplendorGameState.createInitial(playerIds);
}

export function setupSplendorGame(
  game: SplendorGameState,
  runtime: RuntimeState,
  rng: RNGApi,
  playerIds: readonly string[],
): void {
  game.bank = TokenCountsState.createBank(playerIds.length);

  for (const level of [1, 2, 3] as const) {
    const deck = [
      ...rng.shuffle(developmentCardsByLevel[level].map((card) => card.id)),
    ];
    game.board.faceUpByLevel[level] = deck.splice(0, 4);
    game.board.deckByLevel[level] = deck;
  }

  game.board.nobleIds = [
    ...rng
      .shuffle(nobleTiles.map((noble) => noble.id))
      .slice(0, playerIds.length + 1),
  ];
  runtime.progression.segments.turn!.ownerId = playerIds[0];
}
