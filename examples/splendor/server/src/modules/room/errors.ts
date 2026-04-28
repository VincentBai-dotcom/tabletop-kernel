import { AppError } from "../errors";

export const RoomErrorCodes = {
  RoomCodeGenerationFailed: "room_code_generation_failed",
  RoomNotFound: "room_not_found",
  RoomNotOpen: "room_not_open",
  RoomPlayerNotFound: "room_player_not_found",
  RoomFull: "room_full",
  DisplayNameTaken: "display_name_taken",
  RoomHostRequired: "room_host_required",
  RoomNeedsMorePlayers: "room_needs_more_players",
  RoomPlayersNotReady: "room_players_not_ready",
  RoomPlayersDisconnected: "room_players_disconnected",
} as const;

export class RoomError extends AppError {
  static roomCodeGenerationFailed() {
    return new RoomError(
      RoomErrorCodes.RoomCodeGenerationFailed,
      500,
      "Could not generate a unique room code",
    );
  }

  static roomNotFound() {
    return new RoomError(RoomErrorCodes.RoomNotFound, 404, "Room not found");
  }

  static roomNotOpen() {
    return new RoomError(RoomErrorCodes.RoomNotOpen, 409, "Room is not open");
  }

  static roomPlayerNotFound() {
    return new RoomError(
      RoomErrorCodes.RoomPlayerNotFound,
      403,
      "Player is not seated in this room",
    );
  }

  static roomFull() {
    return new RoomError(RoomErrorCodes.RoomFull, 409, "Room is full");
  }

  static displayNameTaken() {
    return new RoomError(
      RoomErrorCodes.DisplayNameTaken,
      409,
      "Display name is already taken in this room",
    );
  }

  static roomHostRequired() {
    return new RoomError(
      RoomErrorCodes.RoomHostRequired,
      403,
      "Only the host can start the game",
    );
  }

  static roomNeedsMorePlayers() {
    return new RoomError(
      RoomErrorCodes.RoomNeedsMorePlayers,
      409,
      "At least two players are required to start",
    );
  }

  static roomPlayersNotReady() {
    return new RoomError(
      RoomErrorCodes.RoomPlayersNotReady,
      409,
      "Every seated player must be ready before start",
    );
  }

  static roomPlayersDisconnected() {
    return new RoomError(
      RoomErrorCodes.RoomPlayersDisconnected,
      409,
      "Every seated player must be connected before start",
    );
  }

  constructor(
    code: string,
    statusCode: number,
    message: string,
    details?: unknown,
  ) {
    super(code, statusCode, message, details);
    this.name = "RoomError";
  }
}
