---
name: vet
description: Vet a LingXi task document for ambiguity, missing constraints, hidden risk, and poor task framing.
---

# LingXi Vet

## Intent

Challenge the task document before implementation starts.

Vet should catch:

- ambiguity
- missing constraints
- non-testable acceptance criteria
- hidden breadth
- weak problem framing

This skill challenges the task definition before work proceeds.

## Input Contract

Provide either:

- `task_id`
- or `task_path`

If neither is provided, use the latest existing task.

## Responsibilities

- inspect task quality
- identify blocking gaps and warnings
- keep findings concrete and actionable

## Review Dimensions

- Goal clarity
- Scope boundedness
- Constraint completeness
- Acceptance testability
- Broadness and split risk

## Output

Return JSON with:

- `task_id`
- `file`
- `summary`
- `findings`

## Implementation

Use:

- `scripts/vet-task.mjs`
- `references/vet-checklist.md`
