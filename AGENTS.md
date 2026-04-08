# LingXi Runtime

This repository includes a local LingXi 2.0 runtime.

- Runtime root: `.lingxi/`
- Memory index: `.lingxi/memory/INDEX.md`
- Project memory notes: `.lingxi/memory/project/`
- Shared memory notes: `.lingxi/memory/share/`
- Distill state: `.lingxi/state/processed-sessions.json`
- Distill journal: `.lingxi/state/distill-journal.jsonl`
- Background agent definition: `.codex/agents/lingxi-session-distill.toml`
- Generated automation config: `.lingxi/setup/automation.session-distill.toml`

LingXi provides dedicated workflows for:

- task definition (`task`)
- task vetting (`vet`)

Global memory rule:

- Persist only durable, reusable engineering taste.
- Do not store one-off implementation details as memory.
