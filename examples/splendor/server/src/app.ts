import { Elysia } from "elysia";
import { errorHandler } from "./plugins/error-handler";
import { requestId } from "./plugins/request-id";
import { createRoomRoutes } from "./modules/room/routes";
import type { RoomService } from "./modules/room";

export interface AppDeps {
  roomService: RoomService;
}

export function createApp({ roomService }: AppDeps) {
  return new Elysia()
    .use(requestId)
    .use(errorHandler)
    .get("/health", () => ({ status: "ok" }))
    .use(createRoomRoutes({ roomService }));
}
