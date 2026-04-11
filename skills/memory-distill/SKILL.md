---
name: memory-distill
description: Define LingXi's canonical semantic contract for durable engineering taste extraction, adjudication, and retrieval intent handling.
---

# LingXi Memory Distill

## Intent

Define what LingXi memory is allowed to remember and how semantic memory operations should reason about it.

This skill is the canonical semantic specification for durable engineering taste.

It does not persist notes by itself. It defines the recognition, adjudication, and retrieval philosophy that runtime scripts must compile into structured LLM operations.

## Role In The System

`memory-distill` is the semantic source of truth for:

- what counts as durable engineering taste
- how a session becomes structured judgment candidates
- how candidates are value-scored before governance
- how task and vet retrieval intents should differ

`session-distill` remains the orchestration layer:

- select valid sessions
- call the semantic runtime
- batch-govern candidates
- write notes
- update state and logs

## Core Principle

Do not jump directly from historical dialogue to memory note.

Every memory candidate must first be reconstructed as reusable judgment structure.

The canonical shape is:

- `scene`
- `principle candidates` or `alternatives`
- `actual choice`
- optional `rationale`
- optional `evidence`

If a candidate cannot be reconstructed into future-reusable decision structure, it should normally not become memory.

## Durable Memory Standard

LingXi memory is not conversation summary.

It is limited to durable engineering taste such as:

- stable implementation preferences
- reusable decision experience
- domain or product constraints
- anti-patterns and failure signals
- recurring review tendencies
- transferable heuristics
- reproducible troubleshooting paths

Reject by default:

- one-off implementation narration
- transient debugging chatter without reusable pattern
- generic chat summaries
- bookkeeping or automation chatter
- context that cannot explain when future loading should happen

## Semantic Pipeline

The canonical pipeline is:

1. `taste_extract`
2. `taste_adjudicate`
3. governance handoff
4. retrieval by intent

### `taste_extract`

High-recall recognition stage.

Its job is to recover candidate judgment structures from session material, not to write note-ready memories.

### `taste_adjudicate`

Precision-first value elevation stage.

Its job is to decide which extracted candidates deserve durable memory, score them, map them to stable storage kinds, and produce note-ready fields for governance.

### Governance Handoff

This skill does not decide `create / merge / replace / skip`.

It must produce candidates that are explicit enough for governance to reason about semantic equivalence, strengthening, or rejection.

### Retrieval By Intent

Task and vet retrieval must share the same memory philosophy but apply different ranking bias:

- `task`: constraints, boundaries, implementation preference, rollback guidance
- `vet`: anti-patterns, review tendencies, hidden risk, historical misses

## Quality Standard

High-quality memory extraction is defined by quality of future reuse, not note volume.

Every adjudicated candidate should be evaluated on:

- `decision_gain`
- `reusability`
- `trigger_clarity`
- `verifiability`
- `stability`

These scores are not decorative metadata. They are the quality gate between "extractable" and "worth writing."

## Content Types

The current canonical recognition taxonomy includes:

- `preference`
- `decision_experience`
- `domain_knowledge`
- `product_knowledge`
- `org_experience`
- `heuristic`
- `pattern`
- `anti_pattern_signal`
- `troubleshooting`

Storage kinds remain intentionally smaller and more stable:

- `preference`
- `constraint`
- `anti_pattern`
- `review_tendency`
- `heuristic`

Recognition type and storage kind must not be collapsed into the same concept.

## Operation Specs

Canonical operation instructions live in:

- `references/operations/taste-extract.md`
- `references/operations/taste-adjudicate.md`

Canonical type and mapping assets live in:

- `references/taxonomy.json`
- `references/storage-kind-map.json`

Runtime code should load these assets and compile operation-specific prompts from them rather than redefining memory philosophy inside scripts.

## Runtime Contract

Runtime scripts using this skill must:

- keep structured schema validation
- keep deterministic persistence and state handling outside the skill
- treat this skill as semantic source of truth
- avoid embedding divergent prompt logic that bypasses this skill

## References

- `references/operations/taste-extract.md`
- `references/operations/taste-adjudicate.md`
- `references/taxonomy.json`
- `references/storage-kind-map.json`
