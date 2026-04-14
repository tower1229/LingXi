# LingXi Codex / Claude Code Compatibility Research

Research date: 2026-04-09

## Goal

Validate whether LingXi's current Codex-oriented architecture can evolve into a host-adapter design that still supports a future Claude Code integration without rewriting the durable memory core.

This document focuses on:

- session distillation
- durable memory retrieval/write
- project instructions
- reusable workflow packaging
- background execution / automation
- subagent usage

## Executive Summary

The main conclusion is:

- LingXi's semantic core is portable.
- The current Codex integration surface is not portable as-is.
- Future Claude Code compatibility is feasible if LingXi treats host behavior as an adapter layer instead of baking Codex runtime assumptions into the product core.

The biggest portability gap is background automation:

- Codex app has first-class recurring automations.
- Claude Code docs currently expose hooks, skills, subagents, GitHub Actions, and SDK-based automation, but I did not find an equivalent built-in local recurring scheduler in the official Claude Code docs.

That means the right long-term architecture is:

1. keep `task`, `vet`, `memory-retrieve`, `memory-write`, and `distill-session` as host-agnostic scripts/contracts
2. isolate host-specific concerns into adapters
3. treat background scheduling as a Codex-specific adapter now and an external-runner/SDK adapter for future Claude Code

## Current LingXi Coupling To Codex

Today the repository is explicitly Codex-native in several places:

- product shell uses `.codex-plugin/plugin.json`
- setup generates `.codex/agents/lingxi-session-distill.toml`
- setup generates `.lingxi/setup/automation.session-distill.toml`
- bootstrap registers a Codex automation
- runtime guidance is emitted as `AGENTS.md`

This is aligned with the current architecture docs, which describe LingXi 2.0 as a Codex-native plugin with runtime roots under `.lingxi/` and `.codex/agents/`.

Important existing design decision already points in the right direction:

- the architecture says memory consumption should stay host-agnostic and Codex / future Claude Code should be treated as adapter layers over the same memory core

That principle should be extended from memory consumption to the full session-distill pipeline.

## Official Capability Findings

### 1. Project instructions

Codex:

- Codex reads `AGENTS.md` before doing work and layers global plus project-specific instruction files.
- Codex supports nested project overrides and configurable fallback filenames.

Claude Code:

- Claude Code reads `CLAUDE.md`, not `AGENTS.md`.
- Claude docs explicitly recommend creating `CLAUDE.md` that imports `AGENTS.md` if a repository already uses `AGENTS.md`.

Feasibility verdict:

- High.
- LingXi can keep one canonical project guidance document and generate/import the host-specific wrapper.

Best future shape:

- keep repository guidance canonical in `AGENTS.md`
- generate `CLAUDE.md` that imports `@AGENTS.md` plus any Claude-specific notes

### 2. Reusable workflow packaging

Codex:

- Skills are the reusable workflow authoring format.
- Skills are available in the Codex CLI, IDE extension, and Codex app.
- A skill is a directory with `SKILL.md` plus optional scripts/references/assets.

Claude Code:

- Claude Code also supports skills using `SKILL.md`.
- Project skills live under `.claude/skills/<skill-name>/SKILL.md`.
- Claude's skills follow the open Agent Skills standard and support scripts/supporting files.

Feasibility verdict:

- High.
- LingXi's skill authoring model is portable.

Main difference:

- Codex repo skills are discovered under `.agents/skills`
- Claude repo skills are discovered under `.claude/skills`

Implication:

- LingXi should separate "skill source" from "host install path"
- a build/install step can materialize the same skill into different host folders

### 3. Subagents / custom agents

Codex:

- Codex subagent workflows are available by default.
- Codex only spawns subagents when explicitly asked.
- Project-scoped custom agents live in `.codex/agents/*.toml`.

Claude Code:

- Claude Code supports project subagents in `.claude/agents/`.
- Claude subagents are Markdown files with YAML frontmatter.
- Claude also supports session-scoped agent definitions through `--agents`.

Feasibility verdict:

- High.
- A session-distill helper agent is viable in both ecosystems.

Important difference:

- Codex custom agents are TOML config layers.
- Claude custom agents are Markdown/YAML prompt artifacts with different fields and behavior.

Implication:

- LingXi should not make the agent file format part of the product core.
- Instead, define an abstract `session_distill_agent` contract and generate host-specific artifacts.

### 4. Background automation / unattended execution

Codex:

- Codex app has first-class recurring automations.
- Automations run in the background in the Codex app.
- They can run in the local project or a dedicated worktree.
- They can combine with skills.
- They can run unattended with sandbox / approval controls.

Claude Code:

- Claude Code documentation clearly supports automation via GitHub Actions and the Claude Agent SDK.
- Claude Code also supports hooks at lifecycle points like `SessionStart`, `SubagentStop`, and `SessionEnd`.
- Claude Code overview describes automation from developer machines or automatically in CI.

What I did not find:

- an official Claude Code equivalent to Codex app's built-in recurring local automation scheduler
- an official Claude Code product concept matching "create a cron-like recurring task inside the app"

Feasibility verdict:

- Codex-style recurring automation is feasible now in Codex.
- Future Claude compatibility is feasible, but likely through external scheduling, not a built-in Claude app/local scheduler.

Best future shape:

- Codex adapter: use native app automations
- Claude adapter: use one of
  - GitHub Actions
  - OS scheduler calling `claude -p` / Claude SDK
  - a LingXi-owned runner that invokes Claude Code or Claude Agent SDK

Important architectural conclusion:

- scheduling must be an adapter concern, not a LingXi core concern

### 5. Session artifact / transcript access

Codex:

- Codex automation docs include examples that scan `~/.codex/sessions` files.
- This strongly suggests session-file-based analysis is a supported practical pattern inside Codex automations.

Claude Code:

- Hook payloads include `session_id` and `transcript_path`.
- Claude stores project auto memory under `~/.claude/projects/<project>/memory/`.

Feasibility verdict:

- Medium to high.
- Both hosts expose enough local/session data to support a session-distill source pipeline.

Important nuance:

- Codex's recurring automations make session scanning a native workflow pattern.
- Claude's cleanest documented transcript handoff is hook-based or SDK/CI-based, not built-in recurring local automation.

Practical recommendation:

- define a host adapter interface that returns candidate session artifacts
- do not let `distill-session` know where sessions came from

### 6. Setup/bootstrap/environment prep

Codex:

- Codex app local environments support setup scripts for worktrees and common actions.
- This is a strong fit for LingXi's runtime/bootstrap behavior in Codex.

Claude Code:

- Claude Code uses project instructions, settings, hooks, and skills; `/init` can scaffold `CLAUDE.md`, skills, and hooks.
- Claude GitHub Actions and SDK provide programmatic automation paths.

Feasibility verdict:

- High.
- Bootstrap is portable conceptually, but not as one identical artifact set.

Implication:

- LingXi should split bootstrap into:
  - core runtime scaffold under `.lingxi/`
  - host-specific scaffolding (`.codex/...`, `AGENTS.md`, `.claude/...`, `CLAUDE.md`, workflow files, etc.)

### 7. Durable memory model

Codex:

- LingXi currently persists durable memory into `.lingxi/memory/`.

Claude Code:

- Claude has its own auto memory and `CLAUDE.md`.

Feasibility verdict:

- High, if LingXi keeps its own memory store.

Important caution:

- Claude auto memory is not a drop-in replacement for LingXi memory.
- Claude auto memory is host-managed behavior memory; LingXi memory is product-owned engineering memory with explicit note/index/state contracts.

Recommendation:

- do not replace `.lingxi/memory/` with Claude auto memory
- Claude auto memory may be useful as optional glue, but should not become LingXi's source of truth

## Compatibility Matrix

| Capability | Codex | Claude Code | Portability |
| --- | --- | --- | --- |
| Canonical project guidance | `AGENTS.md` | `CLAUDE.md` with `@AGENTS.md` import possible | High |
| Reusable skills with scripts | Yes | Yes | High |
| Project-scoped subagents | `.codex/agents/*.toml` | `.claude/agents/*.md` | High |
| Native recurring local automations | Yes | Not found in official docs | Low as-is |
| Programmatic automation path | Yes | Yes via SDK / GitHub Actions | Medium-high |
| Worktree-oriented unattended runs | Yes, documented in automations | Possible via git / CI patterns, but not equivalent first-class scheduler docs found | Medium |
| Session transcript access for distill | Practical via session files | Practical via hook `transcript_path` | Medium-high |
| Durable LingXi memory store | Yes | Yes | High |

## Recommended Technical Direction

### A. Freeze the product core around host-agnostic contracts

The following should remain host-agnostic:

- `.lingxi/memory/`
- `.lingxi/state/processed-sessions.json`
- note schema / index schema
- `memory-retrieve`
- `memory-write`
- `distill-session`
- future deterministic session selector

These contracts should not mention:

- `.codex`
- `.claude`
- `AGENTS.md`
- `CLAUDE.md`
- Codex app automations
- Claude hooks

### B. Introduce explicit host adapters

Recommended adapter surface:

- `project_instructions_adapter`
  - Codex: `AGENTS.md`
  - Claude: `CLAUDE.md` importing `AGENTS.md`
- `skills_adapter`
  - Codex: materialize under `.agents/skills`
  - Claude: materialize under `.claude/skills`
- `subagent_adapter`
  - Codex: `.codex/agents/*.toml`
  - Claude: `.claude/agents/*.md`
- `automation_adapter`
  - Codex: native app automation
  - Claude: GitHub Actions / SDK / external scheduler
- `session_source_adapter`
  - Codex: scan session artifacts
  - Claude: hook-provided transcript path or runner-provided transcript inventory

### C. Do not make hooks the primary memory architecture

For future Claude compatibility, hooks are useful but should stay auxiliary.

Good use of Claude hooks:

- `SessionStart` to inject active LingXi memory brief
- `SessionEnd` or `SubagentStop` to enqueue transcript metadata for later distillation
- observability / safety guardrails

Bad use of Claude hooks:

- turning every session into inline memory distillation
- replacing deterministic LingXi state updates with hook side effects

This is also consistent with LingXi's current non-goal of not depending on hooks as the main memory mechanism.

### D. Treat recurring session distillation as a host-dependent orchestration layer

Best design:

- `distill-session` remains a pure worker over normalized session JSON
- a host-specific runner finds sessions and invokes it

Recommended future Claude runner options, in priority order:

1. Claude Agent SDK or GitHub Actions runner
2. OS-level scheduler invoking a LingXi wrapper script
3. hook-assisted queueing plus external runner

Not recommended as the first future step:

- trying to force Claude hooks alone to emulate Codex recurring automations

## Concrete Implications For LingXi Refactor

### Short-term, for Codex-only implementation

The current Codex implementation remains viable if we make one architectural correction:

- stop treating Codex automation/subagent artifacts as part of the semantic core

Recommended next step:

- extract a deterministic `session selector` script
- let Codex automation + subagent become a thin orchestration shell around that script

Current repository status after the Codex-first implementation:

- the Codex path uses a deterministic selector + runner shape
- Codex automation/subagent artifacts act as adapters over LingXi memory core
- future Claude support still needs only host-specific session source / automation / instruction wrappers

### Medium-term, for Claude compatibility

When Claude support starts, the first deliverable should not be a full product port.

The first useful compatibility milestone is:

1. generate `CLAUDE.md` that imports `AGENTS.md`
2. mirror one or two LingXi skills into `.claude/skills/`
3. create one project subagent in `.claude/agents/` for session distill or review support
4. prove a non-native automation path using GitHub Actions or SDK
5. keep `.lingxi/` as the durable source of truth

That milestone would validate the host-adapter split before attempting a fully polished Claude distribution.

## Risks And Open Questions

### High-confidence findings

- Skills are portable across Codex and Claude Code.
- Project subagents are portable in concept.
- Project instruction files are portable with an adapter (`AGENTS.md` -> `CLAUDE.md` import).
- LingXi memory should remain product-owned.

### Medium-confidence findings

- Claude transcript-driven session distillation is feasible through hooks and/or SDK-driven runners.
- Claude can support a future background distill loop, but not with the same built-in ergonomics as Codex app automations.

### Key open question

- What is the best future Claude session-source strategy?

Most plausible options are:

- GitHub Actions + repository events
- local cron / launchd / Task Scheduler invoking a LingXi wrapper
- Claude hook that appends transcript metadata into a LingXi queue consumed later by a deterministic runner

This should be validated with a small future proof-of-concept rather than assumed.

## Recommendation

Proceed with the Codex implementation, but immediately refactor toward a host-adapter architecture.

Specifically:

1. keep `.lingxi/` contracts host-agnostic
2. keep `distill-session` and memory scripts host-agnostic
3. add a deterministic session selector
4. define generated artifacts per host instead of hard-coding Codex runtime assumptions into the product core
5. plan future Claude support around:
   - `CLAUDE.md` importing `AGENTS.md`
   - `.claude/skills`
   - `.claude/agents`
   - external scheduling via SDK / GitHub Actions / OS scheduler

This path is technically feasible and gives LingXi a realistic route to Claude Code without undoing the current Codex productization work.

## Implementation Status

Updated: 2026-04-13

The following items from the research recommendations have been implemented:

| Item | Status | Notes |
| --- | --- | --- |
| Host-agnostic `.lingxi/` contracts | Done | Memory core, state, notes, index are fully host-agnostic |
| Host-agnostic `distill-session` worker | Done | Single-session worker takes normalized `{ session_id, messages }` |
| Deterministic session selector | Done | `_lingxi-codex-session-select.mjs` and `_lingxi-claude-session-select.mjs` |
| Claude Code session source adapter | Done | `_lingxi-claude-sessions.mjs` scans `~/.claude/projects/<encoded-path>/` |
| Claude Code semantic runner | Done | `_lingxi-claude-semantic-runner.mjs` uses `claude -p --output-format json` |
| Host-aware runner resolution | Done | `resolveRunner()` auto-detects via `CLAUDE_PROJECT_DIR` |
| Unified hook script | Done | Single `lx-memory-hook.mjs` with host detection |
| `CLAUDE.md` importing `AGENTS.md` | Done | Generated by `lingxi-setup.mjs --host claude` |
| Skills mirrored to `.claude/skills/` | Done | Copied during setup |
| Claude Code subagent for session distill | Done | `.claude/agents/lingxi-session-distill.md` |
| Background distill scheduling for Claude | Done | Hook-triggered with time-based interval check |
| `--host` flag on distill/select scripts | Done | `lx-distill-sessions.mjs --host claude\|codex` |

### Key architectural decisions

- Claude Code background distillation uses hook-triggered scheduling (not external cron/Actions) as the simplest viable approach
- LLM semantic operations use host-native CLI tools (`codex exec` vs `claude -p`), not a shared API client
- Prompt meaningfulness assessment merged into LLM ranking call; only a trivial-prompt guard (empty/greeting) remains deterministic

## Sources

- OpenAI Codex app automations: [developers.openai.com/codex/app/automations](https://developers.openai.com/codex/app/automations)
- OpenAI Codex AGENTS.md guide: [developers.openai.com/codex/guides/agents-md](https://developers.openai.com/codex/guides/agents-md)
- OpenAI Codex skills: [developers.openai.com/codex/skills](https://developers.openai.com/codex/skills)
- OpenAI Codex subagents: [developers.openai.com/codex/subagents](https://developers.openai.com/codex/subagents)
- OpenAI Codex local environments: [developers.openai.com/codex/app/local-environments](https://developers.openai.com/codex/app/local-environments)
- OpenAI Help Center overview of Codex app capabilities: [help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)
- Claude Code setup: [code.claude.com/docs/en/setup](https://code.claude.com/docs/en/setup)
- Claude Code subagents: [code.claude.com/docs/en/sub-agents](https://code.claude.com/docs/en/sub-agents)
- Claude Code skills: [code.claude.com/docs/en/slash-commands](https://code.claude.com/docs/en/slash-commands)
- Claude Code memory / `CLAUDE.md`: [code.claude.com/docs/en/memory](https://code.claude.com/docs/en/memory)
- Claude Code hooks: [code.claude.com/docs/en/hooks](https://code.claude.com/docs/en/hooks)
- Claude Code GitHub Actions: [code.claude.com/docs/en/github-actions](https://code.claude.com/docs/en/github-actions)
