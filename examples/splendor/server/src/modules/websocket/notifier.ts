import type {
  GameEndedPayload,
  GameUpdatePayload,
  LiveConnection,
  LiveConnectionRegistry,
  LiveNotifier,
  LiveServerMessage,
} from "./model";
import type { RoomSnapshot } from "../room";

function sendToConnections(
  connections: LiveConnection[],
  message: LiveServerMessage,
) {
  for (const connection of connections) {
    connection.send(message);
  }
}

export function createLiveNotifier(
  registry: LiveConnectionRegistry,
): LiveNotifier {
  return {
    publishRoomUpdated(room: RoomSnapshot) {
      sendToConnections(registry.getRoomConnections(room.id), {
        type: "room_updated",
        room,
      });
    },

    publishGameStarted({ roomId, gameSessionId }) {
      sendToConnections(registry.getRoomConnections(roomId), {
        type: "game_started",
        gameSessionId,
      });
    },

    publishGameUpdated(gameSessionId: string, payload: GameUpdatePayload) {
      sendToConnections(registry.getGameConnections(gameSessionId), {
        type: "game_snapshot",
        ...payload,
      });
    },

    publishGameEnded(gameSessionId: string, result: GameEndedPayload) {
      sendToConnections(registry.getGameConnections(gameSessionId), {
        type: "game_ended",
        gameSessionId,
        result,
      });
    },
  };
}
