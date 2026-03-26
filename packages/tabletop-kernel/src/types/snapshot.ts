import type { KernelEvent } from "./event";
import type { CommandInput } from "./command";
import type { CanonicalState } from "./state";

export interface Snapshot<State extends CanonicalState = CanonicalState> {
  version: 1;
  state: State;
}

export interface ReplayRecord<
  State extends CanonicalState = CanonicalState,
  TCommandInput extends CommandInput = CommandInput,
  Ev extends KernelEvent = KernelEvent,
> {
  initialSnapshot: Snapshot<State>;
  commands: TCommandInput[];
  events: Ev[];
  checkpoints: Snapshot<State>[];
}
