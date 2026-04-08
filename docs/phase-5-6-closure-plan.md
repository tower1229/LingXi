# LingXi 2.0 Phase 5/6 Closure Plan

## Purpose

This document translates the current roadmap state into the next concrete development direction.

It assumes the following are already substantially complete:

- Codex-native product skeleton
- setup/bootstrap path
- memory core
- `task` / `vet` baseline
- `TaskSpec` / `VetReport` hybrid contract
- repair-loop behavior

That means the next step is no longer "keep expanding `task` / `vet` structure."

Repository retirement work now targets a closed, single-surface Codex-native repository.

The next step is:

1. keep the repository and shipped product surface coherent
2. make the background memory loop feel product-ready rather than merely implemented

Important end-state clarification:

- `.cursor/` is not meant to remain indefinitely as a permanent reference area
- Phase 6 should end with `.cursor/` content removed from the main product repository

---

## Current Read

Against [lingxi-2-roadmap.md](/mnt/c/Workspace/tower1229/LingXi/docs/lingxi-2-roadmap.md):

- `Phase 1` to `Phase 4.5` are effectively in place
- `Phase 5` exists at the capability level, but not yet fully productized
- `Phase 6` repository-retirement work should now be treated as a release gate, not an open redesign area

Against [architecture.md](/mnt/c/Workspace/tower1229/LingXi/docs/architecture.md):

- the intended narrow user-facing workflow is present
- the hybrid `task` / `vet` design is present
- the durable memory path is present
- the remaining gap is coherence, operability, and background-product finish

So the next development direction should be:

- close the final Phase 6 coherence gaps and keep them closed
- complete `Phase 5` productization of the background memory loop
- only after that return to deeper content-quality upgrades

---

## Priority Order

### Priority 1: Keep Phase 6 Repository And Product Coherence Closed

Goal:

- keep the repository, docs, tests, shipped assets, and runtime story describing the same product
- prevent any reintroduction of a dual-tree Codex-plus-Cursor repository shape

Why still first:

- current `task` / `vet` quality is already strong enough to continue
- the main repository-level risk is now regression back into ambiguity or mixed product surfaces
- Phase 5 work should happen on top of a clean, single-surface repository

Work packages:

1. Keep the supported product surface narrow
- ensure supported runtime/setup/install paths are only:
  - `.codex-plugin/`
  - `skills/`
  - `scripts/`
  - `templates/`
  - generated `.lingxi/`
  - generated `.codex/agents/`
- keep unsupported historical paths out of the working tree

2. Keep test ownership clean
- keep `npm test` mapped to the supported 2.0 product suite
- prevent retired migration suites from creeping back in
- express any future historical notes as docs or supported contract tests rather than a second runtime tree

3. Preserve the retirement outcome
- keep useful quality baselines absorbed into `docs/`, `skills/`, `scripts/`, or supported tests
- do not reintroduce `.cursor/` as a sidecar for convenience

Current progress:

- test ownership has been reduced to the current-product suite
- the first broad-workflow removal slice (`ask-questions`, `plan`, `build`, `review`) has been deleted from `.cursor/`
- the second reviewer/testcase removal slice (`reviewer-doc-consistency`, `reviewer-e2e`, `reviewer-performance`, `reviewer-security`, `testcase-designer`) has been deleted from `.cursor/`
- the third command/agent-doc removal slice (`.cursor/commands/*`, `lingxi-memory-write.md`, `lingxi-self-iterate.md`) has been deleted from `.cursor/`
- the fourth toolchain removal slice (`.cursor/skills/skill-creator/`) has been deleted from `.cursor/`
- the fifth self-iterate runtime slice (`.cursor/agents/lingxi-self-iterate/` plus related legacy tests and hook triggers) has been deleted from `.cursor/`
- the sixth reference-doc slice (`about-lingxi`, `taste-recognition`, `lingxi-session-distill.md`, and their legacy doc contract test) has been deleted from `.cursor/`
- the seventh session-init slice (`session-init.mjs`, `heartbeat-check.mjs`, and their legacy tests) has been deleted from `.cursor/`
- the eighth hook-runtime slice (`lingxi-audit`, `append-memory-audit`, hook schema, `hooks.json`, and remaining legacy hook tests) has been deleted from `.cursor/`
- the ninth migration-tool slice (`memory-govern`, `workspace-bootstrap`, and their legacy tests) has been deleted from `.cursor/`
- the tenth final-reference slice (remaining Cursor-era `task`, `vet`, `memory-retrieve`, `memory-write`, `.cursor/.lingxi`, and the last `test/legacy/` tests) has been deleted from the main repository

4. Final coherence pass for docs
- README
- install docs
- architecture
- roadmap
- quality docs
- ensure they all describe the same current product shape

Exit criteria:

- a new reader can identify the supported LingXi 2.0 surface without ambiguity
- no repository path appears simultaneously as "historical reference" and "supported runtime"
- current tests protect the real 2.0 surface rather than retired leftovers
- `.cursor/` no longer remains in the main repository as an active directory

Release gate:

- if a path is still shipped, tested, or documented as supported, it must be truly supported

---

### Priority 2: Phase 5 Background Memory Productization

Goal:

- turn `session-distill` + automation + memory write/read into a trustworthy background product loop

Why second:

- the logic exists already
- what remains is not first implementation, but product-level confidence
- memory is the real differentiator under both `task` and `vet`

Work packages:

1. Tighten automation contract
- align generated automation artifacts with current docs and templates
- make cadence/state behavior legible
- confirm what is generated locally vs what is only documented
Current progress:
- generated automation artifacts now carry explicit `FREQ=HOURLY;INTERVAL=6` cadence and link the state/journal files they operate on

2. Make distillation state more explainable
- processed-session behavior should be easy to inspect and reason about
- rerun / reprocess behavior should be intentional, not incidental
- versioned reprocessing rules should be documented and tested where needed
Current progress:
- `processed-sessions.json` now records state schema version, summary counters, last run metadata, and explicit run reasons such as `first_distill`, `content_changed`, and `distill_version_changed`

3. Verify end-user memory loop quality
- `task` should retrieve useful memory before drafting
- `vet` should retrieve useful memory before review
- `session-distill` should improve future task/vet quality instead of just writing notes
Current progress:
- `task` now auto-applies relevant memory into `Memory Applied` when the caller does not provide `memory_refs[]`
- `vet` now checks whether relevant repository memory exists but was ignored by the task
- regression coverage now proves a `session-distill -> task -> vet` path where distilled memory becomes visible to drafting and avoids stale-memory warnings

4. Strengthen low-intrusion background behavior
- keep the background path conservative
- avoid over-writing memory
- avoid noisy or low-value distillation
- preserve auditable state transitions

Exit criteria:

- the background loop is understandable, auditable, and conservative
- memory retrieval quality is visibly helpful in task/vet workflows
- reprocessing and dedupe behavior are explainable without reading source code

Release gate:

- background memory accumulation must improve downstream quality more often than it pollutes it

---

### Priority 3: Quality Deepening After Closure

Only start this after Priority 1 and Priority 2 are complete.

Goal:

- deepen content quality rather than expand structural scope

Candidate directions:

1. richer `task` guidance density
- stronger implementation sequencing
- stronger rollback / compatibility / integration specificity
- stronger docs/sdk delivery depth

2. richer `vet` judgment quality
- better false-positive control
- stronger solution-quality challenge
- stronger revision-package ranking

3. richer memory quality
- better retrieval relevance
- better session-distill selectivity
- better merge quality and promotion signals

This is where LingXi should improve craftsmanship, not product shape.

---

## Suggested Execution Sequence

1. keep docs/tests/install/runtime describing one Codex-native product story
2. tighten automation/session-distill/state contracts
3. verify background memory usefulness in real task/vet flows
4. only then resume content-quality deepening

---

## What Not To Do Next

- do not restart major `task` / `vet` schema expansion
- do not add new high-level workflow abstractions before repository coherence is finished
- do not add daemon/service complexity before the current automation path is fully productized
- do not treat historical `.cursor/` materials as both reference and supported runtime indefinitely
- do not normalize a permanent dual-tree repository shape where `.cursor/` stays forever

---

## Immediate Next Task

If work starts now, the best first concrete task is:

`Close the remaining repository-surface coherence gaps, then verify the background memory loop as a release-quality path.`

Current evidence anchors:

- [cursor-era-asset-classification.md](/mnt/c/Workspace/tower1229/LingXi/docs/cursor-era-asset-classification.md)
- [quality-baseline.md](/mnt/c/Workspace/tower1229/LingXi/docs/quality-baseline.md)

Immediate follow-up after this closure pass:

- keep `Phase 6` locked, then move directly into `Phase 5` productization and release hardening

---

## Completion Signal

This closure plan is complete when LingXi 2.0 can be described in one clean sentence:

"LingXi is a Codex-native plugin with a strong task/vet workflow and a conservative background memory loop, and the repository only ships what that sentence claims."

That sentence should be true without needing `.cursor/` to remain in the repository.
