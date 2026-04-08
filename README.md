[中文](./README_ZH.md)

# LíngXī（灵犀）

LingXi 2.0 is now a released Codex-native task, vet, and engineering memory workflow.

## Status

LingXi 2.0 is complete at the current product scope and ready for release.

- The intended 2.0 product surface is now fully **Codex-native**.
- The visible 2.0 workflows are intentionally narrow: `task` and `vet`.
- Durable memory remains the real core: `memory-retrieve`, `memory-write`, and `session-distill`.
- Cursor-era repository content has been removed from the main tree. The retirement record remains in [Cursor-Era Asset Classification](./docs/cursor-era-asset-classification.md).

Current project policy remains quality first:

- do not push roadmap phases quickly at the expense of output quality
- align current-scope capabilities before expanding scope
- prefer strong contracts, clear outputs, and testable behavior over premature abstraction

See:

- [Architecture](./docs/architecture.md)
- [Roadmap](./docs/lingxi-2-roadmap.md)
- [Quality Bar](./docs/quality-baseline.md)
- [Cursor-Era Asset Classification](./docs/cursor-era-asset-classification.md)

## 2.0 Core

Released and supported:

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

## Install Notes

The remote install scripts in `install/` now provision the supported LingXi 2.0 surface directly:

- `.codex-plugin/plugin.json`
- `skills/`
- `scripts/`
- `templates/`
- generated runtime under `.lingxi/` and `.codex/agents/`

They no longer install or manage `.cursor/` assets.

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

This runs the supported LingXi 2.0 product suite.

The repository treats green current-product tests and product-surface coherence as mandatory release gates for the supported 2.0 surface.
