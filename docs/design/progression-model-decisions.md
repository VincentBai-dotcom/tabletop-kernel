# Progression Model Decisions

This is a living design document for the turn, phase, and progression topic.

Update this file whenever a progression-model design decision is agreed during discussion so future work can rely on persisted repo context instead of session memory.

## Agreed So Far

### Generic progression concept

Turn, phase, step, round, and similar labels should be treated as named instances of one generic progression concept rather than as distinct built-in kernel concepts.

Current high-level direction:

- a progression segment is a bounded interval of game progression with an entry, an exit, and rules that apply while it is active
- labels such as turn, phase, step, and round mainly differ by naming, nesting, ownership, and transition rules
- the kernel should not hardcode fundamentally different semantics for those labels in the first version

Implication:

- consumers can model many different game structures without the kernel forcing one specific turn/phase taxonomy
- nesting like round -> turn -> phase -> step can be expressed as one family of progression segments rather than separate unrelated concepts

Rationale:

- many games use similar progression ideas with different names and structures
- a generic segment model is more flexible than hardcoded built-in turn/phase semantics

## Current discussion

We are discussing the near-term design goals in strict order.

Current topic:

- how consumers should define turn, phase, and related progression concepts
- what those concepts mean in essence
- how consumers should express them in programming language
