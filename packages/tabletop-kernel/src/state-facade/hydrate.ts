import type {
  CompiledStateDefinition,
  CompiledStateFacadeDefinition,
} from "./compile";
import type { StateClass } from "./metadata";

export function hydrateStateFacade<TState extends object>(
  compiled: CompiledStateFacadeDefinition,
  backing: TState,
): TState {
  return hydrateStateInstance(compiled, compiled.root, backing) as TState;
}

function hydrateStateInstance(
  compiled: CompiledStateFacadeDefinition,
  target: StateClass,
  backing: object,
): object {
  const definition = getCompiledStateDefinition(compiled, target);
  const instance = new target();
  const nestedCache = new Map<string, object>();

  for (const [fieldName, field] of Object.entries(definition.fields)) {
    if (field.kind === "scalar") {
      Object.defineProperty(instance, fieldName, {
        enumerable: true,
        configurable: true,
        get() {
          return (backing as Record<string, unknown>)[fieldName];
        },
        set(value: unknown) {
          (backing as Record<string, unknown>)[fieldName] = value;
        },
      });
      continue;
    }

    Object.defineProperty(instance, fieldName, {
      enumerable: true,
      configurable: true,
      get() {
        if (nestedCache.has(fieldName)) {
          return nestedCache.get(fieldName);
        }

        const nestedBacking = (backing as Record<string, unknown>)[fieldName];

        if (
          nestedBacking === null ||
          nestedBacking === undefined ||
          typeof nestedBacking !== "object"
        ) {
          return nestedBacking;
        }

        const nestedFacade = hydrateStateInstance(
          compiled,
          field.target(),
          nestedBacking,
        );
        nestedCache.set(fieldName, nestedFacade);
        return nestedFacade;
      },
      set(value: unknown) {
        nestedCache.delete(fieldName);
        (backing as Record<string, unknown>)[fieldName] = value;
      },
    });
  }

  return instance;
}

function getCompiledStateDefinition(
  compiled: CompiledStateFacadeDefinition,
  target: StateClass,
): CompiledStateDefinition {
  const definition = compiled.states[target.name];

  if (!definition) {
    throw new Error(`compiled_state_not_found:${target.name || "anonymous"}`);
  }

  return definition;
}
