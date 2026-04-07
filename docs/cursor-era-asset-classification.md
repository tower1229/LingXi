# Cursor-Era Asset Classification

## Purpose

This document makes the remaining `.cursor/` material explicit.

It also makes the final repository target explicit:

- LingXi 2.0 should ultimately remove `.cursor/` content from the main product repository
- the current classification exists only to guide an orderly removal, not to justify indefinite retention

LingXi 2.0 does **not** treat any `.cursor/` path as supported product surface.

Supported 2.0 runtime and distribution live under:

- `.codex-plugin/`
- `skills/`
- `scripts/`
- `templates/`
- generated `.lingxi/`
- generated `.codex/agents/`

The remaining `.cursor/` tree exists only as historical reference or as short-term migration material during Phase 5/6 closure.

Final target:

- no supported runtime depends on `.cursor/`
- no shipped asset depends on `.cursor/`
- no active product claim depends on `.cursor/`
- the repository should eventually remove the `.cursor/` tree rather than keep it as a permanent sidecar

## Classification Rules

Use these buckets when deciding whether a `.cursor/` path should remain:

- `reference-only`: preserves original LingXi behavior, writing style, or heuristics that still inform 2.0 quality, but is not shipped or supported
- `migration-artifact`: not part of the supported 2.0 surface, but temporarily retained because it still informs or protects an in-flight closure area
- `delete-later`: old workflow or utility material with no intended place in the final 2.0 product story

There is currently no `.cursor/` path in the `supported product surface` bucket.

Every bucket below is temporary in a different way:

- `reference-only` means "keep only until the needed 2.0 knowledge is absorbed elsewhere"
- `migration-artifact` means "remove after the dependent closure work is finished"
- `delete-later` means "remove as soon as removal sequencing is safe"

## Asset Classification

### Reference-Only

These paths remain because they preserve original capability baselines that 2.0 still studies.

They are temporary and should either be:

- distilled into 2.0 docs/tests/contracts, then removed
- or archived outside the main repository, then removed from the working tree
 
- `.cursor/skills/task/`
- `.cursor/skills/vet/`
- `.cursor/skills/memory-retrieve/`
- `.cursor/skills/memory-write/`
- `.cursor/skills/about-lingxi/`
- `.cursor/skills/taste-recognition/`
- `.cursor/agents/lingxi-session-distill.md`
- `.cursor/agents/lingxi-memory-write.md`

Reason:

- they help explain what "good" looked like in the original system
- they still inform 2.0 quality alignment
- they are not installed, generated, or documented as live runtime

### Migration Artifacts

These paths are not part of the final 2.0 product, but still protect or inform unfinished closure work.

They should be removed as soon as their 2.0 replacements or retirement decisions are complete:

- `.cursor/hooks.json`
- `.cursor/hooks/`
- `.cursor/hooks/schemas/`
- `.cursor/agents/lingxi-self-iterate/`
- `.cursor/skills/memory-govern/`
- `.cursor/skills/workspace-bootstrap/`
- `.cursor/skills/task/scripts/latest-task-id.mjs`
- `.cursor/skills/task/scripts/next-task-id.mjs`
- local scratch directories such as `.cursor/.lingxi/`

Reason:

- they represent Cursor-era runtime mechanics or helper flows that still have test coverage
- some still preserve background-memory or legacy task-runtime behavior that Phase 5/6 work has not fully retired yet
- they should be reduced over time, not treated as stable 2.0 surface

### Delete-Later Candidates

These paths belong to the old broad Cursor workflow and should be removed from the main repository once archival value is judged low:

- `.cursor/skills/reviewer-doc-consistency/`
- `.cursor/skills/reviewer-e2e/`
- `.cursor/skills/reviewer-performance/`
- `.cursor/skills/reviewer-security/`
- `.cursor/skills/testcase-designer/`

Reason:

- they encode the retired broad Cursor-era workflow rather than the narrow 2.0 `task` / `vet` workflow
- they are not part of the install surface
- current architecture and roadmap do not describe them as part of the final 2.0 product

Completed removals:

- `.cursor/skills/ask-questions/`
- `.cursor/skills/plan/`
- `.cursor/skills/build/`
- `.cursor/skills/review/`
- `.cursor/skills/reviewer-doc-consistency/`
- `.cursor/skills/reviewer-e2e/`
- `.cursor/skills/reviewer-performance/`
- `.cursor/skills/reviewer-security/`
- `.cursor/skills/testcase-designer/`
- `.cursor/skills/skill-creator/`
- `.cursor/commands/`
- `.cursor/agents/lingxi-memory-write.md`
- `.cursor/agents/lingxi-self-iterate.md`

## Test Ownership

### Current 2.0 Product Tests

These primarily protect the supported LingXi 2.0 surface:

- `test/scripts/codex-plugin-shape.test.mjs`
- `test/scripts/install-manifest-*.test.mjs`
- `test/scripts/product-surface-coherence.test.mjs`
- `test/scripts/lingxi-setup.test.mjs`
- `test/scripts/lingxi-memory-*.test.mjs`
- `test/scripts/lingxi-task.test.mjs`
- `test/scripts/lingxi-vet.test.mjs`
- `test/scripts/task-*.test.mjs`
- `test/scripts/vet-*.test.mjs`
- `test/scripts/hybrid-contract-docs.test.mjs`
- `test/scripts/lx-uninstall.test.mjs`

Operationally:

- `npm test` should map to this suite

### Historical Reference Or Migration Tests

These still provide value, but they protect `.cursor/` behavior rather than the supported 2.0 runtime:

- `test/legacy/hooks/*.test.mjs`
- `test/legacy/skills/workspace-bootstrap.test.mjs`
- `test/legacy/skills/task-id.test.mjs`
- `test/legacy/skills/memory-governance-decision.test.mjs`
- `test/legacy/skills/memory-index-sync.test.mjs`
- `test/legacy/skills/governance-context-validator.test.mjs`
- `test/legacy/skills/memory-fusion-strength-contract.test.mjs`
- `test/legacy/scripts/memory-improvement-proposal.test.mjs`
- `test/legacy/scripts/memory-improvement-apply.test.mjs`

Recommended direction:

- keep them green while they still inform migration work
- eventually move them under a clearly named historical or legacy test area
- then remove them once the equivalent 2.0 surface is either retired or re-expressed in supported contracts

Operationally:

- `npm run test:legacy` should map to this suite
- `npm run test:all` should run both current and legacy suites during repository retirement work

## Current Repository Policy

- `.cursor/` is a historical directory, not a supported runtime surface
- no installer or setup flow should depend on `.cursor/`
- docs may cite `.cursor/` only as reference or migration context
- new 2.0 features should not be added under `.cursor/`
- the end state is full removal of `.cursor/` from the main repository

## Next Reduction Targets

The next high-value cleanup targets are:

1. move historical test ownership out of the main "current product" mental model
2. retire Cursor hook/runtime artifacts once Phase 5 background memory productization no longer depends on them as reference
3. archive or absorb any remaining reference value, then remove the old broad workflow skills from the main repository tree

Most recent completed removal slice:

- first-wave broad workflow skills (`ask-questions`, `plan`, `build`, `review`)
- second-wave reviewer/testcase skills (`reviewer-doc-consistency`, `reviewer-e2e`, `reviewer-performance`, `reviewer-security`, `testcase-designer`)
- third-wave command/agent-doc removals (`commands`, `lingxi-memory-write.md`, `lingxi-self-iterate.md`)
- fourth-wave toolchain removal (`skill-creator`)

## Removal End State

Phase 6 closure should be considered complete only when:

1. `.cursor/` no longer exists as a live directory in the main repository
2. any retained historical material has been moved to separate archival storage or fully absorbed into 2.0 docs/tests/contracts
3. the active test suite no longer requires `.cursor/` paths
