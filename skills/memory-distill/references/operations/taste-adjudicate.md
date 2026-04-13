# Taste Adjudicate

## Purpose

Turn extracted judgment candidates into durable-memory decisions.

This stage is precision-first. Its job is to filter weak candidates, elevate valuable ones, and produce governance-ready, note-ready outputs.

## Input Assumption

You receive structured extraction candidates that already attempt to represent:

- `scene`
- `content_type`
- `alternatives`
- `choice`
- `rationale`
- `evidence`
- `pattern_hint`
- `confidence`

Your task is not to rediscover raw session material. Your task is to decide which candidates deserve long-term memory.

## Core Question

For each candidate, ask:

Would this materially improve future task or vet quality if retrieved in the right scene?

If the answer is weak, reject it.

## Value Elevation

Evaluate every candidate on:

- `decision_gain`
- `reusability`
- `trigger_clarity`
- `verifiability`
- `stability`

Use a 0-3 scale.

Interpretation:

- `0`: weak or missing
- `1`: present but shallow or uncertain
- `2`: solid and reusable
- `3`: strong durable signal with clear future leverage

## Write Threshold

Candidates should normally be rejected when they show one or more of:

- low future decision value
- unclear triggering scene
- weak evidence and weak rationale together
- highly session-specific chatter
- unstable preference that looks accidental or temporary

Candidates should normally pass when they show:

- clear future loading scene
- meaningful decision leverage
- stable principle or warning signal
- reusable guidance for implementation or review

## Content-Type-Specific Guidance

### `preference`

Pass when the preference is stable, future-loadable, and implementation-shaping.

Reject casual likes/dislikes that do not change future work.

### `decision_experience`

Prefer candidates with explicit alternatives and rationale.

These should score well on `decision_gain` when the tradeoff is real.

### `domain_knowledge`

Bias toward `verifiability` and `stability`.

Reject loose opinions presented as facts.

### `product_knowledge`

Pass when the rule changes acceptance or implementation boundary.

### `org_experience`

Pass when the convention is stable enough to guide future collaboration.

### `heuristic`

Pass when it is broadly reusable and can trigger clearly.

### `pattern`

Pass when the pattern is meaningfully named or nameable and reusable in future scenes.

### `anti_pattern_signal`

Pass when it clearly warns against a repeatable failure mode or architectural mistake.

### `troubleshooting`

Pass only if the debugging path or root cause is likely reusable beyond the single incident.

## Storage Kind Mapping

Map richer recognition types onto stable note kinds:

- `preference` -> `preference`
- `decision_experience` -> `heuristic` or `preference` depending on generality
- `domain_knowledge` -> `constraint` or `heuristic`
- `product_knowledge` -> `constraint`
- `org_experience` -> `constraint` or `review_tendency`
- `heuristic` -> `heuristic`
- `pattern` -> `heuristic`
- `anti_pattern_signal` -> `anti_pattern` or `review_tendency`
- `troubleshooting` -> `heuristic` or `anti_pattern`

Choose the storage kind that best supports future retrieval and governance stability, not the richest label.

## Note-Ready Output

For every passed candidate, produce:

- `title`
- `kind`
- `one_liner`
- `decision`
- `when_to_load`
- `durability_reason`
- `value_scores`
- `suggested_storage_kind`

These fields should remain compact, explicit, and governance-ready.

## Writing Rules

- `title` should name the durable judgment, not the chat episode
- `one_liner` should be the smallest useful reusable takeaway
- `decision` should express what to do or avoid
- `when_to_load` should name concrete future triggering scenes
- `durability_reason` should explain why this deserves long-term memory

## You Must Not Do

- do not govern create/merge/replace directly
- do not keep low-value candidates just because extract found them
- do not reward verbosity
- do not produce polished memory text for candidates that lack real future leverage

## Final Standard

High-quality adjudication means:

- fewer but stronger candidates
- explicit future-loading scenes
- stable mapping to a small storage kind set
- memory quality lift, not note count growth
