import type { GameDefinition } from "tabletop-engine";

export interface TabletopCliConfig {
  game: GameDefinition;
  outDir?: string;
}

export function defineConfig(config: TabletopCliConfig): TabletopCliConfig {
  return config;
}
