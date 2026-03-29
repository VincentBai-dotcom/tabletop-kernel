import type { TSchema } from "@sinclair/typebox";
import type { StateClass } from "../state-facade/metadata";

export type StateFieldTargetFactory = () => StateClass;

export interface NumberFieldType {
  kind: "number";
  readonly schema?: TSchema;
}

export interface StringFieldType {
  kind: "string";
  readonly schema?: TSchema;
}

export interface BooleanFieldType {
  kind: "boolean";
  readonly schema?: TSchema;
}

export interface NestedStateFieldType {
  kind: "state";
  target: StateFieldTargetFactory;
}

export interface ArrayFieldType {
  kind: "array";
  item: FieldType;
  readonly schema?: TSchema;
}

export interface RecordFieldType {
  kind: "record";
  key: PrimitiveFieldType;
  value: FieldType;
  readonly schema?: TSchema;
}

export interface ObjectFieldType {
  kind: "object";
  properties: Record<string, FieldType>;
  readonly schema?: TSchema;
}

export interface OptionalFieldType {
  kind: "optional";
  item: FieldType;
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
