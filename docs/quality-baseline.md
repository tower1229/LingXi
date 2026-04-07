# LingXi 2.0 Quality Bar

## Purpose

This document defines the highest quality bar LingXi 2.0 should meet for work that is already in scope.

The goal is not to push roadmap phases quickly.

The goal is:

- align in-progress LingXi 2.0 capabilities to the best quality we can realistically achieve under current constraints
- prevent regressions while the system is being rebuilt
- require explicit evidence before moving to the next step

This bar is the release gate for current-scope work.

---

## Working Rule

For any capability that already exists in LingXi 2.0:

- do not expand scope before its current quality is aligned
- do not replace a legacy quality guarantee unless the new path is clearly stronger or equally strong with cleaner tradeoffs
- do not accept "functionally works" as sufficient if the output is less clear, less safe, less operable, or less professional than the best version we can currently deliver
- do not stop at parity if current LingXi 2.0 architecture can support a better contract, clearer output, or stronger safety without major scope expansion

If evidence is mixed, treat the capability as **not yet aligned**.

The question is not:

- is this good enough to continue?

The question is:

- is this the strongest version we can responsibly ship at this stage?

### What "Highest Current Quality" Means

"Highest current quality" does not mean:

- infinite redesign
- waiting for every future roadmap abstraction to exist
- refusing to ship until the system is perfect

It means:

- within the current scope, current architecture, and current available time budget for this step, choose the strongest reasonable contract
- prefer clarity, safety, legibility, and operational reliability over speed of progression
- only accept tradeoffs that are explicit and justified

---

## Evidence Sources

Current LingXi 2.0 target direction:

- `docs/architecture.md`
- `docs/lingxi-2-roadmap.md`
- `.codex-plugin/plugin.json`

Legacy quality reference:

- `.cursor/skills/task/SKILL.md`
- `.cursor/skills/vet/SKILL.md`
- `.cursor/skills/memory-retrieve/SKILL.md`
- `.cursor/skills/memory-write/SKILL.md`
- `.cursor/agents/lingxi-session-distill.md`

Current 2.0 implementation surface:

- `scripts/lingxi-setup.mjs`
- `scripts/_lingxi-memory.mjs`
- `skills/task/scripts/write-task.mjs`
- `skills/vet/scripts/vet-task.mjs`
- `skills/memory-retrieve/scripts/retrieve-memory.mjs`
- `skills/memory-write/scripts/write-memory.mjs`
- `skills/session-distill/scripts/distill-session.mjs`

---

## Quality Dimensions

Each in-scope capability must satisfy all six dimensions below before it is considered aligned.

### 1. Functional Integrity

- The capability completes its primary job end to end.
- Required artifacts are actually created, updated, or returned.
- Expected failure cases are handled intentionally.

### 2. Deterministic Contract

- Stable fields, file paths, and runtime data shapes are preserved.
- Outputs are machine-usable, not only conversationally plausible.
- Persistence logic is repeatable and idempotent where expected.

### 3. Fail-Fast Quality

- Missing or weak input is surfaced early.
- Errors are grouped when possible instead of dribbling out one-by-one.
- Rejection messages make the next fix obvious.

### 4. High-Signal Output Quality

- Output is concise but actionable.
- Important decisions and risks are explicit.
- The user should not need to reverse-engineer what the tool meant.

### 5. State Safety

- Runtime state, IDs, dedupe, and merge/update behavior are correct.
- Repeated runs should not silently corrupt or duplicate state.
- Side effects must be legible and auditable.

### 6. Product Coherence

- Docs, install surface, versioning, and runtime entrypoints match reality.
- The repository should not claim one product shape while shipping another.

---

## Capability Quality Bars

## 1. `task`

Legacy quality signals to preserve:

- project context is read before task writing
- required information is clarified or rejected early
- task IDs and titles are deterministic
- acceptance criteria are binary and testable
- every functional requirement is structurally complete
- output is a usable execution starting point, not a vague summary

Highest current LingXi 2.0 quality bar:

- Must reject missing `goal`, `scope`, `constraints`, and `acceptance_criteria`.
- Must reject broad or vague scope instead of compiling weak markdown.
- Must enforce binary acceptance criteria.
- Must require richer framing for non-trivial tasks.
- Must preserve deterministic task file creation and update behavior.
- Must preserve update/changelog behavior when vet feedback changes the task.
- Must produce a task document that is directly usable for implementation handoff.

Evidence required before calling `task` aligned:

- creation flow test
- update flow test
- fail-fast test for vague acceptance criteria
- fail-fast test for missing non-trivial framing
- repository-context detection test
- regression samples compared against legacy task quality expectations

Current release gate:

- task framing is at least as sharp as legacy `task`
- functional requirement rows are complete, legible, and directly actionable
- vague or non-binary task outputs are aggressively blocked
- current implementation quality is strong enough that a careful user would prefer using it over the legacy path for the same scenario

## 2. `vet`

Legacy quality signals to preserve:

- latest-task fallback
- dimension-based review depth
- explicit readiness judgment
- concrete issue prioritization
- review stays at task-framing level, not code-review drift

Highest current LingXi 2.0 quality bar:

- Must adapt review depth by type and complexity.
- Must surface readiness, findings, and next action clearly.
- Must catch ambiguity, missing constraints, weak acceptance criteria, and hidden breadth.
- Must keep findings actionable rather than essay-like.
- Must preserve structured review output stability.

Evidence required before calling `vet` aligned:

- latest-task fallback test
- ambiguity detection test
- docs-tag review coverage test
- SDK-tag review coverage test
- repo-context mismatch test
- regression samples showing findings remain concrete and ranked

Current release gate:

- review specificity is at least as strong as legacy `vet`
- readiness judgment is explicit enough to drive the next decision without interpretation work
- structured review stays structured and high-signal
- findings are strong enough that the review feels like a serious pre-implementation quality check, not a lightweight lint pass

## 3. `memory-retrieve`

Legacy quality signals to preserve:

- retrieve only when it is meaningful
- keep hits minimal and high-signal
- favor practical decision support over archive display
- avoid full-store scanning as the user-facing behavior

Highest current LingXi 2.0 quality bar:

- Must return a small set of relevant hits rather than dumping memory.
- Must preserve project-memory preference when relevance is similar.
- Must be useful before `task` and `vet`, not merely technically correct.
- Must remain deterministic enough for tests and downstream use.

Evidence required before calling `memory-retrieve` aligned:

- relevance-ranking test
- minimal-hit-count behavior test
- project-vs-share preference test
- regression samples against known queries

Current release gate:

- retrieval precision is high enough that hits feel intentionally selected
- over-retrieval is avoided even when recall is preserved
- downstream task/vet work is measurably improved by the retrieved notes

## 4. `memory-write`

Legacy quality signals to preserve:

- strict input validation
- durable-signal bias over noisy notes
- dedupe/merge discipline
- index consistency after writes

Highest current LingXi 2.0 quality bar:

- Must reject malformed memory input.
- Must preserve compact note structure.
- Must merge materially identical durable signals instead of duplicating them.
- Must rebuild and keep `INDEX.md` in sync after writes.
- Must keep note IDs stable and monotonic.

Evidence required before calling `memory-write` aligned:

- create-note test
- merge-identical-note test
- index-sync test
- unsupported-kind rejection test
- regression samples for note readability

Current release gate:

- duplicate explosion is prevented even under repeated or similar writes
- index drift is not tolerated after normal writes
- notes remain compact, readable, and genuinely reusable
- stored memory quality is selective enough that future retrieval quality improves rather than degrades

## 5. `session-distill`

Legacy quality signals to preserve:

- distill durable engineering taste, not conversation summaries
- process sessions in the background pattern
- avoid duplicate reprocessing
- complete state cleanup/update reliably

Highest current LingXi 2.0 quality bar:

- Must extract only durable, reusable signals.
- Must skip unchanged sessions by fingerprint and version.
- Must update processed-session state correctly.
- Must write resulting memory through the normal memory path.
- Must prefer precision over aggressive note creation.

Evidence required before calling `session-distill` aligned:

- writes-durable-notes test
- duplicate-skip test
- no-signal skip test
- state update test
- regression samples proving it avoids one-off chatter

Current release gate:

- dedupe safety is reliable across repeated runs
- extracted notes are durable signals, not disguised summaries
- state updates are correct and auditable
- note creation is conservative enough that distillation improves memory quality instead of polluting it

## 6. `setup`

Legacy quality signals to preserve:

- bootstrap is deterministic
- rerunning setup is safe
- runtime roots are created consistently

Highest current LingXi 2.0 quality bar:

- Must create the expected `.lingxi/` runtime skeleton.
- Must create processed-session state and memory index.
- Must create the project-local distill agent file.
- Must avoid overwriting existing `AGENTS.md`.
- Must be safe to rerun.

Evidence required before calling `setup` aligned:

- runtime skeleton creation test
- idempotent rerun test
- existing `AGENTS.md` preservation test
- generated-file shape validation

Current release gate:

- rerun safety is trustworthy
- runtime contracts are complete immediately after setup
- setup output is clean enough that it can serve as the canonical bootstrap path for the 2.0 product

## 7. `install` and Product Surface

This is not a future cleanup-only concern.

It is a current quality concern because users experience the shipped surface, not just internal scripts.

Highest current LingXi 2.0 quality bar:

- Product identity, README, install flow, and shipped runtime surface must agree.
- Codex-native claims must not ship primarily Cursor-first distribution paths.
- Versioning must not describe two product generations at once.

Evidence required before calling product surface aligned:

- install path review
- manifest review
- README review
- version consistency review

Current release gate:

- no mixed-generation product state
- no mismatch between claimed platform and shipped platform surface
- a new user can understand, install, and evaluate LingXi without encountering architectural contradiction

---

## Step Release Gates

Use the following gate before moving any in-scope capability forward.

### Gate A: Contract Gate

- Are input and output contracts explicit?
- Are persisted artifacts stable?
- Are failure paths intentionally defined?
- Is the contract as clean and durable as we can reasonably make it now?

### Gate B: Legacy Quality Gate

- Does the current path preserve the practical quality of the original flow?
- Is the new output as clear, bounded, and actionable as we can currently make it?
- Has any implicit original safeguard been lost?
- If we stopped here, would we feel proud to make this the standard path?

### Gate C: Test Gate

- Do automated tests cover the mainline, failure path, and regression path?
- Are known red tests resolved before further expansion?
- Does the test set reflect the current product surface rather than only legacy leftovers?
- Is the evidence strong enough to justify saying quality is aligned, not merely plausible?

### Gate D: Coherence Gate

- Do docs describe the real behavior?
- Does install/distribution ship the same product the docs describe?
- Are version labels and runtime paths coherent?
- Would an external evaluator see one product, not two overlapping generations?

Advance only when all four gates pass at a high-confidence level.

---

## Execution Order

Recommended order for quality-first work:

1. fix red tests and version/surface contradictions
2. align `setup`, `task`, `vet`, `memory-write`, `memory-retrieve`, `session-distill`
3. align install and README to the real 2.0 product shape
4. only then start `TaskSpec` / `VetReport` hybrid upgrades

This avoids rebuilding on top of an unstable quality bar.

---

## Do Not Advance If

- tests are red on known current-scope paths
- product docs still describe a different workflow than the shipped one
- a rewritten path is "cleaner" but less strict than the original
- a new abstraction removes user-facing clarity
- a migration step leaves the repository in a mixed-generation state
- the work is merely acceptable but still obviously below the strongest standard we can currently achieve

---

## How To Use This Document

For each planned change:

1. identify which capability this change touches
2. list the baseline bullets that must still hold after the change
3. add or update tests for the relevant evidence set
4. verify contract gate, legacy quality gate, test gate, and coherence gate
5. only then move to the next roadmap step

If a change cannot satisfy this quality bar, it should be treated as incomplete rather than "good enough for now".
