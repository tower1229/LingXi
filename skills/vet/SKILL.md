---
name: vet
description: Vet a LingXi task document for ambiguity, missing constraints, hidden risk, and poor task framing.
---

# LingXi Vet

This skill challenges the task definition before work proceeds.

## Input Contract

Provide either:

- `task_id`
- or `task_path`

## Responsibilities

- inspect task quality
- identify blocking gaps and warnings
- keep findings concrete and actionable

## Implementation

Use:

- `scripts/vet-task.mjs`
- `references/vet-checklist.md`
