import type { CommandInput } from "../types/command";
import type { KernelEvent } from "../types/event";
import type { ExecutionResult } from "../types/result";
import type { CanonicalState } from "../types/state";
import type { ReplayRecord, Snapshot } from "../types/snapshot";
import { restoreSnapshot } from "../snapshot/snapshot";

export function createReplayRecord<
  State extends CanonicalState = CanonicalState,
  TCommandInput extends CommandInput = CommandInput,
  Ev extends KernelEvent = KernelEvent,
>(initialSnapshot: Snapshot<State>): ReplayRecord<State, TCommandInput, Ev> {
  return {
    initialSnapshot,
    commands: [],
    events: [],
    checkpoints: [],
  };
}

export function appendReplayStep<
  State extends CanonicalState = CanonicalState,
  TCommandInput extends CommandInput = CommandInput,
  Ev extends KernelEvent = KernelEvent,
>(
  record: ReplayRecord<State, TCommandInput, Ev>,
  command: TCommandInput,
  result: ExecutionResult<State>,
): ReplayRecord<State, TCommandInput, Ev> {
  return {
    ...record,
    commands: [...record.commands, command],
    events: [...record.events, ...(result.events as Ev[])],
  };
}

export function replayRecord<
  State extends CanonicalState = CanonicalState,
  TCommandInput extends CommandInput = CommandInput,
>(
  kernel: {
    executeCommand(
      state: State,
      command: TCommandInput,
    ): ExecutionResult<State>;
  },
  record: ReplayRecord<State, TCommandInput>,
): State {
  let state = restoreSnapshot(record.initialSnapshot);

  for (const command of record.commands) {
    state = kernel.executeCommand(state, command).state;
  }

  return state;
}
