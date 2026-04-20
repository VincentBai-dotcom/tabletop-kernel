import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const playerSessions = pgTable("player_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});
