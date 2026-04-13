export type StateClass<TState extends object = object> = new (
  ...args: unknown[]
) => TState;

import { assertSerializableSchema, t } from "../schema";
import type {
  FieldType,
  SerializableSchema,
  StateFieldMetadata,
} from "../schema";

export { t };

export type VisibilityMode = "hidden" | "visible_to_self";

type StateDataFieldName<TState extends object> = Extract<
  {
    [K in keyof TState]-?: TState[K] extends (...args: never[]) => unknown
      ? never
      : K;
  }[keyof TState],
  string
>;

type StateStringFieldName<TState extends object> = Extract<
  {
    [K in StateDataFieldName<TState>]-?: TState[K] extends string ? K : never;
  }[StateDataFieldName<TState>],
  string
>;

export interface VisibilityDeriveOptions<
  TValue = unknown,
  TState extends object = object,
> {
  summary?: SerializableSchema;
  derive?: (value: TValue, state: Readonly<TState>) => unknown;
}

export interface HiddenFieldConfig<
  TValue = unknown,
  TState extends object = object,
> {
  mode: "hidden";
  summary?: SerializableSchema;
  derive?: (value: TValue, state: Readonly<TState>) => unknown;
}

export interface VisibleToSelfFieldConfig<
  TValue = unknown,
  TState extends object = object,
> {
  mode: "visible_to_self";
  summary?: SerializableSchema;
  derive?: (value: TValue, state: Readonly<TState>) => unknown;
}

export type FieldVisibilityConfig<
  TValue = unknown,
  TState extends object = object,
> =
  | HiddenFieldConfig<TValue, TState>
  | VisibleToSelfFieldConfig<TValue, TState>;

interface VisibilityFieldConfigEntry<
  TFieldName extends string = string,
  TValue = unknown,
  TState extends object = object,
> {
  fieldName: TFieldName;
  visibility: FieldVisibilityConfig<TValue, TState>;
}

type AnyVisibilityFieldConfigEntry<TState extends object> = {
  [K in StateDataFieldName<TState>]: VisibilityFieldConfigEntry<
    K,
    TState[K],
    TState
  >;
}[StateDataFieldName<TState>];

export interface StateMetadata {
  type: "state";
  fields: Record<string, StateFieldMetadata>;
  fieldVisibility: Record<string, FieldVisibilityConfig>;
  ownedByField?: string;
}

interface VisibilityFieldToken<
  TState extends object,
  TFieldName extends StateDataFieldName<TState>,
> {
  fieldName: TFieldName;
  hidden(
    options?: VisibilityDeriveOptions<TState[TFieldName], TState>,
  ): VisibilityFieldConfigEntry<TFieldName, TState[TFieldName], TState>;
  visibleToSelf(
    options?: VisibilityDeriveOptions<TState[TFieldName], TState>,
  ): VisibilityFieldConfigEntry<TFieldName, TState[TFieldName], TState>;
}

export interface VisibilityConfigurationInput<TState extends object = object> {
  ownedBy?: VisibilityFieldToken<TState, StateStringFieldName<TState>>;
  fields?: Array<AnyVisibilityFieldConfigEntry<TState>>;
}

type VisibilityConfigurationBuilder<TState extends object> = {
  field: {
    [K in StateDataFieldName<TState>]: VisibilityFieldToken<TState, K>;
  };
};

const STATE_METADATA = new WeakMap<StateClass, StateMetadata>();

function ensureStateMetadata(target: StateClass): StateMetadata {
  const existing = STATE_METADATA.get(target);

  if (existing) {
    return existing;
  }

  const created: StateMetadata = {
    type: "state",
    fields: {},
    fieldVisibility: {},
    ownedByField: undefined,
  };
  STATE_METADATA.set(target, created);
  return created;
}

function resolveDecoratorTarget(target: object): StateClass {
  return target.constructor as StateClass;
}

function assertVisibilityFieldConfig(config: FieldVisibilityConfig): void {
  if (config.summary) {
    assertSerializableSchema(config.summary);
  }
}

export function State(): ClassDecorator {
  return (target) => {
    ensureStateMetadata(target as unknown as StateClass);
  };
}

export function field(fieldType: FieldType): PropertyDecorator {
  return (target, propertyKey) => {
    const metadata = ensureStateMetadata(resolveDecoratorTarget(target));
    metadata.fields[String(propertyKey)] = fieldType;
  };
}

function createHiddenFieldConfig(
  options: VisibilityDeriveOptions = {},
): HiddenFieldConfig {
  const config: HiddenFieldConfig = {
    mode: "hidden",
    summary: options.summary,
    derive: options.derive,
  };
  assertVisibilityFieldConfig(config);
  return config;
}

function createVisibleToSelfFieldConfig(
  options: VisibilityDeriveOptions = {},
): VisibleToSelfFieldConfig {
  const config: VisibleToSelfFieldConfig = {
    mode: "visible_to_self",
    summary: options.summary,
    derive: options.derive,
  };
  assertVisibilityFieldConfig(config);
  return config;
}

export function configureVisibility<TState extends object>(
  target: StateClass<TState>,
  config: (
    builder: VisibilityConfigurationBuilder<TState>,
  ) => VisibilityConfigurationInput<TState>,
): void {
  const metadata = ensureStateMetadata(target);
  const resolvedConfig = config(createVisibilityConfigurationBuilder<TState>());
  const configuredFieldEntries = resolvedConfig.fields ?? [];
  const fieldVisibility: Record<string, FieldVisibilityConfig> = {};

  for (const entry of configuredFieldEntries) {
    if (fieldVisibility[entry.fieldName]) {
      throw new Error(`duplicate_visibility_field:${entry.fieldName}`);
    }

    // TValue is erased here: the entry was validated as the correct type for
    // its field by AnyVisibilityFieldConfigEntry; the engine calls derive with
    // the matching runtime value.
    fieldVisibility[entry.fieldName] =
      entry.visibility as FieldVisibilityConfig;
  }

  metadata.ownedByField = resolvedConfig.ownedBy?.fieldName;
  metadata.fieldVisibility = fieldVisibility;
}

function createVisibilityConfigurationBuilder<
  TState extends object,
>(): VisibilityConfigurationBuilder<TState> {
  return {
    field: new Proxy(
      {},
      {
        get(_target, property) {
          const fieldName = String(property);

          return {
            fieldName,
            hidden(options?: VisibilityDeriveOptions) {
              return {
                fieldName,
                visibility: createHiddenFieldConfig(options),
              };
            },
            visibleToSelf(options?: VisibilityDeriveOptions) {
              return {
                fieldName,
                visibility: createVisibleToSelfFieldConfig(options),
              };
            },
          };
        },
      },
    ) as VisibilityConfigurationBuilder<TState>["field"],
  };
}

export function getStateMetadata(target: StateClass): StateMetadata {
  const metadata = STATE_METADATA.get(target);

  if (!metadata) {
    throw new Error(`state_metadata_not_found:${target.name || "anonymous"}`);
  }

  return metadata;
}
