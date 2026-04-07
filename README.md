[中文](./README_ZH.md)

# LíngXī（灵犀）

Quality-first rebuild for LingXi 2.0.

## Status

This repository is in the LingXi 2.0 rebuild phase.

- The intended 2.0 core is now **Codex-native**.
- The visible 2.0 workflows are intentionally narrow: `task` and `vet`.
- Durable memory remains the real core: `memory-retrieve`, `memory-write`, and `session-distill`.
- Legacy `.cursor/` assets are still present for compatibility, reference, and migration safety. They are not the final 2.0 product shape.

Current project policy is quality first:

- do not push roadmap phases quickly at the expense of output quality
- align current-scope capabilities before expanding scope
- prefer strong contracts, clear outputs, and testable behavior over premature abstraction

See:

- [Architecture](./docs/architecture.md)
- [Roadmap](./docs/lingxi-2-roadmap.md)
- [Quality Bar](./docs/quality-baseline.md)

## Current 2.0 Core

Implemented or in active alignment:

- Codex plugin shell: `.codex-plugin/plugin.json`
- project-local runtime under `.lingxi/`
- setup bootstrap: `scripts/lingxi-setup.mjs`
- visible workflows: `skills/task/`, `skills/vet/`
- memory core: `skills/memory-retrieve/`, `skills/memory-write/`
- background distillation: `skills/session-distill/`
- project-local distill agent template: `templates/agents/lingxi-session-distill.toml.tmpl`

## Repository Shape

- `.codex-plugin/` — Codex plugin shell
- `skills/` — LingXi 2.0 skills
- `scripts/` — deterministic setup and runtime helpers
- `templates/` — generated runtime artifacts
- `docs/` — architecture, roadmap, and quality bar
- `.cursor/` — retained legacy Cursor-era assets and compatibility surface

## Install Notes

The repository currently contains two different surfaces:

1. The **target 2.0 architecture**, which is Codex-native.
2. A **retained legacy Cursor install surface**, which still provisions `.cursor/` assets.

That means the remote install scripts in `install/` are currently a transitional compatibility path, not the final Codex-native 2.0 distribution model.

For local verification of the 2.0 runtime shape, use the setup script inside a target repository:

```bash
node scripts/lingxi-setup.mjs
```

This creates the current 2.0 runtime skeleton under `.lingxi/` and `.codex/agents/`.

## Development

Run the test suite:

```bash
npm test
```

The repository currently treats green tests and product-surface coherence as mandatory quality gates before further roadmap expansion.
