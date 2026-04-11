# Memory Quality Deepening Status

## Purpose

This document records the current state of LingXi memory quality deepening after the LLM-first rewrite.

It is the working reference for the next development step.

It should answer three questions:

- what is already complete
- what is intentionally fixed as the new baseline
- what should be done next without reopening settled architecture decisions

---

## Current Status

As of 2026-04-08, the memory mainline is now LLM-first rather than heuristic-first.

Validated status:

- `npm test` passes at `138/138`
- `session-distill`, `memory-write`, and `memory-retrieve` all use the shared semantic engine
- `skills/memory-distill/` is now the canonical semantic source of truth for extract, adjudicate, governance handoff, and retrieval intent prompting
- the mainline no longer keeps a legacy prompt fallback path
- `task` and `vet` already consume memory through the new semantic retrieval path

This means the repository is no longer in the earlier mixed state where:

- distillation depended on regex extraction
- write governance depended on string-signature merge rules
- retrieval depended on keyword-style ranking as the main path

---

## What Is Complete

### 1. Unified Semantic Engine

The memory semantic path is now centralized in:

- `scripts/_lingxi-memory-semantic.mjs`
- compiled from `skills/memory-distill/`
- versioned by `skills/memory-distill/references/skill-spec.json` for both prompt and example packs

Current semantic responsibilities:

- `distillSessionToCandidates(...)`
- `governMemoryCandidates(...)`
- `rankRelevantMemories(...)`

The deterministic layer now keeps only:

- schema validation
- note persistence
- id assignment
- index rebuild
- state update
- stable output shaping

### 2. Structured Distill Contract

`session-distill` now depends on a formal structured candidate contract:

- `MemoryDistillCandidateSet`

Implemented in:

- `skills/session-distill/scripts/memory-distill-candidate-set.mjs`

This is now the only accepted semantic distill artifact.

The semantic prompting that produces it should no longer be treated as ad hoc script text. It should be treated as skill-defined behavior compiled by the runtime.

There is no legacy note/state compatibility layer in the memory mainline.

### 3. LLM-Governed Write Path

`memory-write` is now governed by semantic create/merge/skip decisions.

Important current behavior:

- semantically duplicate candidates can merge even when wording differs
- low-durability candidates can be skipped
- unsupported kinds still fail fast
- note ids remain monotonic
- `INDEX.md` remains authoritative and is rebuilt after mutations

`session-distill` no longer pays one semantic roundtrip per candidate.

Current behavior is:

- candidates are batch-governed per scope
- deterministic code applies the resulting actions in order
- same-batch semantic duplicates can collapse into one resulting note

### 4. Retrieval Is Context-Aware

`memory-retrieve` is no longer driven only by raw query text.

`task` and `vet` now pass structured caller context into retrieval, including:

- title / goal framing
- type and complexity
- constraints and acceptance criteria
- project context
- semantic focus such as integration, contract surface, docs, or frontend state

This means memory ranking is now closer to the intended design:

- query + notes + caller context

### 5. Fail-Fast Semantic Validation

Malformed semantic outputs now fail fast instead of silently degrading.

Covered cases now include:

- invalid governance action
- malformed ranking hits
- invalid distill candidate shape

Test coverage was added at the semantic-core layer rather than only through end-to-end CLI success paths.

---

## Fixed Architectural Decisions

These decisions are now considered settled and should not be reopened casually.

### 1. Memory Is LLM-First

Strong semantic judgment belongs to the LLM path.

This includes:

- durable taste extraction
- create/merge/skip governance
- retrieval relevance judgment

Deterministic code should not retake these responsibilities except for contract validation and persistence safety.

### 2. No Compatibility Layer

Do not add legacy note/state compatibility back into the main path.

If old runtime artifacts appear, they should be treated as invalid input rather than silently normalized.

### 3. No Heuristic Fallback

Do not restore regex extraction, signature merge, or keyword scoring as a semantic fallback path.

Tests may use stub semantic runners.

Production logic should still require valid structured semantic output.

### 4. External Skill Shapes Stay Stable

Public CLI / skill surfaces should remain stable unless there is a very strong reason to change them.

Internal semantics can deepen.

External caller contracts should not drift casually.

---

## Current Remaining Risks

The biggest remaining issues are no longer basic correctness issues.

They are quality and operability issues.

### 1. Live Semantic Runtime Still Depends On Local `codex exec`

The default live semantic path still shells out to `codex exec`.

This is acceptable for the current stage, but it remains an operational dependency for:

- latency
- failure behavior
- local environment readiness
- background automation reliability

### 2. Semantic Quality Is Only Partially Goldened

The test suite now covers fail-fast behavior and several representative semantic scenarios.

But the repository still does not have a richer fixture/golden catalog for:

- paraphrase variants
- merge-strengthening cases
- skip-borderline cases
- retrieval minimality edge cases

### 3. Retrieval Context Is Better, But Prompting Can Still Improve

The retrieval path now receives meaningful caller context.

However, caller-specific prompt shaping is still fairly generic.

There is still room to improve how `task` and `vet` emphasize different retrieval intent.

---

## Recommended Next Step

The next step should be **semantic quality hardening**, not another structural rewrite.

### Priority 1. Add a richer semantic goldens suite

Goal:

- make semantic regressions visible before they leak into memory quality

Recommended work:

- add dedicated golden fixtures for paraphrase, merge, skip, and ranking scenarios
- include both positive and negative retrieval cases
- include stronger same-batch merge cases where a later candidate should strengthen an earlier note
- include task-specific and vet-specific retrieval contexts that should rank differently

Why this is next:

- the architecture is already in place
- the next real risk is semantic quality drift, not missing infrastructure

### Priority 2. Tighten caller-specific retrieval prompting

Goal:

- make retrieval more intentional for `task` vs `vet`

Recommended work:

- separate the retrieval prompt framing for drafting vs reviewing intent
- make `task` bias toward planning constraints, contract boundaries, and implementation guidance
- make `vet` bias toward hidden risk, missing memory application, and review-sensitive conventions
- preserve the same external output shape

### Priority 3. Add semantic observability for background use

Goal:

- make automation behavior auditable without weakening the contract

Recommended work:

- log semantic operation type, duration, and result size in a compact machine-usable format
- surface whether retrieval used query-only or query-plus-context richness
- record batch governance counts such as created / merged / skipped before final persistence summary

This should remain lightweight and should not turn into verbose conversational logs.

### Priority 4. Define operational guardrails for live semantic execution

Goal:

- make the `codex exec` dependency safer for automation and repeated local use

Recommended work:

- define timeout expectations for distill / govern / retrieve operations
- define retry policy explicitly, if any
- define what counts as a hard failure vs a retryable failure
- keep fail-fast behavior for malformed structured output

Do not implement this by reintroducing heuristic fallback.

---

## Suggested Development Order

1. Build the semantic golden/fixture suite first.
2. Use those goldens to refine caller-specific retrieval prompting.
3. Add compact semantic observability once prompt behavior is stable.
4. Add operational guardrails for live semantic execution.

This order keeps the next iteration focused on quality rather than reopening architecture.

---

## Guardrails For The Next Developer

Before changing memory behavior again:

- do not reintroduce heuristic semantic fallback
- do not add compatibility normalization for legacy memory artifacts
- do not change public output shapes casually
- do not optimize for lower model usage by pushing semantic judgment back into deterministic rules

If a change weakens semantic quality but improves speed, treat it as a regression unless the tradeoff is explicit, measured, and clearly worth it.
