---
description: "AI artifacts conventions for ai/requirements & ai/context: keep high-signal, index as SSoT, avoid doc bloat."
globs:
  - "ai/requirements/**"
  - "ai/context/**"
alwaysApply: false
---

# AI Artifacts Conventions (Scoped)

## SSoT

- `ai/requirements/INDEX.md` is the single source of truth. Keep it consistent with files on disk.

## High-signal writing

- Prefer **boundaries + pointers** over copying large code/spec blocks.
- Any checklist must be **verifiable** (tests/scripts/manual steps), not subjective wording.

## Session vs knowledge base

- `ai/context/session/` is ephemeral; don’t treat it as a knowledge base.
- `ai/context/experience/` is long-term knowledge and is **confirm-only**.
