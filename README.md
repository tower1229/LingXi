[中文](./README_ZH.md)

# LíngXī（灵犀）

**A Codex-native workflow that helps teams write sharper tasks, challenge weak plans before implementation, and accumulate durable engineering taste over time.**

LingXi 2.0 is released and ready for release at the current product scope.

LingXi keeps the visible surface intentionally small:

- `task` turns rough requests into engineer-ready task documents
- `vet` stress-tests those tasks before execution starts
- `memory` captures reusable engineering judgment in the background and applies it to meaningful repository conversations

Cursor-era repository content has been removed from the main tree, and the retirement record remains in [Cursor-Era Asset Classification](./docs/cursor-era-asset-classification.md).

## Why LingXi

Most AI workflows are good at generating output, but weak at preserving standards.

LingXi is built to improve the quality of work before code is written:

- turn ambiguous requests into bounded, implementation-ready tasks
- catch hidden risk, weak acceptance criteria, and shallow framing early
- carry forward durable engineering preferences instead of relearning them every session
- keep outputs structured, reviewable, and testable rather than purely conversational

## What You Get

- **Codex-native plugin surface** via [`.codex-plugin/plugin.json`](./.codex-plugin/plugin.json)
- **Visible workflows** in [`skills/task/`](./skills/task/) and [`skills/vet/`](./skills/vet/)
- **Durable memory core** in [`skills/memory-retrieve/`](./skills/memory-retrieve/), [`skills/memory-write/`](./skills/memory-write/), and [`skills/session-distill/`](./skills/session-distill/)
- **Project-local runtime** under `.lingxi/`
- **Background distillation agent template** in [`templates/agents/lingxi-session-distill.toml.tmpl`](./templates/agents/lingxi-session-distill.toml.tmpl)
- **Deterministic setup and runtime helpers** in [`scripts/`](./scripts/)

## How It Works

1. Install LingXi into a target repository.
2. Run setup to generate the local runtime and background-agent config.
3. Use `task` to create a strong task document.
4. Use `vet` to challenge it before implementation begins.
5. Let `session-distill` accumulate durable engineering taste into project memory over time.

For the Codex runtime, session distillation now runs through a deterministic selector + runner path:

- Codex session artifacts are discovered and filtered by a Codex-specific adapter
- `node scripts/lx-distill-sessions.mjs` orchestrates the scan
- `skills/session-distill/scripts/distill-session.mjs` remains the single-session durable-memory worker

The result is a workflow that stays narrow at the surface, but compounds quality underneath.

For LingXi, `task` and `vet` are visible workflows, but memory is a global context layer. It should improve any meaningful repository-scoped conversation, not only explicit workflow invocations.

## Install

Remote install scripts provision the supported LingXi 2.0 surface directly:

- `.codex-plugin/plugin.json`
- `skills/`
- `scripts/`
- `templates/`
- generated runtime under `.lingxi/` and `.codex/agents/`

### Remote Install Script

Run one of the following commands from the **root of your target repository**.

**Linux / macOS / Git Bash**

```bash
curl -fsSL https://raw.githubusercontent.com/tower1229/LingXi/main/install/bash.sh | bash
```

**Windows PowerShell**

```powershell
irm https://raw.githubusercontent.com/tower1229/LingXi/main/install/powershell.ps1 | iex
```

### Local Setup

To complete the LingXi memory loop locally, run:

```bash
node scripts/lx-bootstrap.mjs
```

This is the required local bootstrap step. It:

- `.lingxi/`
- `.codex/agents/lingxi-session-distill.toml`
- `.lingxi/setup/automation.session-distill.toml`
- registers the generated session-distill automation in Codex

The generated Codex automation and agent are runtime adapters over LingXi's host-agnostic memory core. They should launch the deterministic distill runner rather than manually picking sessions.

Without automation registration, the background memory distillation loop is not actually closed.

### Low-Level Commands

If you need to run the low-level steps separately for debugging or inspection:

```bash
node scripts/lingxi-setup.mjs
node scripts/lx-create-automation.mjs
node scripts/lx-distill-sessions.mjs
node scripts/lx-memory-brief.mjs --prompt "your current repository request"
```

or:

```bash
npm run lx:bootstrap
```

## Product Scope

LingXi 2.0 is intentionally focused.

Supported today:

- `task`
- `vet`
- `memory-retrieve`
- `memory-write`
- `session-distill`

Not the goal:

- a broad multi-step workflow suite
- heavy inline instrumentation on every turn
- a permanent Cursor-compatibility layer

## Quality Philosophy

LingXi is quality-first by design:

- prefer strong contracts over loose prompting
- prefer clear outputs over vague summaries
- prefer deterministic persistence and validation where stability matters
- prefer a narrow, trustworthy surface over a wider but weaker product

The current 2.0 release state is documented in:

- [Architecture](./docs/architecture.md)
- [Roadmap](./docs/lingxi-2-roadmap.md)
- [Quality Bar](./docs/quality-baseline.md)
- [Phase 5/6 Closure Plan](./docs/phase-5-6-closure-plan.md)
- [Memory Quality Deepening Status](./docs/memory-quality-deepening-status.md)

## Development

Run the supported product test suite:

```bash
npm test
```

LingXi treats green current-product tests and product-surface coherence as release gates.
