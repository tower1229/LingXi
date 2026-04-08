---
name: memory-write
description: Write compact LingXi memory notes into `.lingxi/memory/`, maintain the memory index, and keep only durable engineering taste.
---

# LingXi Memory Write

Use this skill when LingXi needs to persist durable engineering taste into the project memory store.

## Intent

Turn a distilled durable signal into a compact reusable memory note.

This skill should bias toward memory quality over memory volume.

## Responsibilities

- write compact memory notes
- keep `.lingxi/memory/INDEX.md` in sync
- prefer durable engineering taste over task-specific detail

## Input Contract

Provide structured JSON with:

- `title`
- `kind`
- `when_to_load[]`
- `one_liner`
- `decision`
- `evidence[]`
- `source`
- optional `scope`

## Write Rules

1. Only write durable, reusable signals.
2. Do not write one-off implementation chatter.
3. Default scope is `project`.
4. Keep notes small and legible.
5. Rebuild the index after writes.
6. Merge with an existing note when the durable signal is materially the same.

## Supported Kinds

- `preference`
- `constraint`
- `anti_pattern`
- `review_tendency`
- `heuristic`

## Output

Return JSON with:

- `operation` (`created` or `merged`)
- `note_id`
- `file`
- `scope`
- `updated_at`

## Implementation

Use:

- `scripts/lingxi-memory-index.mjs`
- `skills/memory-write/scripts/write-memory.mjs`

## References

- `references/write-rules.md`
- `references/memory-note-template.md`
