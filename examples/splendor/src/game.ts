import {
  defineGame,
  type Command,
  type CommandDefinition,
  type KernelEvent,
} from "tabletop-kernel";
import { developmentCardsById, developmentCardsByLevel } from "./data/cards.ts";
import { nobleTiles, nobleTilesById } from "./data/nobles.ts";
import type {
  CardCost,
  DevelopmentCard,
  DevelopmentLevel,
  NobleTile,
} from "./data/types.ts";
import {
  GEM_TOKEN_COLORS,
  TOKEN_COLORS,
  type BuyFaceUpCardPayload,
  type BuyReservedCardPayload,
  type GemTokenColor,
  type ReserveDeckCardPayload,
  type ReserveFaceUpCardPayload,
  type SplendorGameState,
  type SplendorPlayerState,
  type TakeThreeDistinctGemsPayload,
  type TakeTwoSameGemsPayload,
  type TokenColor,
  type TokenCounts,
} from "./state.ts";

export interface CreateSplendorGameOptions {
  playerIds: string[];
  seed?: string | number;
}

type SplendorCommandDefinitions = Record<
  string,
  CommandDefinition<SplendorGameState>
>;

const TOKEN_COLOR_MAP = {
  White: "white",
  Blue: "blue",
  Green: "green",
  Red: "red",
  Black: "black",
} as const satisfies Record<keyof CardCost, GemTokenColor>;

function emptyTokens(): TokenCounts {
  return {
    white: 0,
    blue: 0,
    green: 0,
    red: 0,
    black: 0,
    gold: 0,
  };
}

function cloneTokens(tokens: TokenCounts): TokenCounts {
  return { ...tokens };
}

function clonePlayer(player: SplendorPlayerState): SplendorPlayerState {
  return {
    id: player.id,
    tokens: cloneTokens(player.tokens),
    reservedCardIds: [...player.reservedCardIds],
    purchasedCardIds: [...player.purchasedCardIds],
    nobleIds: [...player.nobleIds],
  };
}

function sumTokens(tokens: Partial<Record<TokenColor, number>>): number {
  return TOKEN_COLORS.reduce((total, color) => total + (tokens[color] ?? 0), 0);
}

function createPlayer(playerId: string): SplendorPlayerState {
  return {
    id: playerId,
    tokens: emptyTokens(),
    reservedCardIds: [],
    purchasedCardIds: [],
    nobleIds: [],
  };
}

function getGemSupplyPerColor(playerCount: number): number {
  switch (playerCount) {
    case 2:
      return 4;
    case 3:
      return 5;
    case 4:
      return 7;
    default:
      throw new Error(`unsupported_player_count:${playerCount}`);
  }
}

function createBank(playerCount: number): TokenCounts {
  const gemSupply = getGemSupplyPerColor(playerCount);

  return {
    white: gemSupply,
    blue: gemSupply,
    green: gemSupply,
    red: gemSupply,
    black: gemSupply,
    gold: 5,
  };
}

function getNextPlayerId(playerOrder: readonly string[], playerId: string): string {
  const index = playerOrder.indexOf(playerId);

  if (index === -1) {
    throw new Error(`unknown_player:${playerId}`);
  }

  return playerOrder[(index + 1) % playerOrder.length]!;
}

function getLastPlayerId(playerOrder: readonly string[]): string {
  const lastPlayerId = playerOrder[playerOrder.length - 1];

  if (!lastPlayerId) {
    throw new Error("player_order_empty");
  }

  return lastPlayerId;
}

function getProgressionOwner(state: {
  runtime: {
    progression: {
      current: string | null;
      segments: Record<string, { ownerId?: string }>;
    };
  };
}): string | undefined {
  const currentSegmentId = state.runtime.progression.current;

  if (!currentSegmentId) {
    return undefined;
  }

  return state.runtime.progression.segments[currentSegmentId]?.ownerId;
}

function assertActivePlayer(
  state: {
    runtime: {
      progression: {
        current: string | null;
        segments: Record<string, { ownerId?: string }>;
      };
    };
  },
  actorId: string | undefined,
): string {
  if (!actorId) {
    throw new Error("actor_id_required");
  }

  const currentOwnerId = getProgressionOwner(state);

  if (!currentOwnerId || actorId !== currentOwnerId) {
    throw new Error("not_active_player");
  }

  return actorId;
}

function assertGameActive(game: SplendorGameState): void {
  if (game.winnerIds) {
    throw new Error("game_finished");
  }
}

function getPlayerOrThrow(
  game: SplendorGameState,
  playerId: string,
): SplendorPlayerState {
  const player = game.players[playerId];

  if (!player) {
    throw new Error(`unknown_player:${playerId}`);
  }

  return player;
}

function getCardOrThrow(cardId: number): DevelopmentCard {
  const card = developmentCardsById[cardId];

  if (!card) {
    throw new Error(`unknown_card:${cardId}`);
  }

  return card;
}

function readPayload<T>(command: Command): T {
  return (command.payload ?? {}) as T;
}

function getCardDiscounts(player: SplendorPlayerState): CardCost {
  const discounts: Record<keyof CardCost, number> = {
    White: 0,
    Blue: 0,
    Green: 0,
    Red: 0,
    Black: 0,
  };

  for (const cardId of player.purchasedCardIds) {
    const card = getCardOrThrow(cardId);
    discounts[card.bonusColor] += 1;
  }

  return discounts;
}

function getPlayerScore(player: SplendorPlayerState): number {
  const cardScore = player.purchasedCardIds.reduce(
    (total, cardId) => total + getCardOrThrow(cardId).prestigePoints,
    0,
  );

  return cardScore + player.nobleIds.length * 3;
}

function getAffordableCardPayment(
  player: SplendorPlayerState,
  card: DevelopmentCard,
): TokenCounts | null {
  const discounts = getCardDiscounts(player);
  const spend = emptyTokens();
  let goldNeeded = 0;

  for (const [costColor, tokenColor] of Object.entries(TOKEN_COLOR_MAP)) {
    const colorKey = costColor as keyof CardCost;
    const cost = card.cost[colorKey];
    const discountedCost = Math.max(cost - discounts[colorKey], 0);
    const coloredSpend = Math.min(player.tokens[tokenColor], discountedCost);

    spend[tokenColor] = coloredSpend;
    goldNeeded += discountedCost - coloredSpend;
  }

  if (goldNeeded > player.tokens.gold) {
    return null;
  }

  spend.gold = goldNeeded;
  return spend;
}

function applyTokenDelta(
  target: TokenCounts,
  delta: Partial<Record<TokenColor, number>>,
  multiplier = 1,
): void {
  for (const color of TOKEN_COLORS) {
    target[color] += (delta[color] ?? 0) * multiplier;
  }
}

function validateReturnTokens(
  player: SplendorPlayerState,
  returnTokens: Partial<TokenCounts> | undefined,
  requiredReturnCount: number,
): boolean {
  const normalizedReturnTokens = returnTokens ?? {};

  if (sumTokens(normalizedReturnTokens) !== requiredReturnCount) {
    return false;
  }

  for (const color of TOKEN_COLORS) {
    const amount = normalizedReturnTokens[color] ?? 0;

    if (!Number.isInteger(amount) || amount < 0 || amount > player.tokens[color]) {
      return false;
    }
  }

  return true;
}

function applyReturnTokens(
  player: SplendorPlayerState,
  bank: TokenCounts,
  returnTokens: Partial<TokenCounts> | undefined,
): void {
  if (!returnTokens) {
    return;
  }

  for (const color of TOKEN_COLORS) {
    const amount = returnTokens[color] ?? 0;
    player.tokens[color] -= amount;
    bank[color] += amount;
  }
}

function replenishFaceUpCard(
  game: SplendorGameState,
  level: DevelopmentLevel,
): void {
  const nextCardId = game.board.deckByLevel[level].shift();

  if (nextCardId !== undefined) {
    game.board.faceUpByLevel[level].push(nextCardId);
  }
}

function getEligibleNobles(
  player: SplendorPlayerState,
  nobleIds: readonly number[],
): NobleTile[] {
  const discounts = getCardDiscounts(player);

  return nobleIds
    .map((nobleId) => nobleTilesById[nobleId])
    .filter((noble): noble is NobleTile => noble !== undefined)
    .filter((noble) =>
      Object.entries(TOKEN_COLOR_MAP).every(([costColor]) => {
        const colorKey = costColor as keyof CardCost;
        return discounts[colorKey] >= noble.requirements[colorKey];
      }),
    );
}

function claimNoble(game: SplendorGameState, player: SplendorPlayerState, noble: NobleTile): void {
  player.nobleIds.push(noble.id);
  game.board.nobleIds = game.board.nobleIds.filter((id) => id !== noble.id);
}

function resolveNobleVisit(
  game: SplendorGameState,
  player: SplendorPlayerState,
  chosenNobleId: number | undefined,
): number | null {
  const eligibleNobles = getEligibleNobles(player, game.board.nobleIds);

  if (eligibleNobles.length === 0) {
    return null;
  }

  if (eligibleNobles.length === 1) {
    const noble = eligibleNobles[0]!;
    claimNoble(game, player, noble);
    return noble.id;
  }

  if (!chosenNobleId) {
    throw new Error("chosen_noble_required");
  }

  const chosenNoble = eligibleNobles.find((noble) => noble.id === chosenNobleId);

  if (!chosenNoble) {
    throw new Error("invalid_chosen_noble");
  }

  claimNoble(game, player, chosenNoble);
  return chosenNoble.id;
}

function finalizeWinners(game: SplendorGameState): void {
  const players = Object.values(game.players);
  const highestScore = Math.max(...players.map(getPlayerScore));
  const highestScorers = players.filter(
    (player) => getPlayerScore(player) === highestScore,
  );
  const fewestPurchasedCards = Math.min(
    ...highestScorers.map((player) => player.purchasedCardIds.length),
  );

  game.winnerIds = highestScorers
    .filter((player) => player.purchasedCardIds.length === fewestPurchasedCards)
    .map((player) => player.id);
}

function finishTurn(
  game: SplendorGameState,
  actorId: string,
  setCurrentSegmentOwner: (ownerId?: string) => void,
  emitEvent: (event: KernelEvent) => void,
  chosenNobleId?: number,
): void {
  const player = getPlayerOrThrow(game, actorId);
  const claimedNobleId = resolveNobleVisit(game, player, chosenNobleId);

  if (claimedNobleId !== null) {
    emitEvent({
      category: "domain",
      type: "noble_claimed",
      payload: {
        actorId,
        nobleId: claimedNobleId,
      },
    });
  }

  if (!game.endGame && getPlayerScore(player) >= 15) {
    game.endGame = {
      triggeredByPlayerId: actorId,
      endsAfterPlayerId: getLastPlayerId(game.playerOrder),
    };

    emitEvent({
      category: "runtime",
      type: "end_game_triggered",
      payload: {
        actorId,
        endsAfterPlayerId: game.endGame.endsAfterPlayerId,
      },
    });
  }

  if (game.endGame && actorId === game.endGame.endsAfterPlayerId) {
    finalizeWinners(game);
    emitEvent({
      category: "runtime",
      type: "game_finished",
      payload: {
        winnerIds: game.winnerIds,
      },
    });
    return;
  }

  setCurrentSegmentOwner(getNextPlayerId(game.playerOrder, actorId));
}

function createCommands(): SplendorCommandDefinitions {
  return {
    take_three_distinct_gems: {
      validate: ({ state, command }) => {
        try {
          assertGameActive(state.game);
          const actorId = assertActivePlayer(state, command.actorId);
          const payload = readPayload<TakeThreeDistinctGemsPayload>(command);

          if (!payload.colors || payload.colors.length !== 3) {
            return { ok: false, reason: "three_colors_required" };
          }

          const uniqueColors = new Set(payload.colors);

          if (uniqueColors.size !== 3) {
            return { ok: false, reason: "colors_must_be_distinct" };
          }

          const player = clonePlayer(getPlayerOrThrow(state.game, actorId));

          for (const color of payload.colors) {
            if (state.game.bank[color] <= 0) {
              return { ok: false, reason: "token_color_unavailable" };
            }

            player.tokens[color] += 1;
          }

          const requiredReturnCount = Math.max(sumTokens(player.tokens) - 10, 0);

          if (!validateReturnTokens(player, payload.returnTokens, requiredReturnCount)) {
            return { ok: false, reason: "invalid_return_tokens" };
          }

          return { ok: true };
        } catch (error) {
          return {
            ok: false,
            reason: error instanceof Error ? error.message : "invalid_command",
          };
        }
      },
      execute: ({ game, command, emitEvent, setCurrentSegmentOwner }) => {
        const actorId = command.actorId!;
        const payload = readPayload<TakeThreeDistinctGemsPayload>(command);
        const player = getPlayerOrThrow(game, actorId);

        for (const color of payload.colors) {
          game.bank[color] -= 1;
          player.tokens[color] += 1;
        }

        applyReturnTokens(player, game.bank, payload.returnTokens);
        emitEvent({
          category: "domain",
          type: "gems_taken",
          payload: {
            actorId,
            colors: payload.colors,
            returnTokens: payload.returnTokens ?? null,
          },
        });
        finishTurn(game, actorId, setCurrentSegmentOwner, emitEvent);
      },
    },

    take_two_same_gems: {
      validate: ({ state, command }) => {
        try {
          assertGameActive(state.game);
          const actorId = assertActivePlayer(state, command.actorId);
          const payload = readPayload<TakeTwoSameGemsPayload>(command);

          if (!payload.color) {
            return { ok: false, reason: "color_required" };
          }

          if (state.game.bank[payload.color] < 4) {
            return { ok: false, reason: "not_enough_tokens_for_double_take" };
          }

          const player = clonePlayer(getPlayerOrThrow(state.game, actorId));
          player.tokens[payload.color] += 2;
          const requiredReturnCount = Math.max(sumTokens(player.tokens) - 10, 0);

          if (!validateReturnTokens(player, payload.returnTokens, requiredReturnCount)) {
            return { ok: false, reason: "invalid_return_tokens" };
          }

          return { ok: true };
        } catch (error) {
          return {
            ok: false,
            reason: error instanceof Error ? error.message : "invalid_command",
          };
        }
      },
      execute: ({ game, command, emitEvent, setCurrentSegmentOwner }) => {
        const actorId = command.actorId!;
        const payload = readPayload<TakeTwoSameGemsPayload>(command);
        const player = getPlayerOrThrow(game, actorId);

        game.bank[payload.color] -= 2;
        player.tokens[payload.color] += 2;
        applyReturnTokens(player, game.bank, payload.returnTokens);
        emitEvent({
          category: "domain",
          type: "double_gem_taken",
          payload: {
            actorId,
            color: payload.color,
            returnTokens: payload.returnTokens ?? null,
          },
        });
        finishTurn(game, actorId, setCurrentSegmentOwner, emitEvent);
      },
    },

    reserve_face_up_card: {
      validate: ({ state, command }) => {
        try {
          assertGameActive(state.game);
          const actorId = assertActivePlayer(state, command.actorId);
          const payload = readPayload<ReserveFaceUpCardPayload>(command);
          const player = clonePlayer(getPlayerOrThrow(state.game, actorId));

          if (player.reservedCardIds.length >= 3) {
            return { ok: false, reason: "reserved_limit_reached" };
          }

          if (!payload.cardId || !payload.level) {
            return { ok: false, reason: "level_and_card_required" };
          }

          if (!state.game.board.faceUpByLevel[payload.level].includes(payload.cardId)) {
            return { ok: false, reason: "card_not_face_up" };
          }

          if (state.game.bank.gold > 0) {
            player.tokens.gold += 1;
          }

          const requiredReturnCount = Math.max(sumTokens(player.tokens) - 10, 0);

          if (!validateReturnTokens(player, payload.returnTokens, requiredReturnCount)) {
            return { ok: false, reason: "invalid_return_tokens" };
          }

          return { ok: true };
        } catch (error) {
          return {
            ok: false,
            reason: error instanceof Error ? error.message : "invalid_command",
          };
        }
      },
      execute: ({ game, command, emitEvent, setCurrentSegmentOwner }) => {
        const actorId = command.actorId!;
        const payload = readPayload<ReserveFaceUpCardPayload>(command);
        const player = getPlayerOrThrow(game, actorId);

        player.reservedCardIds.push(payload.cardId);
        game.board.faceUpByLevel[payload.level] = game.board.faceUpByLevel[
          payload.level
        ].filter((cardId) => cardId !== payload.cardId);
        replenishFaceUpCard(game, payload.level);

        const receivedGold = game.bank.gold > 0;

        if (receivedGold) {
          game.bank.gold -= 1;
          player.tokens.gold += 1;
        }

        applyReturnTokens(player, game.bank, payload.returnTokens);
        emitEvent({
          category: "domain",
          type: "card_reserved",
          payload: {
            actorId,
            source: "face_up",
            level: payload.level,
            cardId: payload.cardId,
            receivedGold,
            returnTokens: payload.returnTokens ?? null,
          },
        });
        finishTurn(game, actorId, setCurrentSegmentOwner, emitEvent);
      },
    },

    reserve_deck_card: {
      validate: ({ state, command }) => {
        try {
          assertGameActive(state.game);
          const actorId = assertActivePlayer(state, command.actorId);
          const payload = readPayload<ReserveDeckCardPayload>(command);
          const player = clonePlayer(getPlayerOrThrow(state.game, actorId));

          if (player.reservedCardIds.length >= 3) {
            return { ok: false, reason: "reserved_limit_reached" };
          }

          if (!payload.level) {
            return { ok: false, reason: "level_required" };
          }

          if (state.game.board.deckByLevel[payload.level].length === 0) {
            return { ok: false, reason: "deck_empty" };
          }

          if (state.game.bank.gold > 0) {
            player.tokens.gold += 1;
          }

          const requiredReturnCount = Math.max(sumTokens(player.tokens) - 10, 0);

          if (!validateReturnTokens(player, payload.returnTokens, requiredReturnCount)) {
            return { ok: false, reason: "invalid_return_tokens" };
          }

          return { ok: true };
        } catch (error) {
          return {
            ok: false,
            reason: error instanceof Error ? error.message : "invalid_command",
          };
        }
      },
      execute: ({ game, command, emitEvent, setCurrentSegmentOwner }) => {
        const actorId = command.actorId!;
        const payload = readPayload<ReserveDeckCardPayload>(command);
        const player = getPlayerOrThrow(game, actorId);
        const reservedCardId = game.board.deckByLevel[payload.level].shift();

        if (reservedCardId === undefined) {
          throw new Error("deck_empty");
        }

        player.reservedCardIds.push(reservedCardId);

        const receivedGold = game.bank.gold > 0;

        if (receivedGold) {
          game.bank.gold -= 1;
          player.tokens.gold += 1;
        }

        applyReturnTokens(player, game.bank, payload.returnTokens);
        emitEvent({
          category: "domain",
          type: "card_reserved",
          payload: {
            actorId,
            source: "deck",
            level: payload.level,
            cardId: reservedCardId,
            receivedGold,
            returnTokens: payload.returnTokens ?? null,
          },
        });
        finishTurn(game, actorId, setCurrentSegmentOwner, emitEvent);
      },
    },

    buy_face_up_card: {
      validate: ({ state, command }) => {
        try {
          assertGameActive(state.game);
          const actorId = assertActivePlayer(state, command.actorId);
          const payload = readPayload<BuyFaceUpCardPayload>(command);

          if (!payload.cardId || !payload.level) {
            return { ok: false, reason: "level_and_card_required" };
          }

          if (!state.game.board.faceUpByLevel[payload.level].includes(payload.cardId)) {
            return { ok: false, reason: "card_not_face_up" };
          }

          const player = getPlayerOrThrow(state.game, actorId);
          const card = getCardOrThrow(payload.cardId);

          if (!getAffordableCardPayment(player, card)) {
            return { ok: false, reason: "card_not_affordable" };
          }

          const hypotheticalPlayer = clonePlayer(player);
          hypotheticalPlayer.purchasedCardIds.push(payload.cardId);

          const eligibleNobles = getEligibleNobles(
            hypotheticalPlayer,
            state.game.board.nobleIds,
          );

          if (eligibleNobles.length > 1 && !payload.chosenNobleId) {
            return { ok: false, reason: "chosen_noble_required" };
          }

          if (
            payload.chosenNobleId &&
            !eligibleNobles.some((noble) => noble.id === payload.chosenNobleId)
          ) {
            return { ok: false, reason: "invalid_chosen_noble" };
          }

          return { ok: true };
        } catch (error) {
          return {
            ok: false,
            reason: error instanceof Error ? error.message : "invalid_command",
          };
        }
      },
      execute: ({ game, command, emitEvent, setCurrentSegmentOwner }) => {
        const actorId = command.actorId!;
        const payload = readPayload<BuyFaceUpCardPayload>(command);
        const player = getPlayerOrThrow(game, actorId);
        const card = getCardOrThrow(payload.cardId);
        const payment = getAffordableCardPayment(player, card);

        if (!payment) {
          throw new Error("card_not_affordable");
        }

        applyTokenDelta(player.tokens, payment, -1);
        applyTokenDelta(game.bank, payment, 1);
        player.purchasedCardIds.push(card.id);
        game.board.faceUpByLevel[payload.level] = game.board.faceUpByLevel[
          payload.level
        ].filter((cardId) => cardId !== card.id);
        replenishFaceUpCard(game, payload.level);
        emitEvent({
          category: "domain",
          type: "card_purchased",
          payload: {
            actorId,
            source: "face_up",
            level: payload.level,
            cardId: card.id,
            payment,
          },
        });
        finishTurn(
          game,
          actorId,
          setCurrentSegmentOwner,
          emitEvent,
          payload.chosenNobleId,
        );
      },
    },

    buy_reserved_card: {
      validate: ({ state, command }) => {
        try {
          assertGameActive(state.game);
          const actorId = assertActivePlayer(state, command.actorId);
          const payload = readPayload<BuyReservedCardPayload>(command);
          const player = getPlayerOrThrow(state.game, actorId);

          if (!payload.cardId) {
            return { ok: false, reason: "card_required" };
          }

          if (!player.reservedCardIds.includes(payload.cardId)) {
            return { ok: false, reason: "card_not_reserved" };
          }

          const card = getCardOrThrow(payload.cardId);

          if (!getAffordableCardPayment(player, card)) {
            return { ok: false, reason: "card_not_affordable" };
          }

          const hypotheticalPlayer = clonePlayer(player);
          hypotheticalPlayer.reservedCardIds = hypotheticalPlayer.reservedCardIds.filter(
            (cardId) => cardId !== payload.cardId,
          );
          hypotheticalPlayer.purchasedCardIds.push(payload.cardId);

          const eligibleNobles = getEligibleNobles(
            hypotheticalPlayer,
            state.game.board.nobleIds,
          );

          if (eligibleNobles.length > 1 && !payload.chosenNobleId) {
            return { ok: false, reason: "chosen_noble_required" };
          }

          if (
            payload.chosenNobleId &&
            !eligibleNobles.some((noble) => noble.id === payload.chosenNobleId)
          ) {
            return { ok: false, reason: "invalid_chosen_noble" };
          }

          return { ok: true };
        } catch (error) {
          return {
            ok: false,
            reason: error instanceof Error ? error.message : "invalid_command",
          };
        }
      },
      execute: ({ game, command, emitEvent, setCurrentSegmentOwner }) => {
        const actorId = command.actorId!;
        const payload = readPayload<BuyReservedCardPayload>(command);
        const player = getPlayerOrThrow(game, actorId);
        const card = getCardOrThrow(payload.cardId);
        const payment = getAffordableCardPayment(player, card);

        if (!payment) {
          throw new Error("card_not_affordable");
        }

        applyTokenDelta(player.tokens, payment, -1);
        applyTokenDelta(game.bank, payment, 1);
        player.reservedCardIds = player.reservedCardIds.filter(
          (cardId) => cardId !== card.id,
        );
        player.purchasedCardIds.push(card.id);
        emitEvent({
          category: "domain",
          type: "card_purchased",
          payload: {
            actorId,
            source: "reserved",
            cardId: card.id,
            payment,
          },
        });
        finishTurn(
          game,
          actorId,
          setCurrentSegmentOwner,
          emitEvent,
          payload.chosenNobleId,
        );
      },
    },
  };
}

export function createSplendorGame(options: CreateSplendorGameOptions) {
  const { playerIds, seed } = options;

  if (playerIds.length < 2 || playerIds.length > 4) {
    throw new Error("splendor_requires_2_to_4_players");
  }

  return defineGame<SplendorGameState, SplendorCommandDefinitions>({
    name: "splendor",
    rngSeed: seed,
    progression: {
      initial: "turn",
      segments: {
        turn: {
          id: "turn",
          kind: "turn",
          name: "Turn",
        },
      },
    },
    initialState: () => ({
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
    }),
    setup: ({ game, runtime, rng }) => {
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
    },
    commands: createCommands(),
  });
}
