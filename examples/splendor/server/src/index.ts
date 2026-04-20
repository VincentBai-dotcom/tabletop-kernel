import { systemClock } from "./lib/clock";
import { configService } from "./modules/config";
import { db } from "./modules/db";
import { createRoomService, createRoomStore } from "./modules/room";
import {
  createPlayerSessionStore,
  createSessionService,
} from "./modules/session";
import { createApp } from "./app";

const config = configService.get();
const sessionService = createSessionService({
  store: createPlayerSessionStore(db),
  clock: systemClock,
});
const roomService = createRoomService({
  store: createRoomStore(db),
  resolveOrCreatePlayerSession: (input) =>
    sessionService.resolveOrCreatePlayerSession(input),
  notifier: {
    publishRoomUpdated() {},
    publishGameStarted() {},
  },
});

const app = createApp({ roomService }).listen({
  hostname: config.server.host,
  port: config.server.port,
});

console.log(`Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
