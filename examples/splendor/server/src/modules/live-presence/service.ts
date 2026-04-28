import type {
  CreateLivePresenceServiceDeps,
  LivePresenceService,
} from "./model";
import { LivePresenceError } from "./errors";

export function createLivePresenceService({
  clock,
  roomService,
  gameSessionService,
}: CreateLivePresenceServiceDeps): LivePresenceService {
  function requireGameSessionService() {
    if (!gameSessionService) {
      throw LivePresenceError.gamePresenceNotImplemented();
    }
    return gameSessionService;
  }

  return {
    async handleClosedSubscription({ playerSessionId, subscription }) {
      if (!subscription) {
        return;
      }

      if (subscription.type === "room") {
        await roomService.markDisconnected({
          roomId: subscription.roomId,
          playerSessionId,
          disconnectedAt: clock.now(),
        });
        return;
      }

      await requireGameSessionService().markDisconnected({
        gameSessionId: subscription.gameSessionId,
        playerSessionId,
      });
    },

    async handleRoomSubscribed({ playerSessionId, roomId }) {
      const result = await roomService.markReconnected({
        roomId,
        playerSessionId,
      });
      if (!result.room) {
        throw LivePresenceError.roomNotFound();
      }

      return {
        type: "room_snapshot",
        room: result.room,
      };
    },

    async handleGameSubscribed({ playerSessionId, gameSessionId }) {
      const snapshot = await requireGameSessionService().markReconnected({
        gameSessionId,
        playerSessionId,
      });
      if (!snapshot) {
        throw LivePresenceError.gameNotFound();
      }

      return {
        type: "game_snapshot",
        gameSessionId,
        stateVersion: snapshot.stateVersion,
        view: snapshot.view,
        availableCommands: snapshot.availableCommands,
        events: [],
      };
    },
  };
}
