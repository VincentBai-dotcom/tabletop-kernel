import { Elysia, t } from "elysia";
import { createModuleLogger, type AppLogger } from "../../lib/logger";
import type { GameSessionService } from "../game-session";
import type { LivePresenceService } from "../live-presence";
import type { RoomService } from "../room";
import type { PlayerSessionService } from "../player-session";
import { createLiveMessageHandler } from "./actions";
import type { HeartbeatManager } from "./heartbeat";
import type {
  LiveClientMessage,
  LiveConnection,
  LiveConnectionRegistry,
  LiveServerMessage,
} from "./model";

export interface WebSocketRoutesDeps {
  registry: LiveConnectionRegistry;
  gameSessionService?: GameSessionService;
  roomService: RoomService;
  livePresenceService?: LivePresenceService;
  heartbeatManager?: HeartbeatManager;
  playerSessionService: PlayerSessionService;
  logger?: AppLogger;
}

const liveMessageSchema = t.Union([
  t.Object({
    type: t.Literal("subscribe_room"),
    roomId: t.String({ minLength: 1 }),
  }),
  t.Object({
    type: t.Literal("room_set_ready"),
    roomId: t.String({ minLength: 1 }),
    ready: t.Boolean(),
  }),
  t.Object({
    type: t.Literal("room_leave"),
    roomId: t.String({ minLength: 1 }),
  }),
  t.Object({
    type: t.Literal("room_start_game"),
    roomId: t.String({ minLength: 1 }),
  }),
  t.Object({
    type: t.Literal("subscribe_game"),
    gameSessionId: t.String({ minLength: 1 }),
  }),
  t.Object({
    type: t.Literal("game_discover"),
    requestId: t.String({ minLength: 1 }),
    gameSessionId: t.String({ minLength: 1 }),
    discovery: t.Any(),
  }),
  t.Object({
    type: t.Literal("game_execute"),
    requestId: t.String({ minLength: 1 }),
    gameSessionId: t.String({ minLength: 1 }),
    command: t.Any(),
  }),
  t.Object({
    type: t.Literal("game_list_available_commands"),
    requestId: t.String({ minLength: 1 }),
    gameSessionId: t.String({ minLength: 1 }),
  }),
]);

function toLiveConnection(ws: {
  id: string;
  send(payload: unknown): unknown;
  ping?(): unknown;
  terminate?(): void;
  close?(code?: number, reason?: string): void;
}) {
  return {
    id: ws.id,
    send(payload: LiveServerMessage) {
      ws.send(payload);
    },
    ping() {
      ws.ping?.();
    },
    terminate() {
      ws.terminate?.();
    },
    close(code, reason) {
      ws.close?.(code, reason);
    },
  } satisfies LiveConnection;
}

export async function handleLiveConnectionClosed({
  registry,
  livePresenceService,
  connectionId,
  logger = createModuleLogger("websocket").child({ connectionId }),
}: {
  registry: LiveConnectionRegistry;
  livePresenceService?: LivePresenceService;
  connectionId: string;
  logger?: AppLogger;
}) {
  const removed = registry.removeConnection(connectionId);
  logger.debug({ hadRegistration: removed !== null }, "live connection closed");
  if (!removed || !livePresenceService) {
    return;
  }

  await livePresenceService.handleClosedSubscription(removed);
}

export async function handleLiveConnectionOpened({
  registry,
  playerSessionService,
  connection,
  playerSessionToken,
  logger = createModuleLogger("websocket"),
}: {
  registry: LiveConnectionRegistry;
  playerSessionService: PlayerSessionService;
  connection: LiveConnection;
  playerSessionToken: string;
  logger?: AppLogger;
}) {
  const connectionLogger = logger.child({ connectionId: connection.id });
  connectionLogger.debug(
    { hasPlayerSessionToken: playerSessionToken.length > 0 },
    "live connection opened",
  );
  const session = await playerSessionService.resolveOrCreatePlayerSession({
    token: playerSessionToken,
  });
  registry.register(session.playerSessionId, connection);
  connectionLogger.info(
    {
      playerSessionId: session.playerSessionId,
      tokenWasCreated: session.tokenWasCreated,
    },
    "live connection registered",
  );
  connection.send({
    type: "session_resolved",
    playerSessionToken: session.token,
  });
}

export function createWebSocketRoutes({
  registry,
  gameSessionService,
  roomService,
  livePresenceService,
  heartbeatManager,
  playerSessionService,
  logger = createModuleLogger("websocket"),
}: WebSocketRoutesDeps) {
  const handler = createLiveMessageHandler({
    registry,
    roomService,
    gameSessionService,
    livePresenceService,
  });

  return new Elysia().ws("/live", {
    query: t.Object({
      playerSessionToken: t.String({ minLength: 1 }),
    }),
    body: liveMessageSchema,
    async open(ws) {
      await handleLiveConnectionOpened({
        registry,
        playerSessionService,
        connection: toLiveConnection(ws),
        playerSessionToken: ws.data.query.playerSessionToken,
        logger: logger.child({ connectionId: ws.id }),
      });
    },
    async message(ws, message: LiveClientMessage) {
      logger
        .child({ connectionId: ws.id, messageType: message.type })
        .debug({}, "live message received");
      await handler.handleMessage(toLiveConnection(ws), message);
    },
    pong(ws) {
      heartbeatManager?.markPong(ws.id);
    },
    close(ws) {
      void handleLiveConnectionClosed({
        registry,
        livePresenceService,
        connectionId: ws.id,
        logger: logger.child({ connectionId: ws.id }),
      }).catch((error: unknown) => {
        logger
          .child({ connectionId: ws.id })
          .error(
            error instanceof Error ? { err: error } : { error },
            "live connection close cleanup failed",
          );
      });
    },
  });
}
