# Splendor Terminal Client Design

## Goal

Add a playable terminal client for Splendor that runs on top of the existing
`tabletop-kernel` and `splendor-example` packages.

This client is intended to prove that the current engine can drive a real
playable game loop with:

- a human player
- three bots
- rendered board state
- interactive command selection
- sequential turn resolution with refreshed UI

## Status

This design is intentionally **blocked on engine discovery support**.

The terminal client should not invent its own parallel move-enumeration logic.
It should use kernel-level command discovery so the playable client exercises the
same public authoring model that future UIs and agents should rely on.

## Package Boundary

The terminal app should live in a separate workspace package:

- `examples/splendor-terminal`

This package should depend on:

- `tabletop-kernel`
- `splendor-example`

It should not contain game rules. It should only contain:

- terminal presentation
- prompt handling
- bot turn orchestration
- client-side consumption of discovery results

## Runtime Model

The terminal client should run one in-memory local match.

Initial player set:

- `you`
- `bot-1`
- `bot-2`
- `bot-3`

Session flow:

1. create the Splendor game definition
2. create the kernel
3. create initial state
4. loop until `winnerIds` is set
5. on each turn:
   - render refreshed game state
   - if it is the human turn, prompt for command and targets/options
   - if it is a bot turn, wait for enter, then let the bot choose a random
     discovered command
   - execute the chosen command
   - render the refreshed game state and recent events

## Terminal UX

The client should use a dependency-light terminal loop, not a full TUI library.

Expected UX:

### Human turn

1. clear and redraw the screen
2. show:
   - current player
   - bank
   - face-up cards
   - nobles
   - all players
   - your hand of reserved cards
   - recent events from the last action
3. ask which command to take
4. ask follow-up target/option questions as needed
5. submit the command
6. redraw the screen with the new state

### Bot turn

1. show which bot is about to act
2. ask the user to press enter to reveal the next bot activity
3. choose one random discovered command
4. execute it
5. redraw the screen
6. show what the bot did and what events happened

## Command Selection Model

The terminal client should not hardcode Splendor action legality directly.

Instead it should consume an engine-supported discovery surface with this
conceptual flow:

1. ask the engine for discoverable commands for the active actor
2. for a chosen command, ask for the next available options/targets if needed
3. construct the final command payload from the discovered options
4. submit that command through the kernel

This is the main reason the terminal implementation is blocked on discovery.

## Internal Package Structure

Planned files:

- `examples/splendor-terminal/src/main.ts`
  - bootstraps the match and runs the turn loop
- `examples/splendor-terminal/src/render.ts`
  - screen rendering helpers
- `examples/splendor-terminal/src/prompts.ts`
  - menu and enter-to-continue prompts
- `examples/splendor-terminal/src/session.ts`
  - stateful local session wrapper around kernel + state
- `examples/splendor-terminal/src/bot.ts`
  - random bot policy using discovery results
- `examples/splendor-terminal/src/types.ts`
  - terminal-local UI/helper types if needed

## Session Abstraction

The terminal app should use a small local session object even before a broader
OOP kernel facade exists.

Conceptually:

```ts
const session = createLocalSplendorSession();
session.getState();
session.executeCommand(command);
session.getLastEvents();
```

This keeps terminal code cleaner without changing the current kernel API yet.

## Bot Behavior

Bots should be deliberately simple for the first version:

- gather all discovered legal commands
- pick one uniformly at random

No heuristics are needed for v1.

## Rendering Priorities

The terminal renderer should optimize for clarity, not density.

Minimum visible information:

- active player
- token bank
- nobles
- market rows by level
- each player's score, tokens, reserved count, purchased bonuses
- recent command and emitted events

## Error Handling

Expected command rejection should be shown inline in the UI and the human should
be re-prompted.

Because the terminal client will rely on discovery, ordinary invalid-command
cases should be rare and treated as a UX/debug signal rather than a normal path.

## Testing Scope

The first version does not need full end-to-end terminal interaction tests.

It should have:

- lightweight unit coverage for any pure formatting or bot helper logic where
  useful
- manual play verification as the primary validation

## Dependency on Discovery

Before implementing this package, the kernel should gain:

- optional per-command `discover()` hooks
- a kernel helper for listing discoverable commands/options for an actor

Only after that should `examples/splendor-terminal` be built.

## Recommendation

Build `examples/splendor-terminal` after discovery support lands.

The terminal client should be:

- a separate example package
- local/in-memory only
- dependency-light
- driven by kernel discovery rather than handcrafted move enumeration
