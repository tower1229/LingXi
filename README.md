[中文](./README_ZH.md)

# LíngXī（灵犀）

**A workflow plugin for Codex and Claude Code that helps teams write sharper tasks, challenge weak plans before implementation, and accumulate durable engineering taste over time.**

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

- **Codex plugin surface** via [`.codex-plugin/plugin.json`](./.codex-plugin/plugin.json)
- **Claude Code adapter** via `.claude/settings.json`, `.claude/agents/`, `.claude/skills/`
- **Repo marketplace entry** in [`.agents/plugins/marketplace.json`](./.agents/plugins/marketplace.json)
- **Visible workflows** in [`skills/task/`](./skills/task/) and [`skills/vet/`](./skills/vet/)
- **Durable memory core** in [`skills/memory-distill/`](./skills/memory-distill/), [`skills/memory-retrieve/`](./skills/memory-retrieve/), [`skills/memory-write/`](./skills/memory-write/), and [`skills/session-distill/`](./skills/session-distill/)
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
- `skills/memory-distill/` is the canonical semantic source of truth for taste extraction, adjudication, and retrieval intent prompting
- the runtime no longer maintains a legacy prompt fallback path; `skill-spec.json` is the authoritative source for prompt/example versioning

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

If you used the remote install script above, local bootstrap already ran during installation, so you usually do not need to run it again.

If you installed the files manually, or want to rerun runtime / automation registration explicitly, run:

```bash
node scripts/lx-bootstrap.mjs
```

This step:

- `.lingxi/`
- `.codex/config.toml`
- `.codex/hooks.json`
- `.codex/agents/lingxi-session-distill.toml`

The generated Codex automation and agent are runtime adapters over LingXi's host-agnostic memory core. They should launch the deterministic distill runner rather than manually picking sessions.

Without automation registration, the background memory distillation loop is not actually closed.

### Low-Level Commands

If you need to run the low-level steps separately for debugging or inspection:

```bash
node scripts/lingxi-setup.mjs
node scripts/lx-distill-sessions.mjs
```

After setup, LingXi injects relevant memory automatically for meaningful repository turns through repo-local Codex `UserPromptSubmit` hooks when Codex hooks are active.

For semantic-runtime debugging only, you may override:

- `LINGXI_MEMORY_DISTILL_SKILL_DIR` to point at an alternate local `memory-distill` skill asset root
- `LINGXI_TMPDIR` to choose a writable temp root for structured semantic calls

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
