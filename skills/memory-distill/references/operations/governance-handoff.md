# Governance Handoff

## Purpose

Support the governance layer by making candidate meaning explicit enough for stable create-or-merge decisions.

This operation does not decide note persistence policy beyond the currently supported action set:

- `create`
- `merge_into_existing`
- `skip_as_not_durable`

## Input Assumption

You receive adjudicated durable-memory candidates plus existing note summaries.

Candidates already passed recognition and value elevation.

## Core Principle

Govern by semantic equivalence and durable meaning, not wording similarity.

Prefer convergence when:

- the durable judgment is materially the same
- a later candidate strengthens an earlier note in the same direction
- the storage kind and future trigger are compatible

Prefer skip when:

- the candidate still lacks durable future leverage
- the trigger remains unclear
- the signal is too generic to improve future task or vet quality

## Current Action Boundary

Do not invent unsupported governance actions.

Use only:

- `create`
- `merge_into_existing`
- `skip_as_not_durable`

This stage may label `reason_code` more precisely, for example:

- `merge_equivalent`
- `merge_strengthen`
- `skip_low_value`
- `skip_unclear_trigger`

## Merge Guidance

Merge when:

- title wording differs but durable meaning is the same
- one candidate is a stronger or clearer phrasing of the same memory
- same-batch later candidates should collapse into an earlier candidate

Do not merge just because topics are adjacent.

## Create Guidance

Create when:

- the candidate expresses a distinct durable judgment
- future loading conditions are clear enough
- the candidate would materially improve the memory base if retrieved later

## Skip Guidance

Skip when:

- the candidate is still too weak after adjudication
- the note would likely pollute memory more than it helps
- the trigger scene remains too generic for reliable retrieval

## Output Standard

Return the smallest action set that keeps the memory base high-signal and low-noise.
