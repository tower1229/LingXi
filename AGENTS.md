# cursor-workflow (Nightly / Skills-first)

## Workflow Core

### Nightly / Skills-first

This project assumes **Cursor Nightly** with **Agent Skills** enabled. Skills live in `.cursor/skills/` (see [Agent Skills docs](https://cursor.com/cn/docs/context/skills)).

### Single entrypoint

- Use **only** `/flow <REQ-xxx|描述>` to drive the workflow (req → plan → audit → work → review → archive).
- Never ask users to run `/req /audit /plan /work /review /archive` in this repo.

### Human gates (no silent drift)

- Do not auto-advance phases. After each phase step, present options and wait for user choice.

### Confirm-only compounding

- Never write to `.workflow/context/experience/` unless the user explicitly confirms via `/flow 沉淀 ...`.

## Skills & Rules

- Skills live in `.cursor/skills/` (Nightly-only; see `.cursor/commands/flow.md` for the required skills).
- **Workflow tool rules** (this file and nested `AGENTS.md`): Define workflow tool constraints and conventions.
- **Project rules** (`.cursor/rules/qs-*`): Project-specific quality standards created via `/flow 沉淀` and `rules-creator` Skill.
