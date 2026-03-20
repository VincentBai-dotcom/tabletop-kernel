import type { CommandDefinition } from "tabletop-kernel";
import type { SplendorGameState } from "../state.ts";
import { buyFaceUpCardCommand } from "./buy-face-up-card.ts";
import { buyReservedCardCommand } from "./buy-reserved-card.ts";
import { reserveDeckCardCommand } from "./reserve-deck-card.ts";
import { reserveFaceUpCardCommand } from "./reserve-face-up-card.ts";
import { takeThreeDistinctGemsCommand } from "./take-three-distinct-gems.ts";
import { takeTwoSameGemsCommand } from "./take-two-same-gems.ts";

export type SplendorCommandDefinitions = Record<
  string,
  CommandDefinition<SplendorGameState>
>;

export function createCommands(): SplendorCommandDefinitions {
  return {
    take_three_distinct_gems: takeThreeDistinctGemsCommand,
    take_two_same_gems: takeTwoSameGemsCommand,
    reserve_face_up_card: reserveFaceUpCardCommand,
    reserve_deck_card: reserveDeckCardCommand,
    buy_face_up_card: buyFaceUpCardCommand,
    buy_reserved_card: buyReservedCardCommand,
  };
}
