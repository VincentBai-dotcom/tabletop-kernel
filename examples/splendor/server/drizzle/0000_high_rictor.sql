CREATE TYPE "public"."room_status" AS ENUM('open', 'starting');--> statement-breakpoint
CREATE TABLE "game_session_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_session_id" uuid NOT NULL,
	"player_session_id" uuid NOT NULL,
	"player_id" text NOT NULL,
	"seat_index" smallint NOT NULL,
	"display_name" text NOT NULL,
	"disconnected_at" timestamp with time zone,
	CONSTRAINT "game_session_players_session_player_session_unique" UNIQUE("game_session_id","player_session_id"),
	CONSTRAINT "game_session_players_session_player_id_unique" UNIQUE("game_session_id","player_id"),
	CONSTRAINT "game_session_players_session_seat_unique" UNIQUE("game_session_id","seat_index")
);
--> statement-breakpoint
CREATE TABLE "game_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_state" jsonb NOT NULL,
	"state_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	CONSTRAINT "player_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "room_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"player_session_id" uuid NOT NULL,
	"seat_index" smallint NOT NULL,
	"display_name" text NOT NULL,
	"display_name_key" text NOT NULL,
	"is_ready" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_players_room_player_session_unique" UNIQUE("room_id","player_session_id"),
	CONSTRAINT "room_players_room_seat_unique" UNIQUE("room_id","seat_index"),
	CONSTRAINT "room_players_room_display_name_key_unique" UNIQUE("room_id","display_name_key")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(8) NOT NULL,
	"status" "room_status" DEFAULT 'open' NOT NULL,
	"host_player_session_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rooms_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "game_session_players" ADD CONSTRAINT "game_session_players_game_session_id_game_sessions_id_fk" FOREIGN KEY ("game_session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_session_players" ADD CONSTRAINT "game_session_players_player_session_id_player_sessions_id_fk" FOREIGN KEY ("player_session_id") REFERENCES "public"."player_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_players" ADD CONSTRAINT "room_players_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_players" ADD CONSTRAINT "room_players_player_session_id_player_sessions_id_fk" FOREIGN KEY ("player_session_id") REFERENCES "public"."player_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_host_player_session_id_player_sessions_id_fk" FOREIGN KEY ("host_player_session_id") REFERENCES "public"."player_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_game_session_players_game_session_id" ON "game_session_players" USING btree ("game_session_id");--> statement-breakpoint
CREATE INDEX "idx_game_session_players_player_session_id" ON "game_session_players" USING btree ("player_session_id");--> statement-breakpoint
CREATE INDEX "idx_game_sessions_updated_at" ON "game_sessions" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_room_players_room_id" ON "room_players" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "idx_room_players_player_session_id" ON "room_players" USING btree ("player_session_id");--> statement-breakpoint
CREATE INDEX "idx_rooms_code" ON "rooms" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_rooms_host_player_session_id" ON "rooms" USING btree ("host_player_session_id");