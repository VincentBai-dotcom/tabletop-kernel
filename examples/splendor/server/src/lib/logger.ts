import pino, { type LoggerOptions } from "pino";

type LogPayload = Record<string, unknown> | Error | string;

export interface AppLogger {
  child(bindings: Record<string, unknown>): AppLogger;
  debug(payload: LogPayload, message?: string): void;
  info(payload: LogPayload, message?: string): void;
  warn(payload: LogPayload, message?: string): void;
  error(payload: LogPayload, message?: string): void;
}

function createLoggerOptions(overrides: LoggerOptions = {}): LoggerOptions {
  return {
    name: "splendor-server",
    level:
      process.env.LOG_LEVEL ??
      (process.env.NODE_ENV === "production" ? "info" : "debug"),
    redact: {
      paths: [
        "playerSessionToken",
        "*.playerSessionToken",
        "token",
        "*.token",
        "authorization",
        "*.authorization",
        "headers.authorization",
        "*.headers.authorization",
      ],
      censor: "[Redacted]",
    },
    ...overrides,
  };
}

export function createAppLogger(overrides: LoggerOptions = {}): AppLogger {
  return pino(createLoggerOptions(overrides));
}

export const rootLogger = createAppLogger();

export function createModuleLogger(moduleName: string): AppLogger {
  return rootLogger.child({ module: moduleName });
}
