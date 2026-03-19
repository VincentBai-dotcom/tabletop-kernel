import type { KernelEvent } from "./event";
import type { Command } from "./command";
import type { CanonicalState } from "./state";

export interface Snapshot<State extends CanonicalState = CanonicalState> {
  version: 1;
  state: State;
}

export interface ReplayRecord<
  State extends CanonicalState = CanonicalState,
  Cmd extends Command = Command,
  Ev extends KernelEvent = KernelEvent,
> {
  initialSnapshot: Snapshot<State>;
  commands: Cmd[];
  events: Ev[];
  checkpoints: Snapshot<State>[];
}
