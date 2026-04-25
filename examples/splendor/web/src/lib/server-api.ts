import type {
  CreateRoomResult,
  JoinRoomResult,
} from "splendor-server/client-types";
import type { App } from "splendor-server/app";
import { treaty } from "@elysia/eden";
import { splendorServerHttpUrl } from "../config";

const api = treaty<App>(splendorServerHttpUrl);

function getErrorMessage(
  error: { value?: { message?: string } } | null,
  fallback: string,
): string {
  return error?.value?.message ?? fallback;
}

export async function createRoom(input: {
  displayName: string;
  playerSessionToken: string | null;
}): Promise<CreateRoomResult> {
  const response = await api.rooms.post({
    displayName: input.displayName,
    playerSessionToken: input.playerSessionToken ?? undefined,
  });

  if (response.error) {
    throw new Error(getErrorMessage(response.error, "Failed to create room"));
  }

  return response.data as CreateRoomResult;
}

export async function joinRoom(input: {
  displayName: string;
  roomCode: string;
  playerSessionToken: string | null;
}): Promise<JoinRoomResult> {
  const response = await api.rooms.join.post({
    roomCode: input.roomCode,
    displayName: input.displayName,
    playerSessionToken: input.playerSessionToken ?? undefined,
  });

  if (response.error) {
    throw new Error(getErrorMessage(response.error, "Failed to join room"));
  }

  return response.data as JoinRoomResult;
}
