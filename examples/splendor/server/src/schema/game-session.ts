import {
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { playerSessions } from "./player-session";

export const gameSessions = pgTable(
  "game_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    canonicalState: jsonb("canonical_state").$type<unknown>().notNull(),
    stateVersion: integer("state_version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_game_sessions_updated_at").on(table.updatedAt)],
);

export const gameSessionPlayers = pgTable(
  "game_session_players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameSessionId: uuid("game_session_id")
      .notNull()
      .references(() => gameSessions.id, { onDelete: "cascade" }),
    playerSessionId: uuid("player_session_id")
      .notNull()
      .references(() => playerSessions.id),
    playerId: text("player_id").notNull(),
    seatIndex: smallint("seat_index").notNull(),
    displayName: text("display_name").notNull(),
    disconnectedAt: timestamp("disconnected_at", { withTimezone: true }),
  },
  (table) => [
    unique("game_session_players_session_player_session_unique").on(
      table.gameSessionId,
      table.playerSessionId,
    ),
    unique("game_session_players_session_player_id_unique").on(
      table.gameSessionId,
      table.playerId,
    ),
    unique("game_session_players_session_seat_unique").on(
      table.gameSessionId,
      table.seatIndex,
    ),
    index("idx_game_session_players_game_session_id").on(table.gameSessionId),
    index("idx_game_session_players_player_session_id").on(
      table.playerSessionId,
    ),
  ],
);
