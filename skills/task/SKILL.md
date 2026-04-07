---
name: task
description: Create or update a LingXi task document with requirement refinement, bounded scope, and binary acceptance criteria.
---

# LingXi Task

## Intent

Produce a task document that is actually usable as the start of execution:

- refine the request into a bounded task
- make the problem framing explicit
- record binary acceptance criteria
- preserve just enough solution intent to guide safe implementation

The task document is not an implementation plan. It is the execution starting point and acceptance contract.

## Input Contract

Provide structured task input with:

- `title`
- `goal`
- `scope[]`
- `constraints[]`
- `acceptance_criteria[]`
- optional `background`
- optional `problem`
- optional `solution_overview`
- optional `goals[]`
- optional `non_goals[]`
- optional `success_criteria[]`
- optional `user_stories[]`
- optional `functional_requirements[]`
- optional `memory_refs[]`
- optional `task_id` for updates

## Key Constraints

- Fail fast when goal, scope, constraints, or acceptance criteria are missing.
- Fail fast when the input is too broad, ambiguous, or under-specified for a non-trivial task.
- Gather missing or weak fields into one rejection so the caller can fix them in one pass.
- Keep task titles concise: no more than 10 Chinese characters or 20 English characters in intent, even if the file slug is normalized.
- Record memory references only when they materially shaped the task.
- Do not drift into plan/build detail.
- Non-goals must be real exclusions, not restated goals or scope.
- Frontend non-trivial tasks must carry state-oriented edge cases.
- Backend non-trivial tasks must describe at least one explicit interface or contract boundary.

## Fail-Fast Expectations

Do not produce a task document if the input cannot support a usable execution starting point.

At minimum, reject or ask for completion when any of these are weak or missing:

- goal
- scope
- constraints
- acceptance criteria
- success criteria
- functional requirement details

For non-trivial tasks, also reject or ask for completion when these are weak:

- background
- problem
- solution overview
- non-goals
- user stories
- state/contract edge cases that fit the task type

## Responsibilities

- create or update a LingXi task document
- enforce requirement quality before writing
- keep the task at the framing/acceptance level
- record which memories informed the task when applicable
- append change-log entries when vet feedback materially changed the task

## Execution Flow

1. Read the structured input and the existing task file if `task_id` is present.
2. Validate core fields, then run one-pass fail-fast checks for ambiguity, breadth, and missing framing.
3. Infer task type and complexity when they are not supplied.
4. Normalize user stories and functional requirements into deterministic structure.
5. Allocate a new task id unless `task_id` is explicitly provided.
6. Render a deterministic task document.
7. Write or update the task file under `.lingxi/tasks/`.

## Output

Return JSON with:

- `operation`
- `task_id`
- `file`
- `task_spec_version`
- `quality_gate`
- `next_step_options`

When validation fails, return a structured validator payload instead of only a raw error string.

## Implementation

Use:

- `scripts/task-spec.mjs`
- `scripts/task-compiler.mjs`
- `scripts/write-task.mjs`
- `scripts/next-task-id.mjs`
- `references/task-spec.schema.json`
- `references/task-doc-template.md`
