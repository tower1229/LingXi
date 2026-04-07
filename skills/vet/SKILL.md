---
name: vet
description: Vet a LingXi task document with dimension-based review for ambiguity, missing constraints, hidden risk, and thin framing.
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

This skill challenges the task definition before work proceeds. It should review only task-level framing, not downstream implementation detail.

## Input Contract

Provide either:

- `task_id`
- or `task_path`

If neither is provided, use the latest existing task.

## Responsibilities

- inspect task quality
- identify blocking gaps and warnings
- adapt review dimensions to task type and complexity
- make the implementation readiness explicit
- keep findings concrete and actionable

## Review Dimensions

- Goal clarity
- Scope boundedness
- Constraint completeness
- Acceptance testability
- Broadness and split risk

For non-trivial tasks, also inspect:

- solution framing
- functional requirement completeness
- risk visibility
- tag-specific contract requirements for documentation or SDK work

## Output

Return JSON with:

- `task_id`
- `file`
- `review_scope`
- `summary`
- `findings`
- `dimension_summaries`
- `review_range_statement`
- `implementation_readiness`
- `next_step_options`

## Implementation

Use:

- `scripts/vet-task.mjs`
- `references/vet-checklist.md`
