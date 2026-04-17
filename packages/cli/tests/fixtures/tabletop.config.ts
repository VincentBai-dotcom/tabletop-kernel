import { defineConfig } from "../../src/config.ts";
import createFixtureGame from "./game-default.ts";

export default defineConfig({
  game: createFixtureGame(),
  outDir: "./generated-from-config",
});
