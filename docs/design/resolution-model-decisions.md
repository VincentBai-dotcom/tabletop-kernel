# Resolution Model Decisions

This is a living design document for the resolution model topic.

Update this file whenever a resolution-model design decision is agreed during discussion so future work can rely on persisted repo context instead of session memory.

## Agreed So Far

### Default resolution scope

The first version should use direct sequencing as the default resolution model.

Current high-level direction:

- games should resolve effects directly in sequence by default
- the kernel should not force an always-on stack or generic queue model in the first version
- richer resolution structures can be added later for games that genuinely need them

Implication:

- the first kernel can stay simple and broadly applicable
- ordinary ordered effect chains do not need to be modeled as a stack by default
- later stack-like or queue-like systems remain possible extensions rather than baseline assumptions

Rationale:

- many tabletop games only need straightforward ordered resolution
- internal-step chaining and queued triggers do not by themselves require a stack model
- this keeps the first kernel easier to reason about while leaving room for more advanced resolution later

## Current discussion

We are discussing the near-term design goals in strict order.

Current topic:

4. resolution model
