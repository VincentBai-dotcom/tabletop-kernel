import { developmentCardsById } from "../data/cards.ts";
import type { CardCost, DevelopmentCard } from "../data/types.ts";
import type { GemTokenColor, SplendorPlayerState, TokenCounts } from "../state.ts";
import { cloneTokens, emptyTokens, sumTokens } from "./token-ops.ts";

const TOKEN_COLOR_MAP = {
  White: "white",
  Blue: "blue",
  Green: "green",
  Red: "red",
  Black: "black",
} as const satisfies Record<keyof CardCost, GemTokenColor>;

function getCardOrThrow(cardId: number): DevelopmentCard {
  const card = developmentCardsById[cardId];

  if (!card) {
    throw new Error(`unknown_card:${cardId}`);
  }

  return card;
}

export class PlayerOps {
  constructor(private readonly player: SplendorPlayerState) {}

  static clone(player: SplendorPlayerState): SplendorPlayerState {
    return {
      id: player.id,
      tokens: cloneTokens(player.tokens),
      reservedCardIds: [...player.reservedCardIds],
      purchasedCardIds: [...player.purchasedCardIds],
      nobleIds: [...player.nobleIds],
    };
  }

  get state(): SplendorPlayerState {
    return this.player;
  }

  getDiscounts(): CardCost {
    const discounts: Record<keyof CardCost, number> = {
      White: 0,
      Blue: 0,
      Green: 0,
      Red: 0,
      Black: 0,
    };

    for (const cardId of this.player.purchasedCardIds) {
      const card = getCardOrThrow(cardId);
      discounts[card.bonusColor] += 1;
    }

    return discounts;
  }

  getScore(): number {
    const cardScore = this.player.purchasedCardIds.reduce(
      (total, cardId) => total + getCardOrThrow(cardId).prestigePoints,
      0,
    );

    return cardScore + this.player.nobleIds.length * 3;
  }

  getTokenCount(): number {
    return sumTokens(this.player.tokens);
  }

  getAffordablePayment(card: DevelopmentCard): TokenCounts | null {
    const discounts = this.getDiscounts();
    const spend = emptyTokens();
    let goldNeeded = 0;

    for (const [costColor, tokenColor] of Object.entries(TOKEN_COLOR_MAP)) {
      const colorKey = costColor as keyof CardCost;
      const cost = card.cost[colorKey];
      const discountedCost = Math.max(cost - discounts[colorKey], 0);
      const coloredSpend = Math.min(this.player.tokens[tokenColor], discountedCost);

      spend[tokenColor] = coloredSpend;
      goldNeeded += discountedCost - coloredSpend;
    }

    if (goldNeeded > this.player.tokens.gold) {
      return null;
    }

    spend.gold = goldNeeded;
    return spend;
  }

  canReserveMoreCards(): boolean {
    return this.player.reservedCardIds.length < 3;
  }

  reserveCard(cardId: number): void {
    this.player.reservedCardIds.push(cardId);
  }

  buyCard(cardId: number): void {
    this.player.purchasedCardIds.push(cardId);
  }

  removeReservedCard(cardId: number): void {
    this.player.reservedCardIds = this.player.reservedCardIds.filter(
      (reservedCardId) => reservedCardId !== cardId,
    );
  }

  claimNoble(nobleId: number): void {
    this.player.nobleIds.push(nobleId);
  }
}
