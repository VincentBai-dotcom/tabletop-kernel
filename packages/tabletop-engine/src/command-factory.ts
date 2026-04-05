import type {
  CommandAvailabilityContext,
  CommandBuilder,
  CommandBuilderBaseConfig,
  CommandDiscoveryResult,
  CommandSchema,
  DefinedCommand,
  DiscoverableCommandBuilderConfig,
  DiscoveryContext,
  ExecuteContext,
  ValidationContext,
} from "./types/command";
import { commandDefinitionBrand as brand } from "./types/command";

type CommandAccumulator<
  FacadeGameState extends object,
  TCommandInput extends Record<string, unknown>,
  TDiscoveryInput extends Record<string, unknown>,
> = {
  commandId: string;
  commandSchema: CommandSchema<TCommandInput>;
  discoverySchema?: CommandSchema<TDiscoveryInput>;
  discover?(
    context: DiscoveryContext<FacadeGameState, TDiscoveryInput>,
  ): CommandDiscoveryResult<TDiscoveryInput, TCommandInput> | null;
  isAvailable?(context: CommandAvailabilityContext<FacadeGameState>): boolean;
  validate?(
    context: ValidationContext<
      FacadeGameState,
      { type: string; actorId?: string; input?: TCommandInput }
    >,
  ): ReturnType<
    (
      context: ValidationContext<
        FacadeGameState,
        { type: string; actorId?: string; input?: TCommandInput }
      >,
    ) => unknown
  >;
  execute?(
    context: ExecuteContext<
      FacadeGameState,
      { type: string; actorId?: string; input?: TCommandInput }
    >,
  ): void;
};

export interface CommandFactory<FacadeGameState extends object> {
  <TCommandInput extends Record<string, unknown>>(
    config: CommandBuilderBaseConfig<TCommandInput>,
  ): CommandBuilder<FacadeGameState, TCommandInput>;
}

export function createCommandFactory<FacadeGameState extends object>() {
  function createBuilder<
    TCommandInput extends Record<string, unknown>,
    TDiscoveryInput extends Record<string, unknown> = TCommandInput,
    THasDiscovery extends boolean = false,
    THasAvailability extends boolean = false,
    THasValidate extends boolean = false,
    THasExecute extends boolean = false,
  >(
    accumulator: CommandAccumulator<
      FacadeGameState,
      TCommandInput,
      TDiscoveryInput
    >,
  ): CommandBuilder<
    FacadeGameState,
    TCommandInput,
    TDiscoveryInput,
    THasDiscovery,
    THasAvailability,
    THasValidate,
    THasExecute
  > {
    return {
      discoverable<TNextDiscoveryInput extends Record<string, unknown>>(
        config: DiscoverableCommandBuilderConfig<
          FacadeGameState,
          TCommandInput,
          TNextDiscoveryInput
        >,
      ) {
        return createBuilder<
          TCommandInput,
          TNextDiscoveryInput,
          true,
          THasAvailability,
          THasValidate,
          THasExecute
        >({
          ...accumulator,
          discoverySchema: config.discoverySchema,
          discover: config.discover,
        });
      },

      isAvailable(
        isAvailable: (
          context: CommandAvailabilityContext<FacadeGameState>,
        ) => boolean,
      ) {
        return createBuilder<
          TCommandInput,
          TDiscoveryInput,
          THasDiscovery,
          true,
          THasValidate,
          THasExecute
        >({
          ...accumulator,
          isAvailable,
        });
      },

      validate(
        validate: (
          context: ValidationContext<
            FacadeGameState,
            { type: string; actorId?: string; input?: TCommandInput }
          >,
        ) => ReturnType<
          (
            context: ValidationContext<
              FacadeGameState,
              { type: string; actorId?: string; input?: TCommandInput }
            >,
          ) => unknown
        >,
      ) {
        return createBuilder<
          TCommandInput,
          TDiscoveryInput,
          THasDiscovery,
          THasAvailability,
          true,
          THasExecute
        >({
          ...accumulator,
          validate,
        });
      },

      execute(
        execute: (
          context: ExecuteContext<
            FacadeGameState,
            { type: string; actorId?: string; input?: TCommandInput }
          >,
        ) => void,
      ) {
        return createBuilder<
          TCommandInput,
          TDiscoveryInput,
          THasDiscovery,
          THasAvailability,
          THasValidate,
          true
        >({
          ...accumulator,
          execute,
        });
      },

      build() {
        if (!accumulator.validate) {
          throw new Error("command_builder_missing_validate");
        }

        if (!accumulator.execute) {
          throw new Error("command_builder_missing_execute");
        }

        return Object.defineProperty(accumulator, brand, {
          value: true,
          enumerable: false,
          configurable: false,
          writable: false,
        }) as DefinedCommand<FacadeGameState, TCommandInput, TDiscoveryInput>;
      },
    } as CommandBuilder<
      FacadeGameState,
      TCommandInput,
      TDiscoveryInput,
      THasDiscovery,
      THasAvailability,
      THasValidate,
      THasExecute
    >;
  }

  function defineCommand<TCommandInput extends Record<string, unknown>>(
    config: CommandBuilderBaseConfig<TCommandInput>,
  ): CommandBuilder<FacadeGameState, TCommandInput> {
    return createBuilder({
      commandId: config.commandId,
      commandSchema: config.commandSchema,
    });
  }

  return defineCommand as CommandFactory<FacadeGameState>;
}

export type InferCommandInputFromSchema<
  TSchema extends CommandSchema<Record<string, unknown>>,
> = TSchema["static"];
