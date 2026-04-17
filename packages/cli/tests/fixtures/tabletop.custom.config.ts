import { defineConfig } from "../../src/config.ts";
import { createFixtureGame } from "./game-named.ts";

export default defineConfig({
  game: createFixtureGame(),
  outDir: "./custom-generated",
});
