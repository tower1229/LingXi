---
name: task
description: Create or update a LingXi task document with goal, scope, constraints, and acceptance criteria.
---

# LingXi Task

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

## Responsibilities

- create or update a LingXi task document
- enforce bounded scope and explicit acceptance criteria
- record which memories informed the task when applicable

## Implementation

Use:

- `scripts/write-task.mjs`
- `scripts/next-task-id.mjs`
- `references/task-doc-template.md`
