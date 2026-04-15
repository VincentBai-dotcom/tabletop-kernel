import { Value } from "@sinclair/typebox/value";
import type { TSchema } from "@sinclair/typebox";
import type { GameDefinition } from "../game-definition";
import type { FieldType } from "../schema";
import type { CommandDefinition } from "../types/command";
import type { CanonicalState, RuntimeState } from "../types/state";

type SchemaWithTypeBox = FieldType | TSchema | ({ schema?: TSchema } & object);

function getTypeBoxSchema(schema: SchemaWithTypeBox): TSchema {
  if ("schema" in schema && schema.schema) {
    return schema.schema;
  }

  return schema as TSchema;
}

export function assertSchemaValue(
  schema: SchemaWithTypeBox,
  value: unknown,
): void {
  const typeBoxSchema = getTypeBoxSchema(schema);

  if (Value.Check(typeBoxSchema, value)) {
    return;
  }

  const firstError = Value.Errors(typeBoxSchema, value).First();
  const errorPath = firstError?.path || "/";
  throw new Error(`invalid_schema_value:${errorPath}`);
}

export function validateCanonicalGameState<
  CanonicalGameState extends object,
  FacadeGameState extends object = CanonicalGameState,
  Commands extends Record<string, CommandDefinition<FacadeGameState>> = Record<
    string,
    CommandDefinition<FacadeGameState>
  >,
  SetupInput extends object | undefined = undefined,
>(
  game: GameDefinition<
    CanonicalGameState,
    FacadeGameState,
    Commands,
    SetupInput
  >,
  gameState: CanonicalGameState,
): void {
  assertSchemaValue(game.canonicalGameStateSchema, gameState);
}

export function validateRuntimeState<
  CanonicalGameState extends object,
  FacadeGameState extends object = CanonicalGameState,
  Commands extends Record<string, CommandDefinition<FacadeGameState>> = Record<
    string,
    CommandDefinition<FacadeGameState>
  >,
  SetupInput extends object | undefined = undefined,
>(
  game: GameDefinition<
    CanonicalGameState,
    FacadeGameState,
    Commands,
    SetupInput
  >,
  runtimeState: RuntimeState,
): void {
  assertSchemaValue(game.runtimeStateSchema, runtimeState);
}

export function validateCanonicalState<
  CanonicalGameState extends object,
  FacadeGameState extends object = CanonicalGameState,
  Commands extends Record<string, CommandDefinition<FacadeGameState>> = Record<
    string,
    CommandDefinition<FacadeGameState>
  >,
  SetupInput extends object | undefined = undefined,
>(
  game: GameDefinition<
    CanonicalGameState,
    FacadeGameState,
    Commands,
    SetupInput
  >,
  state: CanonicalState<CanonicalGameState>,
): void {
  validateCanonicalGameState(game, state.game);
  validateRuntimeState(game, state.runtime);
}
