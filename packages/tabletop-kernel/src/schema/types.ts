import type { TSchema } from "@sinclair/typebox";
import type { StateClass } from "../state-facade/metadata";

export type StateFieldTargetFactory = () => StateClass;

interface StaticTypeCarrier<TStatic> {
  readonly __static?: TStatic;
}

export interface NumberFieldType<
  TStatic = number,
> extends StaticTypeCarrier<TStatic> {
  kind: "number";
  readonly schema?: TSchema;
}

export interface StringFieldType<
  TStatic = string,
> extends StaticTypeCarrier<TStatic> {
  kind: "string";
  readonly schema?: TSchema;
}

export interface BooleanFieldType<
  TStatic = boolean,
> extends StaticTypeCarrier<TStatic> {
  kind: "boolean";
  readonly schema?: TSchema;
}

export interface NestedStateFieldType {
  kind: "state";
  target: StateFieldTargetFactory;
}

export interface ArrayFieldType<
  TItem extends FieldType = FieldType,
  TStatic = unknown,
> extends StaticTypeCarrier<TStatic> {
  kind: "array";
  item: TItem;
  readonly schema?: TSchema;
}

export interface RecordFieldType<
  TKey extends PrimitiveFieldType = PrimitiveFieldType,
  TValue extends FieldType = FieldType,
  TStatic = unknown,
> extends StaticTypeCarrier<TStatic> {
  kind: "record";
  key: TKey;
  value: TValue;
  readonly schema?: TSchema;
}

export interface ObjectFieldType<
  TProperties extends Record<string, FieldType> = Record<string, FieldType>,
  TStatic = unknown,
> extends StaticTypeCarrier<TStatic> {
  kind: "object";
  properties: TProperties;
  readonly schema?: TSchema;
}

export interface OptionalFieldType<
  TItem extends FieldType = FieldType,
  TStatic = unknown,
> extends StaticTypeCarrier<TStatic> {
  kind: "optional";
  item: TItem;
  readonly schema?: TSchema;
}

export type PrimitiveFieldType =
  | NumberFieldType
  | StringFieldType
  | BooleanFieldType;

export type FieldType =
  | PrimitiveFieldType
  | NestedStateFieldType
  | ArrayFieldType
  | RecordFieldType
  | ObjectFieldType
  | OptionalFieldType;

export type StateFieldMetadata = FieldType;

export type SerializableSchema =
  | PrimitiveFieldType
  | ArrayFieldType
  | RecordFieldType
  | ObjectFieldType
  | OptionalFieldType;

type InferObjectSchema<TProperties extends Record<string, FieldType>> = {
  [K in keyof TProperties as TProperties[K] extends OptionalFieldType
    ? never
    : K]: InferSchema<Extract<TProperties[K], SerializableSchema>>;
} & {
  [K in keyof TProperties as TProperties[K] extends OptionalFieldType
    ? K
    : never]?: TProperties[K] extends OptionalFieldType
    ? InferSchema<Extract<TProperties[K]["item"], SerializableSchema>>
    : never;
};

export type InferSchema<TSchema extends SerializableSchema> =
  TSchema extends StaticTypeCarrier<infer TStatic> ? TStatic : never;

export type ArraySchemaStatic<TItem extends FieldType> = Array<
  InferSchema<Extract<TItem, SerializableSchema>>
>;

export type RecordSchemaStatic<TValue extends FieldType> = Record<
  string,
  InferSchema<Extract<TValue, SerializableSchema>>
>;

export type ObjectSchemaStatic<TProperties extends Record<string, FieldType>> =
  InferObjectSchema<TProperties>;

export type OptionalSchemaStatic<TItem extends FieldType> =
  | InferSchema<Extract<TItem, SerializableSchema>>
  | undefined;
