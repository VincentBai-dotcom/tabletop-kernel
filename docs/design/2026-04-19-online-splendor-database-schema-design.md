# Online Splendor Database Schema Design

## Purpose

This document defines the first database schema direction for the hosted online
Splendor backend.

The goal is simplicity.

The schema should support:

- anonymous same-browser identity
- private room-code joining
- ready/start room lifecycle
- host transfer before start
- active game sessions
- reconnect support
- persisting canonical game state after every accepted command
- deleting backend game state after the game ends

This design intentionally avoids:

- event sourcing
- replay history
- spectators
- public lobbies
- rematch persistence
- long-term game history

## Recommendation

Use lifecycle tables, not one giant JSON blob and not event sourcing.

Recommended tables:

- `player_sessions`
- `rooms`
- `room_players`
- `game_sessions`
- `game_session_players`

These tables directly match the product phases:

1. player session identity
2. pre-game room
3. active game session
4. active canonical snapshot

## Alternatives Considered

### 1. Lifecycle Tables

Recommended.

This uses relational tables for the room and game lifecycle while storing the
canonical `tabletop-engine` state as JSONB.

Benefits:

- maps directly to product requirements
- supports simple relational constraints
- makes room readiness, host transfer, and seat uniqueness easy to enforce
- keeps command execution simple
- keeps the schema small enough for v1

### 2. Single JSON Session Table

This would store most room and game data in one broad JSON blob.

Benefits:

- fastest initial schema
- fewer tables

Problems:

- harder uniqueness constraints
- harder display-name conflict checks
- harder host transfer queries
- harder room capacity checks
- weaker data integrity

This is not recommended.

### 3. Event-Sourced Command Log

This would store commands/events and rebuild game state from history.

Benefits:

- replay support
- auditability
- potentially useful later

Problems:

- more complex than needed
- conflicts with the current "no persistence after end" goal
- not required for validating the hosted product

This is explicitly out of scope for v1.

## Table Design

### `player_sessions`

Represents one browser/device identity.

This is not a user account.

Suggested fields:

```ts
player_sessions {
  id: uuid primary key
  token_hash: text unique not null
  created_at: timestamp not null
  last_seen_at: timestamp not null
  expires_at: timestamp nullable
}
```

Notes:

- store a hash of the browser token, not the raw token
- the browser stores the raw player session token locally
- same-browser reconnect depends on this token
- different devices cannot reclaim the same seat

### `rooms`

Represents a pre-game room.

Suggested fields:

```ts
rooms {
  id: uuid primary key
  code: varchar(8) unique not null
  status: enum("open", "starting") not null
  host_player_session_id: uuid not null references player_sessions(id)
  created_at: timestamp not null
  updated_at: timestamp not null
}
```

Notes:

- room codes are short, uppercase, and randomly generated
- room code uniqueness is enforced by a database constraint
- collisions are retried by the service
- room state is pre-game only
- when the game starts, the room should be deleted after creating the game
  session

The `starting` status exists to make the start transaction explicit and avoid
double-start behavior.

### `room_players`

Represents seated players before the game starts.

Suggested fields:

```ts
room_players {
  id: uuid primary key
  room_id: uuid not null references rooms(id) on delete cascade
  player_session_id: uuid not null references player_sessions(id)
  seat_index: smallint not null
  display_name: text not null
  display_name_key: text not null
  is_ready: boolean not null default false
  joined_at: timestamp not null
}
```

Recommended constraints:

- unique `(room_id, player_session_id)`
- unique `(room_id, seat_index)`
- unique `(room_id, display_name_key)`

Notes:

- `display_name_key` should be a normalized display name, for example
  lowercase + trimmed
- seat assignment is automatic in join order
- leaving before start deletes this row
- if the final player row is deleted, delete the room
- if the host leaves, update `rooms.host_player_session_id` to the next seated player
- durable "last seen anywhere" state belongs to `player_sessions`, not this
  table

### `game_sessions`

Represents an active game.

Suggested fields:

```ts
game_sessions {
  id: uuid primary key
  canonical_state: jsonb not null
  state_version: integer not null default 0
  created_at: timestamp not null
  updated_at: timestamp not null
}
```

Notes:

- `canonical_state` stores the authoritative `{ game, runtime }` state from
  `tabletop-engine`
- row existence means the game session is active
- persist `canonical_state` after every accepted command
- increment `state_version` after every accepted command
- no event log is needed for v1
- on normal or invalid end, emit terminal result to connected clients, then
  delete the game session

### `game_session_players`

Maps started game seats to player sessions and engine player ids.

Suggested fields:

```ts
game_session_players {
  id: uuid primary key
  game_session_id: uuid not null references game_sessions(id) on delete cascade
  player_session_id: uuid not null references player_sessions(id)
  player_id: text not null
  seat_index: smallint not null
  display_name: text not null
  disconnected_at: timestamp nullable
}
```

Recommended constraints:

- unique `(game_session_id, player_session_id)`
- unique `(game_session_id, player_id)`
- unique `(game_session_id, seat_index)`

Notes:

- `player_id` is the id passed into `tabletop-engine`
- `disconnected_at` supports the active-game disconnect invalidation rule
- reconnect from the same browser clears `disconnected_at`
- durable "last seen anywhere" state belongs to `player_sessions`, not this
  table

## Lifecycle Transactions

### Create Room

1. Resolve or create the player session.
2. Generate a short uppercase room code.
3. Insert `rooms`.
4. Insert the host into `room_players` at seat `0`.
5. If room-code insertion conflicts, retry with a new code.
6. Return room code, room state, and player session token if newly created.

### Join Room

1. Resolve or create the player session.
2. Lock or load the target open room by code.
3. Verify room exists and is joinable.
4. Verify there are fewer than 4 seated players.
5. Verify display-name uniqueness via `display_name_key`.
6. Assign the first open seat index.
7. Insert `room_players`.
8. Return room state and player session token if newly created.

### Leave Room Before Start

1. Delete the player's `room_players` row.
2. If no players remain, delete the room.
3. If the leaving player was host, update `rooms.host_player_session_id` to the next
   seated player.
4. Push updated room state to connected clients.

### Ready / Unready

1. Verify the player session is seated in the room.
2. Update `room_players.is_ready`.
3. Push updated room state to connected clients.

### Start Game

1. Lock the room and its players.
2. Verify the requester is the host.
3. Verify the room has 2 to 4 seated players.
4. Verify all seated players are ready.
5. Mark the room as `starting`.
6. Create the initial canonical game state with `tabletop-engine`.
7. Insert `game_sessions`.
8. Insert `game_session_players`.
9. Delete the `rooms` row, cascading `room_players`.
10. Push game-start transition to connected clients.

This keeps room and active game phases separate.

### Accepted Game Command

1. Load and lock `game_sessions`.
2. Load the requesting player from `game_session_players`.
3. Execute the command through `tabletop-engine`.
4. Persist the new canonical state.
5. Increment `state_version`.
6. Commit.
7. Push visible state and resulting events over WebSocket.

### End Game

1. Produce terminal result payload.
2. Push terminal result to connected clients.
3. Delete `game_sessions`, cascading `game_session_players`.

The backend does not need to retain the game snapshot after this point.

## What Not To Store In V1

Do not add these tables yet:

- `command_log`
- `event_log`
- `terminal_results`
- `spectators`
- `rematches`
- `public_lobbies`

If end screens later need to survive page refreshes after the backend deletes
the active game, add a short-lived `terminal_results` table then.

## Open Assumption

This design assumes the end screen does not need to survive a browser refresh
after the terminal payload has been received.

If that assumption changes, add a short-lived terminal-result persistence table
before implementing the end-state flow.

## Recommendation

Implement the Drizzle schema around the five lifecycle tables first:

- `player_sessions`
- `rooms`
- `room_players`
- `game_sessions`
- `game_session_players`

Use relational constraints for room/player integrity and JSONB only for the
`tabletop-engine` canonical state snapshot.

This gives the first hosted Splendor backend enough correctness for:

- private room joining
- same-browser reconnect
- deterministic active game state
- simple cleanup after game end

without introducing persistence features that are not required yet.
