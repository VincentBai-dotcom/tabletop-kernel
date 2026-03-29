# AsyncAPI Generation Implementation Plan

## Goal

Add a first AsyncAPI generator on top of `describeGameProtocol(...)` so a
consumer can generate a usable hosted-protocol document without writing their
own spec-generation logic.

## Scope

This first step should cover only protocol shapes the kernel can already
support reliably:

- client command submission
- server command rejection
- server visible state view updates

It should not try to model future systems that do not exist yet, such as:

- committed visible events
- pending choices
- trigger or stack resolution
- reconnect-specific messages beyond the generic visible view payload

## Contract Shape

The generator should produce an AsyncAPI 2.x document with:

- one client-to-server channel for command submission
- one server-to-client channel for visible state views
- one server-to-client channel for command rejection

The first version can use stable default channel names:

- `command.submit`
- `match.view`
- `command.rejected`

The document should be generated from the server perspective:

- server subscribes to `command.submit`
- server publishes `match.view`
- server publishes `command.rejected`

## Schema Sources

The generator should use:

- command payload schemas from `describeGameProtocol(...)`
- inferred root `viewSchema` from `describeGameProtocol(...)`

The generator should build command input envelopes itself, including:

- `type` literal per command id
- optional `actorId`
- `payload`

## Public API

Add a helper shaped like:

```ts
generateAsyncApi(gameDefinition, options?)
```

This helper should:

1. call `describeGameProtocol(...)`
2. build the AsyncAPI document
3. return a plain JSON-serializable object

## Verification

Add focused tests that cover:

- default document metadata and channel layout
- generated command-submit union schema
- inclusion of the inferred visible root schema
- propagation of protocol-generation failures
