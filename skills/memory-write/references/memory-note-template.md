```md
---
id: MEM-001
title: Prefer small reviewable patches
kind: preference
scope: project
source: session-distill
updated_at: 2026-04-07T12:00:00Z
when_to_load:
  - When planning a code change that could be split into smaller commits
---

# One-liner

Prefer smaller, reviewable changes over large multi-concern patches.

# Decision / Preference

This project should bias toward small, inspectable changesets because they reduce review risk and simplify rollback.

# Evidence

- User repeatedly prefers smaller changes over broad refactors.
```
