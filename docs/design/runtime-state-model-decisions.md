# Runtime State Model Decisions

This is a living design document for the runtime state model topic.

Update this file whenever a design decision is agreed during discussion so future work can rely on persisted repo context instead of session memory.

## Agreed So Far

### Repository role

`tabletop-kernel` is the reusable, transport-agnostic core runtime for board-game rules engines.

### Language

The default language for `tabletop-kernel` is TypeScript.

Reason:

- the project is agent-first
- the game rules should use the same language as the kernel
- the runtime should stay host-agnostic across web, server, local simulation, and external clients
- Unity is only one possible distribution target, not the design center

### Kernel boundary

`tabletop-kernel` should not implement game-specific rules.

Instead, the kernel should expose stable contracts that consumers use to define their games.

### Runtime state model

The runtime state model should use a single canonical root tree with abstract subsystem slots.

Current direction:

- `game`
- `runtime.progression`
- `runtime.random`
- `runtime.history`
- `runtime.pending`

This keeps one authoritative state object while preserving clear subsystem ownership.

Important constraint:

- `runtime.progression` should remain abstract for now and should not yet be locked to a fixed `turn/phase/activePlayer` shape.

Root shape decision:

- the canonical root shape should be `{ game, runtime }`

Rationale:

- `game` is consumer-provided game state
- `runtime` is engine-managed state
- this preserves a clean boundary between user rules data and kernel-owned execution state

Runtime schema stability decision:

- `runtime` should have a stable shape with stable subsystem keys

Implication:

- subsystem slots should exist even if a given game chooses not to actively use one of them yet
- unused runtime sections can stay empty or minimally initialized

Rationale:

- reduces type complexity
- makes snapshots and tooling more predictable
- preserves a stable boundary for engine-managed state

Consumer game-state boundary decision:

- `game` should be treated as fully opaque consumer state by the kernel

Implication:

- the kernel should not require built-in `players`, `zones`, `entities`, or similar domain structure inside `game`
- games with different structures, including competitive, cooperative, solo, or asymmetric designs, should all fit the same kernel boundary

Extension direction:

- common domain helpers such as player or entity models can be offered later as optional plugins or helper packages
- consumers can choose to use those helpers or build their own game-state structures

Runtime ownership decision:

- `runtime` should be fully kernel-owned execution state

Implication:

- consumer rules should not directly mutate `runtime`
- consumer rules should influence runtime behavior only through kernel contracts such as commands, progression definitions, trigger definitions, resolution policies, visibility policies, or similar declared interfaces

Clarification:

- progression structure may be consumer-declared
- progression state should still be kernel-managed

Rationale:

- preserves stronger runtime invariants
- makes replay and history more reliable
- keeps execution semantics under kernel control

Game mutation model decision:

- consumer rules may directly mutate `game` during kernel-controlled rule execution

Implication:

- the kernel should hide the safety and commit machinery behind the execution boundary
- consumer-facing rule authoring should stay ergonomic and imperative where useful
- direct mutation of `runtime` remains disallowed

Rationale:

- more ergonomic for rule authors
- better fit for agent-generated business logic
- keeps complexity inside the kernel instead of pushing it onto consumers

Canonical game-state shape decision:

- canonical `game` state should remain plain serializable data

Implication:

- consumers should not rely on class instances as persisted subtrees inside canonical state
- replay, serialization, snapshotting, and tooling should operate on plain data

Allowed ergonomic layer:

- consumers may use transient helper classes, facades, or operation wrappers around plain state during rule execution
- those helper objects should not become the canonical persisted form of the game state

Rationale:

- preserves predictable serialization and replay behavior
- avoids prototype and hydration complexity in canonical state
- still allows ergonomic OOP-style helper APIs where useful

Runtime namespace boundary decision:

- `runtime` namespaces should be reserved for kernel-owned state

Implication:

- consumers should not attach arbitrary extra metadata under `runtime`
- if consumers need extra persistent game-specific state, it belongs under `game`

Reserved runtime areas:

- `runtime.history`
- `runtime.random`
- `runtime.pending`
- `runtime.progression`

Progression customization rule:

- consumers may customize progression by supplying progression definitions, policies, or configuration that the kernel understands
- consumers should not own arbitrary fields inside `runtime.progression`

Rationale:

- keeps replay, determinism, and runtime tooling stable
- preserves a sharp boundary between domain state and engine state
- allows progression flexibility without weakening runtime invariants

Runtime initialization decision:

- all reserved runtime sections should have a stable canonical initial shape at game initialization time

Implication:

- runtime sections should not rely on lazy structural initialization later
- keys and baseline inner structure should be present from the start, even when the content is empty or minimally initialized

Rationale:

- keeps the model simpler in principle
- makes initialization, serialization, and tooling more predictable
- avoids conditional state-shape branching in core engine code

Compatibility metadata direction:

- when compatibility metadata is added, it should use a general ruleset identity object rather than a single game version number

Implication:

- compatibility should be able to describe the effective rules package that produced a state or replay
- this should be able to include base rules plus optional modules such as expansions, scenarios, formats, or errata profiles
- per-module or per-expansion version numbers are still allowed inside that broader identity model

Status:

- direction chosen
- exact field placement and schema still deferred until serialization and replay design

Rationale:

- fits tabletop games better than a single monolithic version number
- supports expansion-based evolution naturally
- gives future save/load and replay compatibility checks a more realistic identity model

Runtime metadata placement decision:

- avoid a generic catch-all bucket such as `runtime.meta`

Implication:

- engine-level metadata should live in explicit named sections when needed
- for example, future compatibility-related metadata should go in a specifically named section such as `runtime.compatibility`, not a vague shared bucket

Rationale:

- avoids turning metadata into a junk drawer
- keeps the runtime schema easier to reason about
- forces each field to have a clear subsystem or purpose

Runtime section naming status:

- the current runtime section labels are working names, not permanently frozen names

Current working labels:

- `runtime.progression`
- `runtime.random`
- `runtime.history`
- `runtime.pending`

Implication:

- the structural decisions around `{ game, runtime }`, kernel ownership, stable shape, and reserved runtime namespaces are considered important
- the exact labels and some subsystem boundaries may still evolve as progression, trigger, resolution, and replay design become clearer

Scratch-state boundary decision:

- ephemeral per-execution scratch state should stay outside the canonical state tree

Implication:

- canonical state should contain only persistent or replayable state
- temporary execution bookkeeping, caches, traversal helpers, and similar working memory should not live inside canonical persisted state

Rationale:

- keeps save/load and replay state cleaner
- avoids polluting canonical state with engine implementation details
- preserves a sharper distinction between durable state and temporary execution context

Deferred concern:

- the kernel may eventually need deterministic engine-generated identifiers for areas such as history, pending resolution, replay, or protocol-facing references

Current status:

- acknowledged as likely useful
- deferred until later design work makes the exact need clearer

Error-state boundary decision:

- engine errors and diagnostics should stay outside the canonical state tree

Implication:

- canonical state should not reserve a place for transient execution errors
- errors, diagnostics, and similar execution-time reporting should be returned through out-of-band execution results rather than persisted in state

Rationale:

- keeps canonical state focused on durable replayable truth
- matches the same boundary choice used for scratch state
- avoids polluting save/load and replay data with execution-time engine concerns

Snapshot unit decision:

- canonical state should be reasoned about and snapshotted as a whole

Implication:

- the official kernel snapshot unit is the full `{ game, runtime }` tree
- partial or subtree snapshots may still be added later for tooling, transport, or optimization, but they should not become the primary canonical state model

Rationale:

- keeps replay and save/load semantics simpler
- reduces consistency risks between subtrees
- matches the single authoritative root-tree design

Source-of-truth state decision:

- canonical state should contain source-of-truth data only

Implication:

- derived or recomputable values should not be stored as part of canonical persisted state by default
- computed views, caches, indexes, and other derived structures should live outside canonical state unless a later design decision establishes a strong reason otherwise

Rationale:

- keeps the model simpler
- avoids synchronization bugs between source data and derived data
- strengthens replay and save/load correctness

Execution-affecting configuration direction:

- consumer configuration that does not affect deterministic execution semantics should stay outside canonical state
- consumer configuration that does affect deterministic execution semantics should eventually live in an explicit ruleset or compatibility-oriented layer rather than inside `game`

Implication:

- not all consumer-provided configuration belongs in the same place
- non-semantic host/debug/view configuration can remain outside canonical state entirely
- semantic configuration such as expansions, scenarios, formats, or balance profiles must be represented in some canonical form once serialization and replay design is defined

Status:

- direction chosen
- exact placement deferred until serialization and replay design
