---
name: session-distill
description: Distill historical Codex sessions into durable LingXi engineering taste memories with session-level dedupe.
---

# LingXi Session Distill

Use this skill from background automation or the `lingxi-session-distill` subagent.

## Input Contract

Provide normalized session data as JSON:

- `session_id`
- `messages`: array of `{ role, content }`
- optional `force`

## Responsibilities

- analyze historical sessions, not live user turns
- extract only durable engineering taste
- dedupe by `session_id + content_fingerprint + distill_version`
- persist distilled memories into LingXi memory
- update `.lingxi/state/processed-sessions.json`

## Implementation

Use:

- `scripts/distill-session.mjs`
- `references/distill-rules.md`
