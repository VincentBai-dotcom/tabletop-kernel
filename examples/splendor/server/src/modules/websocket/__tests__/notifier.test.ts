import { describe, expect, it } from "bun:test";
import { createLiveConnectionRegistry } from "../registry";
import { createLiveNotifier } from "../notifier";
import type { LiveConnection } from "../model";
import type { RoomSnapshot } from "../../room";

function createRecordingConnection(id: string) {
  const sent: unknown[] = [];
  const connection: LiveConnection = {
    id,
    send(payload) {
      sent.push(payload);
    },
  };

  return { connection, sent };
}

function createRoomSnapshot(): RoomSnapshot {
  return {
    id: "room-1",
    code: "ABC123",
    status: "open",
    hostPlayerSessionId: "session-1",
    players: [],
  };
}

describe("createLiveNotifier", () => {
  it("sends room updates to room subscribers", () => {
    const registry = createLiveConnectionRegistry();
    const notifier = createLiveNotifier(registry);
    const first = createRecordingConnection("conn-1");
    const second = createRecordingConnection("conn-2");
    registry.register("session-1", first.connection);
    registry.register("session-2", second.connection);
    registry.subscribeToRoom("session-1", "room-1");
    registry.subscribeToRoom("session-2", "room-2");

    notifier.publishRoomUpdated(createRoomSnapshot());

    expect(first.sent).toEqual([
      { type: "room_updated", room: createRoomSnapshot() },
    ]);
    expect(second.sent).toEqual([]);
  });

  it("sends game updates to game subscribers", () => {
    const registry = createLiveConnectionRegistry();
    const notifier = createLiveNotifier(registry);
    const client = createRecordingConnection("conn-1");
    registry.register("session-1", client.connection);
    registry.subscribeToGame("session-1", "game-1");

    notifier.publishGameUpdated("game-1", {
      stateVersion: 2,
      view: { game: "view" },
      events: [{ type: "event" }],
    });

    expect(client.sent).toEqual([
      {
        type: "game_updated",
        stateVersion: 2,
        view: { game: "view" },
        events: [{ type: "event" }],
      },
    ]);
  });

  it("sends terminal game results to game subscribers", () => {
    const registry = createLiveConnectionRegistry();
    const notifier = createLiveNotifier(registry);
    const client = createRecordingConnection("conn-1");
    registry.register("session-1", client.connection);
    registry.subscribeToGame("session-1", "game-1");

    notifier.publishGameEnded("game-1", {
      reason: "completed",
      winnerPlayerIds: ["player-1"],
    });

    expect(client.sent).toEqual([
      {
        type: "game_ended",
        result: {
          reason: "completed",
          winnerPlayerIds: ["player-1"],
        },
      },
    ]);
  });
});
