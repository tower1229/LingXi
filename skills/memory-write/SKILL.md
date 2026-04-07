---
name: memory-write
description: Write compact LingXi memory notes into `.lingxi/memory/`, maintain the memory index, and keep only durable engineering taste.
---

# LingXi Memory Write

Use this skill when LingXi needs to persist durable engineering taste into the project memory store.

## Responsibilities

- write compact memory notes
- keep `.lingxi/memory/INDEX.md` in sync
- prefer durable engineering taste over task-specific detail

## Write Rules

1. Only write durable, reusable signals.
2. Do not write one-off implementation chatter.
3. Default scope is `project`.
4. Keep notes small and legible.
5. Rebuild the index after writes.

## Implementation

Use:

- `scripts/lingxi-memory-index.mjs`
- `skills/memory-write/scripts/write-memory.mjs`

## References

- `references/write-rules.md`
- `references/memory-note-template.md`
