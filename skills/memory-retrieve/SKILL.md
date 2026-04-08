---
name: memory-retrieve
description: Retrieve minimal, task-relevant LingXi memory from `.lingxi/memory/` before task or vet work.
---

# LingXi Memory Retrieve

## Intent

Retrieve only the smallest useful set of LingXi memories that can improve the current `task` or `vet` work.

Use this skill before `task` or `vet` work.

## Responsibilities

- use LLM semantic judgment to rank project memory
- return only the most relevant notes
- keep retrieval minimal and practical

## Retrieval Rules

1. Prefer project memory first.
2. Return only a small number of hits.
3. Retrieve to improve current work, not to display the archive.
4. If nothing matches, return an empty result.
5. Prefer project memory over share memory when relevance is otherwise similar.
6. Do not fall back to keyword scoring as the main decision path.

## Output

Return JSON with:

- `query`
- `hit_count`
- `hits[]`

Each hit should include:

- `note_id`
- `title`
- `kind`
- `scope`
- `score`
- `when_to_load`
- `one_liner`
- `file`

## Implementation

Use:

- `scripts/lingxi-memory-index.mjs`
- `scripts/retrieve-memory.mjs`
