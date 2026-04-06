import type { Command, DefinedCommand } from "./command";
import type { GameEvent } from "./event";
import type { RNGApi } from "./rng";
import type { RuntimeState } from "./state";

export const stageDefinitionBrand = Symbol("tabletop-engine.stage-definition");

type StageDefinitionBrand = {
  readonly [stageDefinitionBrand]: true;
};

export interface CurrentSingleActivePlayerStageState {
  id: string;
  kind: "activePlayer";
  activePlayerId: string;
}

export interface CurrentAutomaticStageState {
  id: string;
  kind: "automatic";
}

export type CurrentStageState =
  | CurrentSingleActivePlayerStageState
  | CurrentAutomaticStageState;

export type StageDefinitionMap<FacadeGameState extends object = object> =
  Record<string, StageDefinition<FacadeGameState>>;

export interface SingleActivePlayerSelectionContext<
  GameState extends object = object,
  Runtime = RuntimeState,
> {
  game: Readonly<GameState>;
  runtime: Readonly<Runtime>;
}

export interface SingleActivePlayerTransitionContext<
  GameState extends object = object,
  Runtime = RuntimeState,
  NextStages extends StageDefinitionMap<GameState> =
    StageDefinitionMap<GameState>,
> {
  game: Readonly<GameState>;
  runtime: Readonly<Runtime>;
  command: Command;
  nextStages: Readonly<NextStages>;
  self: SingleActivePlayerStageDefinition<GameState>;
}

export interface AutomaticStageRunContext<
  GameState extends object = object,
  Runtime = RuntimeState,
> {
  game: GameState;
  runtime: Readonly<Runtime>;
  rng: RNGApi;
  emitEvent(event: GameEvent): void;
}

export interface AutomaticStageTransitionContext<
  GameState extends object = object,
  Runtime = RuntimeState,
  NextStages extends StageDefinitionMap<GameState> =
    StageDefinitionMap<GameState>,
> {
  game: Readonly<GameState>;
  runtime: Readonly<Runtime>;
  nextStages: Readonly<NextStages>;
  self: AutomaticStageDefinition<GameState>;
}

export interface SingleActivePlayerStageDefinition<
  GameState extends object = object,
  Runtime = RuntimeState,
  NextStages extends StageDefinitionMap<GameState> =
    StageDefinitionMap<GameState>,
> extends StageDefinitionBrand {
  id: string;
  kind: "activePlayer";
  activePlayer(
    context: SingleActivePlayerSelectionContext<GameState, Runtime>,
  ): string;
  commands: readonly DefinedCommand<GameState>[];
  nextStages?: NextStages;
  transition(
    context: SingleActivePlayerTransitionContext<
      GameState,
      Runtime,
      NextStages
    >,
  ):
    | SingleActivePlayerStageDefinition<GameState>
    | NextStages[keyof NextStages];
}

export interface AutomaticStageDefinition<
  GameState extends object = object,
  Runtime = RuntimeState,
  NextStages extends StageDefinitionMap<GameState> =
    StageDefinitionMap<GameState>,
> extends StageDefinitionBrand {
  id: string;
  kind: "automatic";
  run?(context: AutomaticStageRunContext<GameState, Runtime>): void;
  nextStages?: NextStages;
  transition?(
    context: AutomaticStageTransitionContext<GameState, Runtime, NextStages>,
  ): AutomaticStageDefinition<GameState> | NextStages[keyof NextStages];
}

export type StageDefinition<GameState extends object = object> =
  | SingleActivePlayerStageDefinition<GameState>
  | AutomaticStageDefinition<GameState>;

export type BuiltInProgressionCompletionPolicy =
  | "after_successful_command"
  | "manual_only";

export interface ProgressionSegmentState {
  id: string;
  kind?: string;
  parentId?: string;
  childIds: string[];
  active: boolean;
  ownerId?: string;
}

export interface ProgressionState {
  currentStage: CurrentStageState;
  current: string | null;
  rootId: string | null;
  segments: Record<string, ProgressionSegmentState>;
}

export interface ProgressionNavigation {
  byId(segmentId: string): Readonly<ProgressionSegmentState> | undefined;
  current(): Readonly<ProgressionSegmentState> | undefined;
  parent(segmentId?: string): Readonly<ProgressionSegmentState> | undefined;
  activePath(): readonly Readonly<ProgressionSegmentState>[];
}

interface ProgressionExecutionState<
  GameState extends object = object,
  Runtime = unknown,
> {
  game: GameState;
  runtime: Runtime;
}

export interface InternalProgressionCompletionContext<
  CanonicalGameState extends object = object,
  FacadeGameState extends object = CanonicalGameState,
  Runtime = unknown,
  TCommandInput extends Command = Command,
> {
  state: Readonly<ProgressionExecutionState<CanonicalGameState, Runtime>>;
  game: Readonly<FacadeGameState>;
  runtime: Readonly<Runtime>;
  command: TCommandInput;
  segment: Readonly<ProgressionSegmentState>;
  progression: ProgressionNavigation;
}

export interface ProgressionCompletionContext<
  FacadeGameState extends object = object,
  Runtime = unknown,
  TCommandInput extends Command = Command,
> {
  game: Readonly<FacadeGameState>;
  runtime: Readonly<Runtime>;
  command: TCommandInput;
  segment: Readonly<ProgressionSegmentState>;
  progression: ProgressionNavigation;
}

export interface InternalProgressionLifecycleHookContext<
  CanonicalGameState extends object = object,
  FacadeGameState extends object = CanonicalGameState,
  Runtime = unknown,
  TCommandInput extends Command = Command,
> extends InternalProgressionCompletionContext<
  CanonicalGameState,
  FacadeGameState,
  Runtime,
  TCommandInput
> {
  game: FacadeGameState;
  rng: RNGApi;
  emitEvent(event: GameEvent): void;
}

export interface ProgressionLifecycleHookContext<
  FacadeGameState extends object = object,
  Runtime = unknown,
  TCommandInput extends Command = Command,
> extends ProgressionCompletionContext<
  FacadeGameState,
  Runtime,
  TCommandInput
> {
  game: FacadeGameState;
  rng: RNGApi;
  emitEvent(event: GameEvent): void;
}

export type ProgressionCompletionCallback<
  GameState extends object = object,
  Runtime = unknown,
  TCommandInput extends Command = Command,
> = (
  context: ProgressionCompletionContext<GameState, Runtime, TCommandInput>,
) => boolean;

export type ProgressionCompletionPolicy<
  GameState extends object = object,
  Runtime = unknown,
  TCommandInput extends Command = Command,
> =
  | BuiltInProgressionCompletionPolicy
  | ProgressionCompletionCallback<GameState, Runtime, TCommandInput>;

export interface ProgressionResolveNextResult {
  nextSegmentId?: string | null;
  ownerId?: string;
}

export type ProgressionResolveNext<
  GameState extends object = object,
  Runtime = unknown,
  TCommandInput extends Command = Command,
> = (
  context: ProgressionLifecycleHookContext<GameState, Runtime, TCommandInput>,
) => ProgressionResolveNextResult | void;

export type ProgressionLifecycleHook<
  GameState extends object = object,
  Runtime = unknown,
  TCommandInput extends Command = Command,
> = (
  context: ProgressionLifecycleHookContext<GameState, Runtime, TCommandInput>,
) => void;

export interface ProgressionSegmentDefinition<
  GameState extends object = object,
  Runtime = unknown,
  TCommandInput extends Command = Command,
> {
  id: string;
  children: ProgressionSegmentDefinition<GameState, Runtime, TCommandInput>[];
  kind?: string;
  completionPolicy?: ProgressionCompletionPolicy<
    GameState,
    Runtime,
    TCommandInput
  >;
  onEnter?: ProgressionLifecycleHook<GameState, Runtime, TCommandInput>;
  onExit?: ProgressionLifecycleHook<GameState, Runtime, TCommandInput>;
  resolveNext?: ProgressionResolveNext<GameState, Runtime, TCommandInput>;
}

export interface ProgressionDefinition<
  GameState extends object = object,
  Runtime = unknown,
  TCommandInput extends Command = Command,
> {
  root: ProgressionSegmentDefinition<GameState, Runtime, TCommandInput>;
}
