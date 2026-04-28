import { describe, expect, it } from "bun:test";
import type { AppLogger } from "../../../lib/logger";
import { createLiveConnectionRegistry } from "../../websocket";
import type { LiveConnection } from "../../websocket";
import { createShutdownService } from "../service";

function createClosableConnection(id: string) {
  const sent: unknown[] = [];
  const closes: Array<{ code?: number; reason?: string }> = [];
  const connection = {
    id,
    send(payload) {
      sent.push(payload);
    },
    close(code, reason) {
      closes.push({ code, reason });
    },
  } satisfies LiveConnection;

  return { closes, connection, sent };
}

function createRecordingLogger() {
  const entries: Array<{
    level: "info" | "error";
    payload: unknown;
    message?: string;
  }> = [];

  const logger: AppLogger = {
    child() {
      return logger;
    },
    debug() {},
    info(payload, message) {
      entries.push({ level: "info", payload, message });
    },
    warn() {},
    error(payload, message) {
      entries.push({ level: "error", payload, message });
    },
  };

  return { entries, logger };
}

describe("createShutdownService", () => {
  it("notifies connections, closes with restart code, stops loops, and stops the server", async () => {
    const registry = createLiveConnectionRegistry();
    const first = createClosableConnection("conn-1");
    const second = createClosableConnection("conn-2");
    const calls: string[] = [];
    const testLogger = createRecordingLogger();
    registry.register("session-1", first.connection);
    registry.register("session-2", second.connection);

    const service = createShutdownService({
      registry,
      heartbeat: {
        stop() {
          calls.push("heartbeat.stop");
        },
      },
      server: {
        async stop() {
          calls.push("server.stop");
        },
      },
      exitProcess(code) {
        calls.push(`process.exit:${code}`);
      },
      reconnectAfterMs: 1_000,
      closeCode: 1012,
      logger: testLogger.logger,
    });

    await service.handleSigterm();

    expect(testLogger.entries).toEqual([
      {
        level: "info",
        payload: { connectionCount: 2 },
        message: "server shutdown started",
      },
      {
        level: "info",
        payload: {},
        message: "server shutdown heartbeat stopped",
      },
      {
        level: "info",
        payload: {
          closeCode: 1012,
          connectionCount: 2,
          reconnectAfterMs: 1_000,
        },
        message: "server shutdown connections closed",
      },
      {
        level: "info",
        payload: {},
        message: "server shutdown listener stopped",
      },
    ]);
    expect(calls).toEqual(["heartbeat.stop", "server.stop", "process.exit:0"]);
    expect(first.sent).toEqual([
      { type: "server_restarting", reconnectAfterMs: 1_000 },
    ]);
    expect(second.sent).toEqual([
      { type: "server_restarting", reconnectAfterMs: 1_000 },
    ]);
    expect(first.closes).toEqual([{ code: 1012, reason: "server_restarting" }]);
    expect(second.closes).toEqual([
      { code: 1012, reason: "server_restarting" },
    ]);
  });

  it("runs shutdown only once when called repeatedly", async () => {
    const registry = createLiveConnectionRegistry();
    const client = createClosableConnection("conn-1");
    const calls: string[] = [];
    const testLogger = createRecordingLogger();
    registry.register("session-1", client.connection);

    const service = createShutdownService({
      registry,
      heartbeat: {
        stop() {
          calls.push("heartbeat.stop");
        },
      },
      server: {
        async stop() {
          calls.push("server.stop");
        },
      },
      exitProcess(code) {
        calls.push(`process.exit:${code}`);
      },
      reconnectAfterMs: 1_000,
      closeCode: 1012,
      logger: testLogger.logger,
    });

    await service.handleSigterm();
    await service.handleSigterm();

    expect(calls).toEqual(["heartbeat.stop", "server.stop", "process.exit:0"]);
    expect(client.closes).toEqual([
      { code: 1012, reason: "server_restarting" },
    ]);
    expect(
      testLogger.entries.filter(
        (entry) => entry.message === "server shutdown started",
      ),
    ).toHaveLength(1);
  });
});
