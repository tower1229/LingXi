---
description: "Workflow core: /flow single entry, human gates, confirm-only compounding (Skills-first on Nightly)."
alwaysApply: true
---

# Workflow Core (Always Apply)

## Nightly / Skills-first

This project assumes **Cursor Nightly** with **Agent Skills** enabled. Skills live in `.cursor/skills/` (see [Agent Skills docs](https://cursor.com/cn/docs/context/skills)).

## Single entrypoint

- Use **only** `/flow <REQ-xxx|描述>` to drive the workflow (req → audit → plan → work → review → compound).
- Never ask users to run `/req /audit /plan /work /review /compound` in this repo.

## Human gates (no silent drift)

- Do not auto-advance phases. After each phase step, present options and wait for user choice.

## Confirm-only compounding

- Never write to `ai/context/experience/` unless the user explicitly confirms via `/flow 沉淀 ...`.
