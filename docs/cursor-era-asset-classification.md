# Cursor-Era Asset Classification

## Final State

Cursor-era repository content has now been removed from the main LingXi repository.

This document remains as the closure record for that retirement work.

LingXi 2.0 now treats the following as the supported product surface:

- `.codex-plugin/`
- `skills/`
- `scripts/`
- `templates/`
- generated `.lingxi/`
- generated `.codex/agents/`

No active runtime, shipped asset, or supported test suite depends on `.cursor/` paths.

## What Was Preserved

The repository did not keep `.cursor/` as a permanent sidecar.

Instead, the useful parts were absorbed into:

- current 2.0 skill implementations
- contract and regression tests under `test/scripts/`
- architecture, roadmap, and quality documents under `docs/`

That includes the original quality signals that informed:

- `task` / `vet` capability alignment
- memory write/retrieve quality expectations
- repository retirement sequencing

## Retirement Outcome

The retirement work is complete in the main repository:

- `.cursor/` no longer exists as a live directory
- `.cursor-plugin/` no longer remains as a shipped plugin surface
- no active test suite requires `.cursor/` paths
- the historical `test/legacy/` suite has been retired together with the final `.cursor/` remnants
- repository docs now describe one Codex-native product shape instead of a dual-tree transition state

## Completed Removal Slices

- broad workflow skills (`ask-questions`, `plan`, `build`, `review`)
- reviewer/testcase skills
- command and agent docs
- toolchain and self-iterate runtime assets
- reference docs that were no longer needed in-tree
- hook runtime and session-init mechanics
- migration utilities such as `memory-govern` and `workspace-bootstrap`
- final reference implementations for Cursor-era `task`, `vet`, `memory-retrieve`, `memory-write`
- local Cursor-era scratch content such as `.cursor/.lingxi/`

## Phase 6 Closure Gate

The repository-level Cursor retirement gate is now satisfied:

1. `.cursor/` no longer exists in the main repository
2. useful historical knowledge has been absorbed into 2.0 docs/tests/contracts
3. active repository validation runs only against the supported 2.0 surface
