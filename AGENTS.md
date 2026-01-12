# cursor-workflow (Nightly / Skills-first)

## Workflow

- Use **only** `/flow <REQ-xxx|描述>` to drive the lifecycle (req → audit → plan → work → review → compound).
- Stage transitions must use **human gates**: never auto-advance without explicit confirmation.
- Knowledge write-in is **confirm-only**: never write to `.workflow/context/experience/` unless the user confirms via `/flow 沉淀 ...`.

## Skills & Rules

- Skills live in `.cursor/skills/` (Nightly-only; see `.cursor/commands/flow.md` for the required skills).
- Project Rules live in `.cursor/rules/` and should stay short; prefer scoped rules over always-apply.
