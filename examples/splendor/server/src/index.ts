import { createSplendorExecutor, type SplendorState } from "splendor-example";
import { systemClock } from "./lib/clock";
import { createRandomToken } from "./lib/random";
import {
  DISCONNECT_CLEANUP_CRON_PATTERN,
  DISCONNECT_GRACE_MS,
} from "./lib/reconnect-policy";
import { configService } from "./modules/config";
import { createDbClient } from "./modules/db";
import { createDisconnectCleanupService } from "./modules/disconnect-cleanup";
import {
  createGameSessionService,
  createGameSessionStore,
} from "./modules/game-session";
import { createRoomService, createRoomStore } from "./modules/room";
import {
  createPlayerSessionService,
  createPlayerSessionStore,
} from "./modules/player-session";
import {
  createLiveConnectionRegistry,
  createLiveNotifier,
} from "./modules/websocket";
import { createLivePresenceService } from "./modules/live-presence";
import { createApp } from "./app";

const config = configService.get();
const { db } = createDbClient(config.database.url);
const playerSessionService = createPlayerSessionService({
  store: createPlayerSessionStore(db),
  clock: systemClock,
});
const liveRegistry = createLiveConnectionRegistry();
const liveNotifier = createLiveNotifier(liveRegistry);
const gameSessionService = createGameSessionService<SplendorState>({
  store: createGameSessionStore<SplendorState>(db),
  gameExecutor: createSplendorExecutor(),
  rngSeedGenerator: createRandomToken,
  clock: systemClock,
});
const roomService = createRoomService({
  store: createRoomStore(db),
  resolveOrCreatePlayerSession: (input) =>
    playerSessionService.resolveOrCreatePlayerSession(input),
  notifier: liveNotifier,
  startGameFromRoom: (input) =>
    gameSessionService.createGameSessionFromRoom(input),
});
const livePresenceService = createLivePresenceService({
  clock: systemClock,
  roomService,
  gameSessionService,
});
const disconnectCleanupService = createDisconnectCleanupService({
  clock: systemClock,
  roomService,
  gameSessionService,
  notifier: liveNotifier,
  disconnectGraceMs: DISCONNECT_GRACE_MS,
});

const app = createApp({
  roomService,
  websocket: {
    registry: liveRegistry,
    gameSessionService,
    roomService,
    livePresenceService,
    playerSessionService,
  },
  disconnectCleanup: {
    cleanupService: disconnectCleanupService,
    pattern: DISCONNECT_CLEANUP_CRON_PATTERN,
  },
}).listen({
  hostname: config.server.host,
  port: config.server.port,
});

console.log(`Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
