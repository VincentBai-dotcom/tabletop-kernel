import { Elysia } from "elysia";
import { AppError, toErrorResponse } from "../modules/errors";
import { GameSessionError } from "../modules/game-session/errors";
import { LivePresenceError } from "../modules/live-presence/errors";
import { RoomError } from "../modules/room/errors";
import { WebSocketError } from "../modules/websocket/errors";

export const errorHandler = new Elysia({ name: "error-handler" })
  .error({
    AppError,
    RoomError,
    GameSessionError,
    LivePresenceError,
    WebSocketError,
  })
  .onError(({ error, status }) => {
    const response = toErrorResponse(error);
    return status(response.statusCode, response.body);
  })
  .as("global");
