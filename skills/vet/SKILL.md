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
- weak solution guidance
- fragile best-practice assumptions

This skill challenges the `task` output before work proceeds. It should help a human question whether the requirement description, solution description, and development guidance are actually robust enough to trust.

## Input Contract

Provide either:

- `task_id`
- or `task_path`

If neither is provided, use the latest existing task.

## Responsibilities

- inspect task quality
- inspect requirement, solution, and development-guidance quality
- identify blocking gaps and warnings
- adapt review dimensions to task type and complexity
- make the implementation readiness explicit
- keep findings concrete and actionable
- group related issues into revision themes instead of returning only flat reminders
- keep the `VetReport` structure stable enough for revision and repair flows

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
- whether the proposed guidance is strong enough for an engineer to implement from safely
- whether the solution explains why the chosen direction is safer or more reviewable than nearby alternatives

## Output

Return JSON with:

- `task_id`
- `file`
- `report_version`
- `review_scope`
- `summary`
- `findings`
- `dimension_summaries`
- `review_range_statement`
- `implementation_readiness`
- `revision_targets`
- `recommended_next_action`
- `next_step_options`

When `VetReport` validation is part of a schema-first flow, use the repair loop boundary: validate, repair the report, then re-validate before accepting it as the stable review artifact.

## Implementation

Use:

- `scripts/vet-report.mjs`
- `scripts/validate-vet-report.mjs`
- `scripts/vet-repair-loop.mjs`
- `scripts/vet-task.mjs`
- `references/vet-report.schema.json`
- `references/vet-checklist.md`
