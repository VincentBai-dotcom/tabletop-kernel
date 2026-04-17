import { defineConfig } from "./packages/cli/src/config.ts";
import { createSplendorGame } from "./examples/splendor/src/game.ts";

export default defineConfig({
  game: createSplendorGame(),
  outDir: "./examples/splendor/generated",
});
