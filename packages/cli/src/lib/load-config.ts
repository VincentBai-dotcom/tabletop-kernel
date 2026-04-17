import type { GameDefinition } from "tabletop-engine";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { TabletopCliConfig } from "../config.ts";

interface LoadConfigOptions {
  cwd: string;
  configPath?: string;
}

export interface LoadedCliConfig extends TabletopCliConfig {
  configFilePath: string;
  configDirectory: string;
}

export async function loadConfig(
  options: LoadConfigOptions,
): Promise<LoadedCliConfig> {
  const configFilePath = options.configPath
    ? resolve(options.cwd, options.configPath)
    : resolve(options.cwd, "tabletop.config.ts");
  const module = (await import(pathToFileURL(configFilePath).href)) as {
    default?: unknown;
  };
  const config = module.default;

  if (!isCliConfig(config)) {
    throw new Error("invalid_cli_config");
  }

  return {
    ...config,
    configFilePath,
    configDirectory: dirname(configFilePath),
  };
}

function isCliConfig(value: unknown): value is TabletopCliConfig {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (!("game" in value) || !isGameDefinition(value.game)) {
    return false;
  }

  return (
    !("outDir" in value) ||
    value.outDir === undefined ||
    typeof value.outDir === "string"
  );
}

function isGameDefinition(value: unknown): value is GameDefinition {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "name" in value &&
    "commands" in value &&
    "canonicalGameStateSchema" in value &&
    "runtimeStateSchema" in value
  );
}
