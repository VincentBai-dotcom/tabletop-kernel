import type {
  ArrayFieldType,
  BooleanFieldType,
  FieldType,
  NestedStateFieldType,
  NumberFieldType,
  PrimitiveFieldType,
  RecordFieldType,
  StateFieldTargetFactory,
  StringFieldType,
} from "./types";

export type {
  ArrayFieldType,
  BooleanFieldType,
  FieldType,
  NestedStateFieldType,
  NumberFieldType,
  PrimitiveFieldType,
  RecordFieldType,
  StateFieldMetadata,
  StateFieldTargetFactory,
  StringFieldType,
} from "./types";

export const t = {
  number(): NumberFieldType {
    return {
      kind: "number",
    };
  },

  string(): StringFieldType {
    return {
      kind: "string",
    };
  },

  boolean(): BooleanFieldType {
    return {
      kind: "boolean",
    };
  },

  state(target: StateFieldTargetFactory): NestedStateFieldType {
    return {
      kind: "state",
      target,
    };
  },

  array(item: FieldType): ArrayFieldType {
    return {
      kind: "array",
      item,
    };
  },

  record(key: PrimitiveFieldType, value: FieldType): RecordFieldType {
    return {
      kind: "record",
      key,
      value,
    };
  },
};
