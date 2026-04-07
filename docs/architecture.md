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

---

## Skills Architecture

V1 keeps the skill surface intentionally small.

### `task`

Responsibilities:

- create or update a task document
- define objective, boundaries, constraints, and acceptance criteria
- retrieve and apply relevant LingXi memory before drafting

Non-responsibilities:

- implementation planning
- build execution
- delivery review

### `vet`

Responsibilities:

- review a task document
- identify ambiguity, missing constraints, hidden risk, and poor framing
- produce concrete challenge points
- optionally inform task revision

Non-responsibilities:

- code review
- test execution
- performance/security deep audits outside task framing

### `memory-retrieve`

Responsibilities:

- find relevant existing memories for the current task or vet context
- return minimal, high-signal guidance

Non-responsibilities:

- writing memory
- distilling sessions

### `memory-write`

Responsibilities:

- create, update, merge, or skip memory notes
- maintain `INDEX.md`
- enforce compact memory note structure

Non-responsibilities:

- broad session analysis
- task creation

### `session-distill`

Responsibilities:

- analyze historical Codex sessions
- extract only durable engineering taste
- pass distilled items into the memory writing flow

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

1. inspect recent historical sessions
2. filter for repository relevance
3. identify durable engineering taste
4. invoke LingXi distillation and memory write logic
5. update processed session state

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
6. generate `AGENTS.md` only when missing

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
  "distill_version": "v1",
  "sessions": {
    "session-123": {
      "content_fingerprint": "sha256:abc123",
      "distilled_at": "2026-04-07T12:00:00Z",
      "result": "written",
      "notes": ["MEM-001", "MEM-004"]
    },
    "session-456": {
      "content_fingerprint": "sha256:def456",
      "distilled_at": "2026-04-07T18:00:00Z",
      "result": "skipped_no_signal",
      "notes": []
    }
  }
}
```

### Required Properties

Top-level:

- `distill_version`
- `sessions`

Per session:

- `content_fingerprint`
- `distilled_at`
- `result`
- `notes`

### Result Enum

V1 should support at least:

- `written`
- `merged`
- `skipped_no_signal`
- `failed`

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
