# LingXi 2.0 Architecture

## Overview

LingXi 2.0 is a Codex-native plugin centered on a narrow user-facing workflow and a durable background memory system.

Visible workflow:

- `task`
- `vet`

Core engine:

- retrieve engineering taste before meaningful work
- distill durable preferences from historical sessions in the background
- write those preferences into a reusable project memory store

Visible workflows stay narrow, but memory should act as a global context layer for meaningful repository work rather than a feature used only by explicit workflows.

LingXi 2.0 should feel small at the surface and strong underneath.

---

## Product Model

LingXi 2.0 is composed of three layers:

1. `plugin`
2. `setup`
3. `runtime`

### Plugin

The plugin is the installable product shell.

It should package:

- LingXi skills
- bundled templates
- deterministic bootstrap scripts

The plugin should not be treated as the sole runtime container for every feature.

### Setup

Setup is responsible for creating project-local runtime artifacts that are not safely modeled as pure plugin manifest declarations.

Setup should:

- initialize `.lingxi/`
- generate project-local subagent config
- generate automation config
- register the generated automation as part of bootstrap
- add a minimal `AGENTS.md` only when missing

### Runtime

Runtime lives inside the target repository and stores durable project state.

Primary runtime roots:

- `.lingxi/`
- `.codex/agents/`

---

## Design Goals

### Primary Goals

1. Make Codex task framing better over time.
2. Make Codex task vetting sharper over time.
3. Distill durable engineering taste with low user interruption.
4. Keep the product legible and maintainable.
5. Make LingXi task writing strong through LLM reasoning constrained by deterministic structure.
6. Make LingXi vetting strong through LLM judgment constrained by stable review contracts.

### Non-Goals

1. Rebuild the full Cursor-era workflow.
2. Analyze every user message inline by default.
3. Depend on experimental hooks as the main memory mechanism.
4. Build a large multi-agent orchestration system in V1.

---

## Runtime Data Model

Expected runtime structure in target repositories:

```text
.lingxi/
  tasks/
  memory/
    INDEX.md
    project/
    share/
  state/
    processed-sessions.json
    distill-journal.jsonl
  setup/
    automation.session-distill.toml
.codex/
  agents/
    lingxi-session-distill.toml
AGENTS.md
```

### Purpose Of Each Area

`tasks/`

- stores task documents created by LingXi

`memory/project/`

- stores repository-specific engineering taste and constraints

`memory/share/`

- stores cross-project reusable memories when explicitly supported

`memory/INDEX.md`

- stores the minimal searchable index of memory notes

`state/processed-sessions.json`

- tracks which historical sessions have already been distilled
- stores the dedupe and re-run contract for session distillation

`state/distill-journal.jsonl`

- stores lightweight operational history for distillation runs

`setup/automation.session-distill.toml`

- stores the generated automation configuration artifact for auditability
- acts as the source artifact consumed by bootstrap when registering Codex automation

---

## Skills Architecture

V1 keeps the skill surface intentionally small.

The core implementation strategy for LingXi's semantic workflows is a hybrid model:

- LLM reasoning for understanding, refinement, challenge, and judgment
- deterministic scripts for validation, normalization, parsing, rendering, and stable persistence

LingXi should not choose between "pure prompting" and "pure rules." It should use LLMs for the parts rules are bad at, and use rules for the parts that must stay stable.

This now applies to `memory` as well:

- LLM judgment for semantic extraction, governance, and retrieval ranking
- deterministic scripts for schema validation, state safety, persistence, and index rebuilds

Memory consumption should follow a different rule from memory writing:

- memory writing stays conservative and background-oriented
- memory retrieval should be foreground and default for meaningful repository-scoped work
- explicit workflows such as `task` and `vet` may use richer workflow-specific retrieval context, but they should not be the only consumers of LingXi memory

This also means the memory-consumption path should stay host-agnostic:

- LingXi core should expose reusable retrieval/briefing primitives
- Codex and future Claude Code integration should be treated as adapter layers over the same memory core
- The same adapter rule should also apply to session discovery, scheduling, and host-specific runtime artifacts

### `task`

Responsibilities:

- create or update a task document
- define objective, boundaries, constraints, and acceptance criteria
- refine ambiguous user demand into a task document an engineer can directly build from
- strengthen weak or partial solution ideas toward current best-practice guidance
- retrieve and apply relevant LingXi memory before drafting
- produce requirement description, solution description, and development guidance in one coherent artifact
- surface missing information in one pass instead of dribbling out validation failures

Non-responsibilities:

- low-level build choreography or commit-by-commit execution scripting
- build execution
- delivery review

#### `task` Hybrid Flow

`task` should be implemented in two explicit stages:

1. LLM refinement stage
2. deterministic compile stage

Stage 1 should:

- read relevant project context
- read relevant LingXi memory
- infer task type and complexity
- refine the request into a structured `TaskSpec`
- detect missing information and ask once when required
- run a self-check rubric before attempting persistence

Stage 2 should:

- validate the `TaskSpec`
- reject under-specified or contradictory specs with structured errors
- normalize the accepted spec
- preserve any typed `guidance_blocks[]` as the development-guidance layer
- render the task markdown deterministically
- persist changelog/version updates

`task` should not let the LLM write free-form markdown directly as the source of truth.

The stable source of truth should be `TaskSpec`, with markdown treated as a compiled artifact.

When `guidance_blocks[]` are present, the deterministic compiler should emit a dynamic `开发指导` section between functional requirements and the acceptance checklist instead of restoring the old full-template chapter sprawl.

### `vet`

Responsibilities:

- review a task document
- identify ambiguity, missing constraints, hidden risk, and poor framing
- challenge weak solution guidance and shaky best-practice assumptions in the task document
- produce concrete challenge points
- optionally inform task revision
- use task type, complexity, memory, and project context to adapt review depth

Non-responsibilities:

- code review
- test execution
- performance/security deep audits outside task framing

#### `vet` Hybrid Flow

`vet` should also be implemented in two explicit stages:

1. LLM review stage
2. deterministic structuring stage

Stage 1 should:

- read the current task document
- read relevant project context
- retrieve relevant LingXi memory
- challenge the task from the appropriate dimensions
- identify implicit risk, ambiguity, framing weakness, and weak development guidance

Stage 2 should:

- preserve the dimension matrix
- preserve severity buckets
- preserve readiness classification
- group nearby findings into revision themes
- emit a stable `VetReport` structure

This keeps `vet` from collapsing into either:

- a weak checklist linter
- or an unstable free-form review essay

### `memory-retrieve`

Responsibilities:

- find relevant existing memories for the current task or vet context
- return minimal, high-signal guidance

Implementation bias:

- LLM decides which notes are semantically relevant and how to rank them
- the retrieval prompt includes both the query and structured caller context from `task` / `vet`
- deterministic code validates the structured ranking result and maps it back onto stable hit output

Non-responsibilities:

- writing memory
- distilling sessions

### `memory-write`

Responsibilities:

- create, update, merge, or skip memory notes
- maintain `INDEX.md`
- enforce compact memory note structure

Implementation bias:

- LLM decides whether a candidate should create, merge, or skip
- `session-distill` can batch multiple candidates through one governance pass instead of paying one model roundtrip per note
- deterministic code validates the governance result, assigns ids, writes files, and rebuilds the index

Non-responsibilities:

- broad session analysis
- task creation

### `session-distill`

Responsibilities:

- analyze historical Codex sessions
- extract only durable engineering taste
- pass distilled items into the memory writing flow

Implementation split:

- Codex-specific adapter code discovers and normalizes candidate session artifacts
- a deterministic selector decides which sessions are valid source material
- `distill-session` remains the single-session worker over normalized `{ session_id, messages }`
- `skills/memory-distill/` defines the canonical semantic spec for taste extraction, adjudication, governance handoff, and retrieval intent

Implementation bias:

- the runtime compiles `memory-distill` skill assets into structured LLM prompts
- LLM produces a structured `MemoryDistillCandidateSet`
- deterministic code validates the candidate set, applies dedupe/state rules, and persists approved notes

Non-responsibilities:

- acting as a general workflow agent
- replacing task or vet

---

## Subagent Architecture

V1 uses one project-local custom subagent:

- `lingxi-session-distill`

### Why Only One

One subagent is enough to establish the background memory loop without creating orchestration debt.

### Responsibilities

The subagent should:

1. run LingXi's deterministic Codex distill runner
2. let the runner inspect recent historical sessions
3. let the selector filter for repository relevance and self-distill exclusion
4. let the single-session worker identify durable engineering taste
5. report the runner summary without replacing the selector/worker logic

### Session Selection Guardrails

The session selector must exclude self-distillation material before semantic extraction begins.

At minimum, V1 should not select:

- the currently running session-distill automation conversation
- prior sessions whose content is primarily about running, debugging, or narrating the session-distill workflow itself
- sessions that contain only distillation bookkeeping, note-writing chatter, or "memory about memory" discussion without repository engineering signal

The intent is to prevent LingXi from distilling its own distillation chatter and recursively polluting project memory.

This guardrail is separate from dedupe:

- dedupe answers "have we already processed this session content version?"
- self-distillation exclusion answers "should this session ever be considered valid source material at all?"

### Rejected Alternative

Do not split V1 into multiple subagents such as:

- session selector
- taste extractor
- governance agent

That split can come later if volume or cost requires it.

---

## Automation Architecture

### Intent

Automations are the low-intrusion background engine for LingXi memory accumulation.

### Default Cadence

- every 6 hours

### Why Background Automation

Inline per-message analysis was too intrusive in LingXi 1.x.

Background automation is preferred because it:

- preserves conversational flow
- reduces prompt overhead
- enables batch distillation

---

## Task/Vet Hybrid Contracts

The next development phase should formalize explicit intermediate schemas.

### `TaskSpec`

`TaskSpec` is the structured artifact produced after LLM refinement and before deterministic compilation.

Current draft contract fields:

- `schema_version`
- `title`
- `type`
- `complexity`
- `project_context`
- `background`
- `problem`
- `solution_overview`
- `goals[]`
- `non_goals[]`
- `success_criteria[]`
- `user_stories[]`
- `functional_requirements[]`
- `guidance_blocks[]`
- `constraints[]`
- `memory_refs[]`
- `open_questions[]`
- `confidence`

Current compatibility/pass-through fields carried by the deterministic compiler path:

- `goal`
- `scope[]`
- `acceptance_criteria[]`
- `task_id`
- `tags[]`

`TaskSpec` is the point where LingXi should combine:

- user intent
- project context
- retrieved memory
- LLM requirement refinement
- a dynamic development-guidance layer that can be compiled into markdown without reintroducing rigid templates

### `VetReport`

`VetReport` is the structured artifact produced after LLM review and deterministic review aggregation.

Current stable contract fields:

- `report_version`
- `task_id`
- `file`
- `review_scope`
- `project_context_summary`
- `summary`
- `findings`
- `findings_by_dimension`
- `dimension_summaries`
- `review_range_statement`
- `overall_evaluation`
- `execution_readiness_breakdown`
- `improvement_priority`
- `issues_only_dimensions`
- `revision_targets`
- `recommended_next_action`
- `next_step_options`
- `implementation_readiness`

`VetReport` is the stable interface between:

- free-form review reasoning
- downstream task revision
- testable review contracts

Current review logic is expected to challenge at least three things explicitly:

- whether the chosen solution includes enough rationale to trust
- whether the task carries enough development guidance for safe implementation
- whether grouped revision targets clearly tell the human what to fix first

---

## Hybrid Design Rules

The following rules should guide subsequent implementation work.

### Use LLM Reasoning For

- demand refinement
- surfacing implicit assumptions
- proposing better non-goals
- challenging weak success criteria
- identifying hidden scope drift
- adapting review language to task type and repo context

### Use Deterministic Rules For

- schema validation
- task id allocation
- file naming
- markdown rendering
- changelog/version updates
- severity bucketing
- review dimension scaffolding
- dedupe and persistence logic

### Required Repair Loop

When `TaskSpec` validation fails, LingXi should not stop at raw script errors.

The intended flow is:

1. LLM produces `TaskSpec`
2. validator returns structured errors
3. LLM repairs `TaskSpec`
4. validator re-checks
5. compiler writes final task document

The same general pattern now also applies to `VetReport`, with a slightly different terminal step:

1. LLM or review logic produces `VetReport`
2. validator returns structured errors
3. review logic repairs `VetReport`
4. validator re-checks
5. LingXi accepts the validated report as the stable review artifact

---

## Project Context Role

Project context should remain an input signal, not a hidden source of authority.

It should help LingXi:

- align task type with the repository's actual stack
- avoid proposing task framing that fights the current repo shape
- make vet warnings more specific

It should not:

- force task type when the user explicitly wants a cross-stack change
- replace user intent
- become a brittle repo classifier that blocks legitimate work

Project context is a biasing signal for better judgment, not a hard gate by itself.
- keeps memory accumulation mostly invisible

### Distillation Flow

1. automation starts
2. relevant recent sessions are discovered
3. already-processed sessions are excluded
4. `lingxi-session-distill` logic runs
5. stable memory notes are written
6. processed state is updated

### Guardrails

Automation should not:

- write one-off implementation details
- repeatedly process the same session
- run too frequently by default

### Session Dedupe Policy

LingXi must prevent duplicate distillation of unchanged session content.

This is required for:

- cost control
- memory quality
- avoiding repeated write and merge noise

The correct question is not "have we ever seen this session id?".
The correct question is:

- has this exact session content version already been distilled using the current distillation rules?

### Distillation Identity

For V1, a session should be treated as already processed only when all of the following match:

1. `session_id`
2. `content_fingerprint`
3. `distill_version`

If all three match, the session should be skipped.

If either:

- the content changes
- the distillation rule version changes

then re-distillation is allowed.

### Why Session Id Alone Is Not Enough

A session can continue to grow over time.

Using only `session_id` would incorrectly suppress reprocessing after new conversation content is appended.

### Why `distill_version` Is Required

LingXi extraction rules will evolve.

The same session content may produce better or different memory output under a newer distillation contract, so versioned reprocessing must remain possible.

### Fingerprint Strategy

V1 should compute a stable fingerprint from the normalized session content actually used for distillation.

Do not rely solely on:

- file path
- modification time
- session id

Preferred approach:

- normalize session content
- hash the normalized content
- store the hash as `content_fingerprint`

### Two-Layer Dedupe

LingXi needs both layers:

1. session-level dedupe
2. memory-level dedupe

Session-level dedupe prevents wasting work on the same source material.

Memory-level dedupe prevents different sessions from producing duplicate memory notes for the same underlying engineering taste.

These layers solve different problems and should not replace each other.

### Re-Run Policy

#### Automatic Re-Run

Allow automatic re-distillation when:

- `content_fingerprint` changes
- `distill_version` changes

#### Manual Re-Run

Allow explicit user-triggered re-distillation for:

- selected sessions
- recent time windows
- migration after major distillation rule changes

#### No Automatic Re-Run

Do not automatically re-run an unchanged session just because a previous result was:

- `skipped_no_signal`
- `merged`
- `written`

If content and version are unchanged, it should remain skipped.

---

## Data Flow

### Task Flow

```text
user request
  -> memory-retrieve
  -> task
  -> task document
```

### Vet Flow

```text
user request
  -> memory-retrieve
  -> vet
  -> vet feedback
```

### Background Distill Flow

```text
automation
  -> recent sessions
  -> filter unprocessed + repo-relevant
  -> session-distill
  -> memory-write
  -> memory notes + index update
  -> processed state update
```

---

## Memory Model

LingXi memory should capture durable engineering taste, not generic archive material.

### Good Memory Examples

- preference for smaller, reviewable patches
- preference for explicit interfaces over implicit coupling
- review sensitivity to regressions around auth or data consistency
- recurring refusal of magic configuration or hidden state
- stable project conventions around naming or testing

### Bad Memory Examples

- exact one-off shell commands for a temporary fix
- transient build failures
- task-specific implementation sequence with no reuse value
- short-lived debugging observations

### Minimal Note Shape

Each note should remain compact:

- id
- title
- kind
- when to load
- one-liner
- decision or preference
- evidence
- source
- updated timestamp

This keeps retrieval cheap and notes readable.

---

## Setup Model

`lingxi-setup` is the bootstrap boundary between the plugin source and a target repository.

### Setup Responsibilities

1. create `.lingxi/` directories
2. initialize empty state files
3. initialize `memory/INDEX.md`
4. generate `.codex/agents/lingxi-session-distill.toml`
5. generate `.lingxi/setup/automation.session-distill.toml`
6. register Codex automation through bootstrap
7. generate `AGENTS.md` only when missing

### Setup Safety Rules

1. do not overwrite user `AGENTS.md`
2. do not silently destroy existing state
3. prefer idempotent file generation
4. keep generated artifacts explicit and inspectable

---

## Session State Contract

V1 should store session distillation state in:

- `.lingxi/state/processed-sessions.json`

Suggested contract:

```json
{
  "state_schema_version": "v2",
  "distill_version": "v3",
  "summary": {
    "tracked_sessions": 2,
    "total_runs": 3,
    "written_runs": 1,
    "merged_runs": 1,
    "skipped_duplicate_runs": 1,
    "skipped_no_signal_runs": 0,
    "failed_runs": 0,
    "reprocessed_runs": 1
  },
  "last_run": {
    "occurred_at": "2026-04-07T18:00:00Z",
    "session_id": "session-456",
    "operation": "merged",
    "run_reason": "distill_version_changed",
    "content_fingerprint": "sha256:def456",
    "candidate_count": 1,
    "note_count": 1
  },
  "sessions": {
    "session-123": {
      "content_fingerprint": "sha256:abc123",
      "distilled_at": "2026-04-07T12:00:00Z",
      "result": "written",
      "run_reason": "first_distill",
      "candidate_count": 2,
      "notes": ["MEM-001", "MEM-004"]
    },
    "session-456": {
      "content_fingerprint": "sha256:def456",
      "distilled_at": "2026-04-07T18:00:00Z",
      "result": "merged",
      "run_reason": "distill_version_changed",
      "candidate_count": 1,
      "notes": ["MEM-007"]
    }
  }
}
```

### Required Properties

Top-level:

- `state_schema_version`
- `distill_version`
- `summary`
- `last_run`
- `sessions`

Per session:

- `content_fingerprint`
- `distilled_at`
- `result`
- `run_reason`
- `candidate_count`
- `notes`

### Result Enum

V1 should support at least:

- `written`
- `merged`
- `skipped_duplicate`
- `skipped_no_signal`
- `failed`

### Run Reason Enum

V1 should make rerun semantics explicit with:

- `first_distill`
- `content_changed`
- `distill_version_changed`
- `forced_reprocess`
- `duplicate_unchanged`

This is enough for:

- dedupe
- auditability
- targeted future reprocessing

---

## Migration Strategy

LingXi 2.0 should be built alongside the old Cursor-oriented structure first, then old runtime pieces should be retired once the Codex-native path is proven.

### Reuse Policy

Safe to reuse:

- task id generation concepts
- memory indexing ideas
- compact note schema concepts
- deterministic test helpers where still relevant

Do not preserve merely for backward familiarity:

- Cursor hook runtime model
- plan/build/review/testcase workflow
- self-iterate automation system
- heavy real-time memory injection logic

---

## V1 Delivery Sequence

1. roadmap and architecture docs
2. plugin skeleton
3. setup/bootstrap skeleton
4. memory core
5. task skill
6. vet skill
7. background session distillation
8. removal of obsolete Cursor-first runtime pieces

This order ensures the visible workflow is built on top of the memory core rather than duplicating logic.

---

## Success Criteria

The architecture is successful when:

1. LingXi installs as a Codex plugin
2. setup creates usable runtime state in a target repository
3. `task` and `vet` work without the removed Cursor workflow machinery
4. background session distillation can improve future task quality
5. the repository is structurally simpler than LingXi 1.x
