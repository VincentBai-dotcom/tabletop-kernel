import type { CommandInput } from "../types/command";
import type { ExecutionResult } from "../types/result";
import type { CanonicalState } from "../types/state";

export interface ScenarioResult<
  State extends CanonicalState = CanonicalState,
  Cmd extends CommandInput = CommandInput,
> {
  initialState: State;
  finalState: State;
  commands: Cmd[];
  results: ExecutionResult<State>[];
}

export function runScenario<
  State extends CanonicalState = CanonicalState,
  Cmd extends CommandInput = CommandInput,
>(
  kernel: {
    createInitialState(): State;
    executeCommand(state: State, command: Cmd): ExecutionResult<State>;
  },
  commands: Cmd[],
): ScenarioResult<State, Cmd> {
  const initialState = kernel.createInitialState();
  let currentState = initialState;
  const results: ExecutionResult<State>[] = [];

  for (const command of commands) {
    const result = kernel.executeCommand(currentState, command);
    results.push(result);
    currentState = result.state;
  }

  return {
    initialState,
    finalState: currentState,
    commands,
    results,
  };
}
