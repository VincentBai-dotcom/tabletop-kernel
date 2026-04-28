import { describe, expect, it } from "bun:test";
import type { LivePresenceService } from "../../live-presence";
import type { PlayerSessionService } from "../../player-session";
import type { AppLogger } from "../../../lib/logger";
import { createLiveConnectionRegistry } from "../registry";
import {
  handleLiveConnectionClosed,
  handleLiveConnectionOpened,
} from "../routes";

function createRecordingLogger() {
  const entries: Array<{
    level: "debug" | "info" | "warn" | "error";
    bindings: Record<string, unknown>;
    payload: unknown;
    message?: string;
  }> = [];

  function createLogger(bindings: Record<string, unknown> = {}): AppLogger {
    return {
      child(nextBindings) {
        return createLogger({ ...bindings, ...nextBindings });
      },
      debug(payload, message) {
        entries.push({ level: "debug", bindings, payload, message });
      },
      info(payload, message) {
        entries.push({ level: "info", bindings, payload, message });
      },
      warn(payload, message) {
        entries.push({ level: "warn", bindings, payload, message });
      },
      error(payload, message) {
        entries.push({ level: "error", bindings, payload, message });
      },
    };
  }

  return {
    entries,
    logger: createLogger(),
  };
}

describe("websocket route lifecycle", () => {
  it("registers the live connection and logs the resolved session", async () => {
    const registry = createLiveConnectionRegistry();
    const sent: unknown[] = [];
    const logger = createRecordingLogger();
    const playerSessionService = {
      async resolveOrCreatePlayerSession() {
        return {
          playerSessionId: "session-1",
          token: "known:session-token",
          tokenWasCreated: false,
        };
      },
    } satisfies PlayerSessionService;

    await handleLiveConnectionOpened({
      registry,
      playerSessionService,
      logger: logger.logger,
      connection: {
        id: "conn-1",
        send(payload) {
          sent.push(payload);
        },
      },
      playerSessionToken: "known:session-token",
    });

    expect(registry.getPlayerSessionIdByConnectionId("conn-1")).toBe(
      "session-1",
    );
    expect(sent).toEqual([
      {
        type: "session_resolved",
        playerSessionToken: "known:session-token",
      },
    ]);
    expect(logger.entries).toEqual([
      {
        level: "debug",
        bindings: { connectionId: "conn-1" },
        payload: { hasPlayerSessionToken: true },
        message: "live connection opened",
      },
      {
        level: "info",
        bindings: { connectionId: "conn-1" },
        payload: {
          playerSessionId: "session-1",
          tokenWasCreated: false,
        },
        message: "live connection registered",
      },
    ]);
  });

  it("marks the removed subscription disconnected when a live connection closes", async () => {
    const registry = createLiveConnectionRegistry();
    const calls: unknown[] = [];
    const livePresenceService = {
      async handleClosedSubscription(input) {
        calls.push(input);
      },
      async handleRoomSubscribed() {
        throw new Error("not used");
      },
      async handleGameSubscribed() {
        throw new Error("not used");
      },
    } satisfies LivePresenceService;

    registry.register("session-1", { id: "conn-1", send() {} });
    registry.subscribeToRoom("session-1", "room-1");

    await handleLiveConnectionClosed({
      registry,
      livePresenceService,
      connectionId: "conn-1",
    });

    expect(calls).toEqual([
      {
        playerSessionId: "session-1",
        subscription: { type: "room", roomId: "room-1" },
      },
    ]);
    expect(registry.getConnection("session-1")).toBeNull();
  });
});
