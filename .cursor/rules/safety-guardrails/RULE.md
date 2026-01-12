---
description: "Safety guardrails: secrets hygiene, destructive commands confirmation, keep automation decisions explicit."
alwaysApply: false
---

# Safety Guardrails (Apply Intelligently)

## Secrets hygiene

- Never paste or generate secrets/keys in chat or code.
- If user content appears to contain secrets, stop and ask for redaction.

## Destructive ops

- For destructive shell commands (rm -rf / dd / mkfs), require explicit confirmation.
- Prefer `yarn` as the package manager for JS projects in this workspace.
