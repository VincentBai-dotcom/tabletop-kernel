import { expect, test } from "bun:test";
import {
  field,
  getStateMetadata,
  State,
  t,
} from "../src/state-facade/metadata";

type ExtendedSchemaApi = typeof t & {
  object: (properties: Record<string, unknown>) => unknown;
  optional: (item: unknown) => unknown;
};

@State()
class ObjectFieldState {
  @field(
    (t as ExtendedSchemaApi).object({
      count: t.number(),
      label: (t as ExtendedSchemaApi).optional(t.string()),
    }) as never,
  )
  summary!: {
    count: number;
    label?: string;
  };
}

test("schema api exposes shared object and optional builders", () => {
  const schemaApi = t as Partial<ExtendedSchemaApi>;

  expect(typeof schemaApi.object).toBe("function");
  expect(typeof schemaApi.optional).toBe("function");
});

test("state metadata can consume object schemas through field decorators", () => {
  const metadata = getStateMetadata(ObjectFieldState);

  expect(metadata.fields.summary).toEqual({
    kind: "object",
    properties: {
      count: {
        kind: "number",
      },
      label: {
        kind: "optional",
        item: {
          kind: "string",
        },
      },
    },
  });
});
