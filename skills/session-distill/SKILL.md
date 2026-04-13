---
name: session-distill
description: Distill historical Codex sessions into durable LingXi engineering taste memories with session-level dedupe.
---

# LingXi Session Distill

## Intent

Distill durable engineering taste from historical Codex sessions with low user intrusion.

The goal is not to summarize the conversation. The goal is to extract reusable judgment.

Use this skill from background automation or the `lingxi-session-distill` subagent.

This skill is the orchestration layer for background distillation.

The canonical semantic specification for taste recognition and adjudication belongs to `skills/memory-distill/`.

## Input Contract

Provide normalized session data as JSON:

- `session_id`
- `messages`: array of `{ role, content }`
- optional `force`

## Responsibilities

- analyze historical sessions, not live user turns
- exclude session-distill automation/self-distillation sessions from selection
- call the memory-distill semantic runtime to perform `taste_extract` and `taste_adjudicate`
- dedupe by `session_id + content_fingerprint + distill_version`
- batch-govern distilled candidates before persistence so one session does not pay one semantic roundtrip per note
- persist distilled memories into LingXi memory
- update `.lingxi/state/processed-sessions.json`

## Extraction Bias

Prioritize:

- explicit preferences
- stable constraints
- recurring anti-patterns
- recurring review concerns

Reject:

- one-off implementation chatter
- transient debugging details
- generic conversation summaries
- session-distill automation chatter or notes about the distillation run itself

## Output

Return JSON with:

- `operation`
- `session_id`
- `run_reason`
- `content_fingerprint`
- `distill_version`
- `candidate_count`
- `note_count`
- `notes`

`run_reason` should explain whether the run is:

- `first_distill`
- `content_changed`
- `distill_version_changed`
- `forced_reprocess`
- `duplicate_unchanged`

## Implementation

Use:

- `scripts/distill-session.mjs`
- `scripts/memory-distill-candidate-set.mjs`
- `../memory-distill/SKILL.md`
- `references/distill-rules.md`
