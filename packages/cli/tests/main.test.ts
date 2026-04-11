import { describe, expect, it } from "bun:test";
import { run } from "../src/main.ts";

describe("tabletop-cli", () => {
  it("prints top-level help for --help", async () => {
    const result = await run(["--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("tabletop-cli");
    expect(result.stdout).toContain("generate");
    expect(result.stdout).toContain("validate");
  });

  it("prints generate help for generate --help", async () => {
    const result = await run(["generate", "--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("tabletop-cli generate");
    expect(result.stdout).toContain("types");
    expect(result.stdout).toContain("schemas");
    expect(result.stdout).toContain("protocol");
    expect(result.stdout).toContain("client-sdk");
  });

  it("prints validate help for validate --help", async () => {
    const result = await run(["validate", "--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("tabletop-cli validate");
    expect(result.stdout).toContain("--game");
  });

  it("rejects unknown generate subcommands", async () => {
    const result = await run(["generate", "foo"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("unknown_generate_target:foo");
  });
});
