import type { CommandDiscoveryResult } from "tabletop-engine";
import {
  TOKEN_COLORS,
  type ReturnTokensPayload,
  type TokenCountsState,
} from "./state.ts";
import type { NobleTile } from "./data/types.ts";

export const SPLENDOR_DISCOVERY_STEPS = {
  complete: "complete",
  selectFaceUpCard: "select_face_up_card",
  selectDeckLevel: "select_deck_level",
  selectReservedCard: "select_reserved_card",
  selectGemColor: "select_gem_color",
  selectReturnToken: "select_return_token",
  selectNoble: "select_noble",
} as const;

export type SplendorDiscoveryStep =
  (typeof SPLENDOR_DISCOVERY_STEPS)[keyof typeof SPLENDOR_DISCOVERY_STEPS];

export interface SplendorDiscoveryOption<
  TDraft extends Record<string, unknown>,
> {
  id: string;
  nextDraft: TDraft;
  metadata?: Record<string, unknown>;
}

export type SplendorDiscoveryResult<
  TDraft extends Record<string, unknown>,
  TPayload extends Record<string, unknown> = TDraft,
> = CommandDiscoveryResult<TDraft, TPayload>;

export function completeDiscovery<TPayload extends Record<string, unknown>>(
  payload: TPayload,
): SplendorDiscoveryResult<TPayload> {
  return {
    complete: true as const,
    payload,
  };
}

export function createReturnTokenDiscovery<
  TPayload extends {
    returnTokens?: ReturnTokensPayload;
  } & Record<string, unknown>,
>(
  payload: TPayload,
  availableTokens: TokenCountsState,
  requiredReturnCount: number,
): SplendorDiscoveryResult<TPayload> | null {
  const currentReturnTokens = payload.returnTokens ?? {};
  const selectedCount = sumReturnTokens(currentReturnTokens);

  if (selectedCount >= requiredReturnCount) {
    return null;
  }

  return {
    complete: false as const,
    step: SPLENDOR_DISCOVERY_STEPS.selectReturnToken,
    options: TOKEN_COLORS.filter(
      (color) => availableTokens[color] > (currentReturnTokens[color] ?? 0),
    ).map((color) => ({
      id: color,
      nextDraft: {
        ...payload,
        returnTokens: {
          ...currentReturnTokens,
          [color]: (currentReturnTokens[color] ?? 0) + 1,
        },
      },
      metadata: {
        color,
        requiredReturnCount,
        selectedCount,
      },
    })),
    metadata: {
      requiredReturnCount,
      selectedCount,
    },
  };
}

export function createNobleDiscovery<
  TPayload extends {
    chosenNobleId?: number;
  } & Record<string, unknown>,
>(
  payload: TPayload,
  eligibleNobles: readonly NobleTile[],
): SplendorDiscoveryResult<TPayload> | null {
  if (eligibleNobles.length <= 1) {
    return null;
  }

  return {
    complete: false as const,
    step: SPLENDOR_DISCOVERY_STEPS.selectNoble,
    options: eligibleNobles.map((noble) => ({
      id: String(noble.id),
      nextDraft: {
        ...payload,
        chosenNobleId: noble.id,
      },
      metadata: {
        nobleId: noble.id,
        name: noble.name,
      },
    })),
  };
}

function sumReturnTokens(tokens: ReturnTokensPayload): number {
  return TOKEN_COLORS.reduce((total, color) => total + (tokens[color] ?? 0), 0);
}
