import type { StateClass } from "../state-facade/metadata";

export type StateFieldTargetFactory = () => StateClass;

export interface NumberFieldType {
  kind: "number";
}

export interface StringFieldType {
  kind: "string";
}

export interface BooleanFieldType {
  kind: "boolean";
}

export interface NestedStateFieldType {
  kind: "state";
  target: StateFieldTargetFactory;
}

export interface ArrayFieldType {
  kind: "array";
  item: FieldType;
}

export interface RecordFieldType {
  kind: "record";
  key: PrimitiveFieldType;
  value: FieldType;
}

export type PrimitiveFieldType =
  | NumberFieldType
  | StringFieldType
  | BooleanFieldType;

export type FieldType =
  | PrimitiveFieldType
  | NestedStateFieldType
  | ArrayFieldType
  | RecordFieldType;

export type StateFieldMetadata = FieldType;
