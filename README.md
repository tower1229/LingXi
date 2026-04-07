[中文](./README_ZH.md)

# LíngXī（灵犀）

Quality-first rebuild for LingXi 2.0.

## Status

This repository is in the LingXi 2.0 rebuild phase.

- The intended 2.0 product surface is now fully **Codex-native**.
- The visible 2.0 workflows are intentionally narrow: `task` and `vet`.
- Durable memory remains the real core: `memory-retrieve`, `memory-write`, and `session-distill`.
- Historical `.cursor/` material may still exist in the repository as reference only during closure work. It is not part of the 2.0 install surface and is intended to be removed from the main repository.

Current project policy is quality first:

- do not push roadmap phases quickly at the expense of output quality
- align current-scope capabilities before expanding scope
- prefer strong contracts, clear outputs, and testable behavior over premature abstraction

See:

- [Architecture](./docs/architecture.md)
- [Roadmap](./docs/lingxi-2-roadmap.md)
- [Quality Bar](./docs/quality-baseline.md)
- [Cursor-Era Asset Classification](./docs/cursor-era-asset-classification.md)

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
- `.cursor/` — temporary Cursor-era reference material outside the supported 2.0 surface and on the path to removal; see [Cursor-Era Asset Classification](./docs/cursor-era-asset-classification.md)

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

For Cursor-era migration guardrails:

```bash
npm run test:legacy
```

For repository-shape changes that touch both:

```bash
npm run test:all
```

The repository currently treats green current-product tests and product-surface coherence as mandatory quality gates before further roadmap expansion.
