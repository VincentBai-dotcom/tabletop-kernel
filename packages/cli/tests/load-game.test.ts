import { describe, expect, it } from "bun:test";
import { resolve } from "node:path";
import { createGenerationContext } from "../src/lib/generation-context.ts";
import { loadConfig } from "../src/lib/load-config.ts";
import { loadGame } from "../src/lib/load-game.ts";
import { parseCommandArguments } from "../src/lib/parse-args.ts";

const repoRoot = resolve(import.meta.dir, "..", "..", "..");

describe("loadGame", () => {
  it("loads a game from a default export factory", async () => {
    const game = await loadGame({
      gamePath: resolve(import.meta.dir, "fixtures/game-default.ts"),
      cwd: repoRoot,
    });

    expect(game.name).toBe("fixture-default");
  });

  it("loads a game from an explicit named export factory", async () => {
    const game = await loadGame({
      gamePath: resolve(import.meta.dir, "fixtures/game-named.ts"),
      exportName: "createFixtureGame",
      cwd: repoRoot,
    });

    expect(game.name).toBe("fixture-named");
  });

  it("loads a game from a factory with omittable parameters", async () => {
    const game = await loadGame({
      gamePath: resolve(import.meta.dir, "fixtures/game-optional.ts"),
      cwd: repoRoot,
    });

    expect(game.name).toBe("fixture-optional");
  });

  it("loads a game from the splendor example with default cli options", async () => {
    const game = await loadGame({
      gamePath: resolve(repoRoot, "examples/splendor/src/game.ts"),
      exportName: "createSplendorGame",
      cwd: repoRoot,
    });

    expect(game.name).toBe("splendor");
  });

  it("fails when the requested export is not a game", async () => {
    await expect(
      loadGame({
        gamePath: resolve(import.meta.dir, "fixtures/game-invalid.ts"),
        exportName: "notAGame",
        cwd: repoRoot,
      }),
    ).rejects.toThrow("invalid_game_export:notAGame");
  });
});

describe("createGenerationContext", () => {
  it("resolves the output directory from a default config file", async () => {
    const parsed = parseCommandArguments([]);

    const context = await createGenerationContext(parsed, {
      cwd: resolve(import.meta.dir, "fixtures"),
    });

    expect(context.game.name).toBe("fixture-default");
    expect(context.outputDirectory).toBe(
      resolve(import.meta.dir, "fixtures", "generated-from-config"),
    );
  });

  it("resolves the output directory from an explicit config file", async () => {
    const parsed = parseCommandArguments([
      "--config",
      resolve(import.meta.dir, "fixtures", "tabletop.custom.config.ts"),
    ]);

    const context = await createGenerationContext(parsed, {
      cwd: repoRoot,
    });

    expect(context.game.name).toBe("fixture-named");
    expect(context.outputDirectory).toBe(
      resolve(import.meta.dir, "fixtures", "custom-generated"),
    );
  });
});

describe("loadConfig", () => {
  it("loads the default tabletop.config.ts from cwd", async () => {
    const config = await loadConfig({
      cwd: resolve(import.meta.dir, "fixtures"),
    });

    expect(config.game.name).toBe("fixture-default");
  });

  it("loads an explicit config file from --config", async () => {
    const config = await loadConfig({
      cwd: repoRoot,
      configPath: resolve(
        import.meta.dir,
        "fixtures",
        "tabletop.custom.config.ts",
      ),
    });

    expect(config.game.name).toBe("fixture-named");
  });

  it("rejects invalid config files", async () => {
    await expect(
      loadConfig({
        cwd: repoRoot,
        configPath: resolve(
          import.meta.dir,
          "fixtures",
          "tabletop.invalid.config.ts",
        ),
      }),
    ).rejects.toThrow("invalid_cli_config");
  });
});
