# Taste Extract

## Purpose

Recover high-recall judgment candidates from historical repository sessions.

This stage is responsible for recognition, not final memory writing.

## You Are Looking For

Find candidate durable engineering taste such as:

- stable implementation preferences
- repeated project constraints
- anti-pattern signals
- review concerns that recur across work
- heuristics that can guide future choices
- troubleshooting paths with reproducible pattern value

## You Must Produce

For each valid candidate, recover a structured judgment shape with:

- `scene`
- `content_type`
- `alternatives`
- `choice`
- `rationale`
- `evidence`
- `pattern_hint`
- `confidence`

The extraction target is judgment structure, not polished note text.

## Recognition Principle

Always ask:

1. What future scene would cause this memory to be loaded?
2. What competing principles or paths existed here?
3. What choice was actually favored?
4. What rationale or evidence supports that choice?

If you cannot recover a future-usable structure, the candidate is probably not durable memory.

## High-Recall Bias

This stage should prefer recall over precision.

It is acceptable to emit borderline candidates if:

- there is plausible future reuse
- the judgment shape is partially recoverable
- adjudication can later reject it safely

Do not over-prune just because the wording is implicit.

## What To Reject Even In Extract

Reject when the content is clearly:

- bookkeeping
- session-distill chatter
- generic conversation summary
- repository-irrelevant personal chat
- one-off implementation status without reusable decision pattern

## Content Type Guidance

Use the smallest content type that best matches the signal:

- `preference`: stable "prefer X / avoid Y" signal
- `decision_experience`: explicit tradeoff among alternatives
- `domain_knowledge`: reusable technical/domain rule or pitfall
- `product_knowledge`: product semantics, acceptance rules, business boundary
- `org_experience`: team, organization, or process convention
- `heuristic`: reusable rule of thumb
- `pattern`: named or nameable engineering pattern
- `anti_pattern_signal`: stable warning or don't-do-this signal
- `troubleshooting`: reproducible debugging path or root cause pattern

## Alternatives Guidance

`alternatives` should be explicit when possible.

If the session does not state them directly, infer only the closest materially competing paths.

If a content type naturally has weak alternatives, an empty or short list is acceptable. Do not invent elaborate option trees.

## Evidence Guidance

`evidence` should preserve the strongest user-originated wording or compact supporting excerpt.

Prefer evidence that helps later adjudication verify:

- the scene
- the choice
- the rationale

## Pattern Hint Guidance

`pattern_hint` should be a short phrase that helps later grouping or retrieval, for example:

- "third-party integration seam"
- "review-time rollback safeguard"
- "root-cause-first debugging"

It does not need to be a formal pattern name.

## You Must Not Do

- do not emit note-ready `title`, `one_liner`, or `when_to_load`
- do not decide governance action
- do not optimize for elegant phrasing over recoverable structure
- do not turn the whole session into a summary

## Output Standard

Emit the smallest candidate set that preserves likely durable signals.

High recall does not mean flooding. It means erring toward keeping plausible judgment structures that adjudication can refine or reject later.
