---
name: memory-retrieve
description: Retrieve minimal, task-relevant LingXi memory from `.lingxi/memory/` before task or vet work.
---

# LingXi Memory Retrieve

Use this skill before `task` or `vet` work.

## Responsibilities

- search project memory
- return only the most relevant notes
- keep retrieval minimal and practical

## Retrieval Rules

1. Prefer project memory first.
2. Return only a small number of hits.
3. Retrieve to improve current work, not to display the archive.
4. If nothing matches, return an empty result.

## Implementation

Use:

- `scripts/lingxi-memory-index.mjs`
- `scripts/retrieve-memory.mjs`
