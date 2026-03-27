import { expect, test } from "bun:test";
import {
  field,
  getStateMetadata,
  scalar,
  state,
  State,
  t,
} from "../src/state-facade/metadata";
import { compileStateFacadeDefinition } from "../src/state-facade/compile";
import { hydrateStateFacade } from "../src/state-facade/hydrate";

@State()
class HandState {
  @scalar()
  size!: number;
}

@State()
class PlayerState {
  @scalar()
  health!: number;

  @state(() => HandState)
  hand!: HandState;

  dealDamage(amount: number) {
    this.health -= amount;
  }
}

@State()
class TypedHandState {
  @field(t.number())
  size!: number;
}

@State()
class TypedPlayerState {
  @field(t.number())
  health!: number;

  @field(t.state(() => TypedHandState))
  hand!: TypedHandState;

  @field(t.array(t.string()))
  tags!: string[];
}

test("state decorators capture scalar and nested state metadata", () => {
  const handMetadata = getStateMetadata(HandState);
  const playerMetadata = getStateMetadata(PlayerState);
  const handField = playerMetadata.fields.hand;

  expect(handMetadata.type).toBe("state");
  expect(handMetadata.fields.size?.kind).toBe("scalar");
  expect(playerMetadata.type).toBe("state");
  expect(playerMetadata.fields.health?.kind).toBe("scalar");
  expect(handField?.kind).toBe("state");

  if (!handField || handField.kind !== "state") {
    throw new Error("expected nested state field metadata");
  }

  expect(handField.target()).toBe(HandState);
});

test("field decorator captures composable runtime field type metadata", () => {
  const playerMetadata = getStateMetadata(TypedPlayerState);
  const handMetadata = getStateMetadata(TypedHandState);
  const handField = playerMetadata.fields.hand;
  const tagsField = playerMetadata.fields.tags;

  expect(playerMetadata.type).toBe("state");
  expect(playerMetadata.fields.health?.kind).toBe("number");
  expect(handMetadata.fields.size?.kind).toBe("number");
  expect(handField?.kind).toBe("state");

  if (!handField || handField.kind !== "state") {
    throw new Error("expected nested state runtime field type");
  }

  expect(handField.target()).toBe(TypedHandState);
  expect(tagsField).toEqual({
    kind: "array",
    item: {
      kind: "string",
    },
  });
});

test("mutable state facades allow mutation through state methods but reject direct field writes", () => {
  const compiled = compileStateFacadeDefinition(PlayerState);
  const backing = {
    health: 10,
    hand: {
      size: 3,
    },
  };
  const facade = hydrateStateFacade<PlayerState>(compiled, backing);

  facade.dealDamage(2);

  expect(backing.health).toBe(8);
  expect(() => {
    facade.health = 1;
  }).toThrow("direct_state_mutation_not_allowed:health");
  expect(backing.health).toBe(8);
});
