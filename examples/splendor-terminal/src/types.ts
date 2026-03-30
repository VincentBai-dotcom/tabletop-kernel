import type {
  CommandDiscoveryResult,
  CommandInput,
  GameEvent,
  CanonicalState,
} from "tabletop-engine";
import type {
  SplendorDiscoveryOption,
  SplendorGameState,
} from "splendor-example";

export type SplendorState = CanonicalState<SplendorGameState>;
export type SplendorPayload = Record<string, unknown>;
export type SplendorTerminalCommand = CommandInput<SplendorPayload>;
export type SplendorTerminalDiscoveryOption =
  SplendorDiscoveryOption<SplendorPayload>;
export type SplendorTerminalDiscovery =
  CommandDiscoveryResult<SplendorTerminalDiscoveryOption>;

export interface SessionActivity {
  command: SplendorTerminalCommand | null;
  events: GameEvent[];
  summary: string | null;
  error: string | null;
}

export interface MenuOption<T> {
  label: string;
  value: T;
}
