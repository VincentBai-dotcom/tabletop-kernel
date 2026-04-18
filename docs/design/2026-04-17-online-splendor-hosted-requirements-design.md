# Online Splendor Hosted Requirements Design

## Purpose

This document captures the high-level product requirements for building an
online hosted Splendor game on top of `tabletop-engine`.

This is intentionally framework-agnostic. It is meant to verify that the
current engine direction can support a real end-to-end hosted game flow without
forcing decisions yet about transport, UI framework, backend stack, or
deployment model.

## Product Goal

Build an online Splendor experience that is meant to be played by invited
friends.

The core shape is:

- no login/signup
- no public lobby
- room-code-based joining
- ephemeral room and game lifecycle
- no persistence after game completion

## Scope

In scope:

- main menu
- create room
- join room by code
- ready/start flow
- host transfer before game start
- active multiplayer game
- same-browser reconnect
- lightweight end screen
- backend cleanup of room/game state

Out of scope:

- user accounts
- identity provider integration
- public room browser
- spectators
- persistence after game end
- replay/history product features
- rematch flow

## Core Requirements

### 1. No Account System

The product should not require:

- login
- signup
- user credentials

There is no permanent user identity model.

### 2. Room Creation

A host should be able to create a room with:

- 4 player slots total

This is a private friend-room flow, not a public matchmaking flow.

### 3. No Public Lobby

Created rooms should not be publicly listed.

There should be no general lobby where arbitrary users can browse active rooms.

### 4. Join By Room Code

Players at the main menu should be able to:

- enter a room code
- join the room if it exists
- join only if the room is not full

### 5. Shareable Room Code

The host should be able to obtain the room code and share it with friends.

The product should assume friend-to-friend coordination happens outside the
game itself.

### 6. Ready / Start Flow

Each seated player should be able to:

- mark ready
- mark unready before start

The host should be able to start the game only when:

- the room has 2 to 4 seated players
- every seated player is ready

The game should be startable with fewer than 4 players.

### 7. Host Transfer

If the host leaves before the game starts:

- the next seated player becomes the new host

There should always be exactly one host while the room is in pre-game state.

### 8. Room Deletion Before Start

If all players leave a room before the game starts:

- the room should be deleted

If a non-host player leaves before start:

- their slot becomes open again
- another player can join with the same room code

### 9. Active Game Lifecycle

When the game starts:

- the pre-game room should stop being joinable
- no new players can enter
- no spectators are allowed

The active game is only for the seated players who started it.

### 10. No Persistence After End

When the game ends normally:

- the backend should delete the game snapshot/state

No long-term persistence is required.

## Identity And Reconnect Model

### Anonymous Local Identity

Even without login, the client still needs a stable anonymous identity for the
duration of a room/game.

Each browser/device should store a local anonymous player/session token so that:

- refreshes do not count as a permanent disconnect
- brief reconnects can reclaim the same seat

### Same-Browser Reconnect Only

Reconnect should be supported only on the same browser/device.

A different device should not be able to reclaim the same seat just by knowing:

- room code
- player display name

### Display Names

Players should choose a display name when joining a room.

Display names:

- only need to be unique within that room
- are not global identities

## Disconnect And Failure Rules

### Before Game Start

If a player disconnects or leaves before the game starts:

- their seat becomes open
- the room remains valid

If the host leaves:

- host transfers to the next seated player

### After Game Start

If a seated player truly disconnects after the game starts and cannot resume
from the same browser/device:

- the game becomes invalid
- the game ends immediately

This keeps the no-account model simple and avoids trying to support mid-game
replacement or cross-device recovery.

## End Screen Requirements

When a game ends, players should see a lightweight end screen.

This applies to:

- normal completion
- invalid termination after an unrecoverable disconnect

The end screen should show:

- result/status
- who won, when applicable
- enough terminal state to understand the final outcome

The backend is allowed to delete the game state immediately once the end result
has been emitted to clients.

The client should provide:

- a “Back to Main Menu” button

Once a player leaves that end screen:

- they cannot go back to the ended game

## Recommended Lifecycle Model

The product should be treated as having distinct phases:

1. main menu
2. pre-game room
3. active game session
4. terminal end screen

This separation is important even if the eventual implementation shares some
storage or transport mechanics underneath.

### Pre-Game Room Phase

Responsibilities:

- room code
- host assignment
- player seat list
- ready state
- join/leave handling

### Active Game Phase

Responsibilities:

- seat ownership
- same-browser resume
- active game snapshot
- command submission
- turn/state updates
- disconnect invalidation

### End Screen Phase

Responsibilities:

- render final result
- show winner or invalidation reason
- provide exit back to main menu

## Relationship To `tabletop-engine`

This hosted product should help verify whether `tabletop-engine` is useful for
building a real online multiplayer game end to end.

At a high level, the engine is expected to help with:

- canonical game state
- visible player-facing state
- command submission and validation
- deterministic execution
- room/game session state transitions at the game level

The hosted layer still needs to solve:

- room management
- anonymous client identity
- room-code join flow
- reconnect semantics
- host transfer
- transport and fanout
- end-of-session cleanup

## Open Technical Decisions Deferred On Purpose

This document does not decide:

- frontend framework
- backend framework
- transport protocol
- database/storage choice
- deployment model
- horizontal scaling approach

Those should be decided later once the hosted requirements are translated into
an implementation plan.

## Summary

The intended product is a private, friend-invite, room-code-based online
Splendor experience with:

- no accounts
- 2 to 4 seated players
- ready/start room flow
- pre-start host transfer
- same-browser reconnect only
- no spectators
- immediate invalidation on unrecoverable post-start disconnect
- no persistence after game end
- lightweight terminal end screen before returning to main menu
