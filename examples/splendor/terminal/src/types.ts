import type {
  Command,
  CommandDiscoveryResult,
  Discovery,
  GameEvent,
  VisibleState,
} from "tabletop-engine";
import type {
  SplendorDiscoveryOption,
  SplendorGeneratedVisibleState,
} from "splendor-example";

export type SplendorVisibleGame = SplendorGeneratedVisibleState["game"];
export type SplendorVisibleState = VisibleState<SplendorVisibleGame>;
export type SplendorVisiblePlayer = SplendorVisibleGame["players"][string];
export type SplendorCommandData = Record<string, unknown>;
export type SplendorTerminalCommand = Command<SplendorCommandData>;
export type SplendorTerminalDiscoveryRequest = Discovery<SplendorCommandData>;
export type SplendorTerminalDiscoveryOption =
  SplendorDiscoveryOption<SplendorCommandData>;
export type SplendorTerminalDiscoveryResult = CommandDiscoveryResult<
  SplendorCommandData,
  SplendorCommandData
>;
export type SplendorTerminalOpenDiscovery = Extract<
  SplendorTerminalDiscoveryResult,
  { complete: false }
>;

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
