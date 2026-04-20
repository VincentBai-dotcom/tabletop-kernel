import { describe, expect, it } from "bun:test";
import { getTableName } from "drizzle-orm";
import { createDbClient, schema } from "../index";

describe("db module", () => {
  it("exports the hosted Splendor schema", () => {
    expect(getTableName(schema.playerSessions)).toBe("player_sessions");
    expect(getTableName(schema.rooms)).toBe("rooms");
    expect(getTableName(schema.roomPlayers)).toBe("room_players");
    expect(getTableName(schema.gameSessions)).toBe("game_sessions");
    expect(getTableName(schema.gameSessionPlayers)).toBe(
      "game_session_players",
    );
  });

  it("creates a drizzle client without connecting immediately", () => {
    const client = createDbClient("postgres://postgres:postgres@localhost/db");

    expect(client.db).toBeDefined();
    expect(client.pool).toBeDefined();
  });
});
