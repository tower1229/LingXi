---
name: task
description: Create or update a LingXi task document with goal, scope, constraints, and acceptance criteria.
---

# LingXi Task

## Intent

Produce a task document that is actually usable as the start of execution:

- clear goal
- bounded scope
- explicit constraints
- testable acceptance criteria

The task document is not an implementation plan. It is the problem framing and acceptance contract.

This skill defines the task clearly before implementation begins.

## Input Contract

Provide structured task input with:

- `title`
- `goal`
- `scope[]`
- `constraints[]`
- `acceptance_criteria[]`
- optional `memory_refs[]`
- optional `task_id` for updates

## Key Constraints

- Fail fast when goal, scope, constraints, or acceptance criteria are missing.
- Keep the title concise and file-safe.
- Record memory references only when they materially shaped the task.
- Do not drift into plan/build detail.

## Responsibilities

- create or update a LingXi task document
- enforce bounded scope and explicit acceptance criteria
- record which memories informed the task when applicable

## Execution Flow

1. Read structured input.
2. Validate required fields before writing.
3. Allocate a new task id unless `task_id` is explicitly provided.
4. Render a deterministic task document.
5. Write or update the task file under `.lingxi/tasks/`.

## Output

Return JSON with:

- `operation`
- `task_id`
- `file`

## Implementation

Use:

- `scripts/write-task.mjs`
- `scripts/next-task-id.mjs`
- `references/task-doc-template.md`
