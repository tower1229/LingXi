# Cursor-Era Asset Classification

## Purpose

This document makes the remaining `.cursor/` material explicit.

LingXi 2.0 does **not** treat any `.cursor/` path as supported product surface.

Supported 2.0 runtime and distribution live under:

- `.codex-plugin/`
- `skills/`
- `scripts/`
- `templates/`
- generated `.lingxi/`
- generated `.codex/agents/`

The remaining `.cursor/` tree exists only as historical reference or as short-term migration material during Phase 5/6 closure.

## Classification Rules

Use these buckets when deciding whether a `.cursor/` path should remain:

- `reference-only`: preserves original LingXi behavior, writing style, or heuristics that still inform 2.0 quality, but is not shipped or supported
- `migration-artifact`: not part of the supported 2.0 surface, but temporarily retained because it still informs or protects an in-flight closure area
- `delete-later`: old workflow or utility material with no intended place in the final 2.0 product story

There is currently no `.cursor/` path in the `supported product surface` bucket.

## Asset Classification

### Reference-Only

These paths remain because they preserve original capability baselines that 2.0 still studies:

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

These paths are not part of the final 2.0 product, but still protect or inform unfinished closure work:

- `.cursor/hooks.json`
- `.cursor/hooks/`
- `.cursor/hooks/schemas/`
- `.cursor/agents/lingxi-self-iterate/`
- `.cursor/commands/`
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

These paths belong to the old broad Cursor workflow and should not remain indefinitely once archival value is judged low:

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
- `.cursor/agents/lingxi-self-iterate.md`

Reason:

- they encode the retired broad Cursor-era workflow rather than the narrow 2.0 `task` / `vet` workflow
- they are not part of the install surface
- current architecture and roadmap do not describe them as part of the final 2.0 product

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

### Historical Reference Or Migration Tests

These still provide value, but they protect `.cursor/` behavior rather than the supported 2.0 runtime:

- `test/hooks/*.test.mjs`
- `test/skills/workspace-bootstrap.test.mjs`
- `test/skills/task-id.test.mjs`
- `test/skills/memory-governance-decision.test.mjs`
- `test/skills/memory-index-sync.test.mjs`
- `test/skills/governance-context-validator.test.mjs`
- `test/skills/memory-fusion-strength-contract.test.mjs`
- `test/scripts/memory-improvement-proposal.test.mjs`
- `test/scripts/memory-improvement-apply.test.mjs`

Recommended direction:

- keep them green while they still inform migration work
- eventually move them under a clearly named historical or legacy test area
- remove them once the equivalent 2.0 surface is either retired or re-expressed in supported contracts

## Current Repository Policy

- `.cursor/` is a historical directory, not a supported runtime surface
- no installer or setup flow should depend on `.cursor/`
- docs may cite `.cursor/` only as reference or migration context
- new 2.0 features should not be added under `.cursor/`

## Next Reduction Targets

The next high-value cleanup targets are:

1. move historical test ownership out of the main "current product" mental model
2. retire Cursor hook/runtime artifacts once Phase 5 background memory productization no longer depends on them as reference
3. evaluate whether the old broad workflow skills should be archived outside the main repository tree
