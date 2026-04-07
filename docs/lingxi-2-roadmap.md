# LingXi 2.0 Roadmap

## Purpose

This document is the working baseline for the LingXi 2.0 refactor on the `dev-codex` branch.

It defines:

- product scope
- target architecture
- explicit non-goals
- phased implementation plan
- sequencing and migration rules

Subsequent changes should follow this document unless we intentionally revise the roadmap.

---

## Product Direction

LingXi 2.0 is a **Codex-native plugin** focused on two visible workflows:

- `task`
- `vet`

Its core value remains unchanged:

- continuously distill a developer's durable engineering preferences, judgment patterns, and review tendencies
- store those memories in a reusable project memory system
- apply those memories to future tasks with minimal friction

This means LingXi 2.0 is **not** a full workflow suite anymore. It is a focused system for:

1. task definition
2. task vetting
3. engineering taste memory retrieval and distillation

---

## Final Decisions

The following product decisions are fixed for the current refactor direction:

1. Platform target changes from Cursor to Codex.
2. Product ships as a **plugin in the first release**, not later.
3. Visible workflow is reduced to `task -> vet`.
4. Memory remains the real core capability.
5. Background analysis of historical conversations is required.
6. Background analysis should be low-intrusion and **not** run on every user message inline.
7. Background analysis should be implemented through **automation-backed session distillation**, not real-time prompt injection by default.
8. Runtime project data lives under `.lingxi/`.
9. Only one project subagent is required in V1: `lingxi-session-distill`.
10. Default automation cadence is every 6 hours.
11. `AGENTS.md` should be generated only when missing; otherwise setup should avoid overwriting it.
12. Session distillation must prevent duplicate processing of unchanged session content.
13. Session dedupe identity is `session_id + content_fingerprint + distill_version`.

---

## Why Rebuild Instead Of Porting

LingXi 1.x is strongly shaped by Cursor-specific primitives:

- `.cursor` commands
- Cursor skills layout
- hooks-heavy execution model
- multi-stage workflow (`task/plan/build/review/...`)

Those choices are no longer aligned with LingXi 2.0 goals.

Trying to port them directly would preserve unnecessary complexity and produce a Codex version that still behaves like a Cursor product internally.

So LingXi 2.0 should be treated as a **targeted rebuild with selective reuse**, not a mechanical migration.

Reusable assets:

- memory concepts
- some note/index structure ideas
- some deterministic scripts and tests
- task id generation patterns
- parts of the governance logic

Non-reusable or likely-to-be-removed assets:

- Cursor hooks runtime
- Cursor plugin structure
- plan/build/review/testcase workflow
- background self-iteration loop
- heavy prompt-time session instrumentation

---

## Product Shape

LingXi 2.0 has three layers:

### 1. Plugin Layer

Purpose:

- distribute the product
- expose LingXi skills to Codex
- define the product's installable shape

Expected contents:

- `.codex-plugin/plugin.json`
- `skills/`
- optional assets and future integrations

### 2. Setup Layer

Purpose:

- initialize project runtime folders
- generate project-local subagent configuration
- generate automation configuration or suggested automation artifacts
- safely bootstrap LingXi into a target repository

Expected contents:

- deterministic setup scripts
- file templates
- bootstrap rules

### 3. Runtime Data Layer

Purpose:

- store tasks
- store memories
- store session distillation state

Expected location inside target repos:

```text
.lingxi/
  tasks/
  memory/
    INDEX.md
    project/
    share/
  state/
  setup/
```

---

## Official Capability Mapping

Current design should align with documented Codex capabilities as follows:

### Plugin

Use plugin as the primary product distribution unit.

### Skills

Use skills as the main execution surface for LingXi workflows.

### Subagents

Use a project-local custom subagent for background session distillation.

### Automations

Use Codex automations for low-intrusion periodic background analysis of historical sessions.

### Important Constraint

Current design should **not assume** that plugin manifest alone can natively register:

- automations
- hooks
- custom agents

So LingXi 2.0 should treat these as **setup-generated runtime artifacts**, not plugin-native declarations.

---

## V1 Scope

### In Scope

- Codex plugin packaging
- `task` skill
- `vet` skill
- `memory-retrieve` skill
- `memory-write` skill
- `session-distill` skill
- project-local setup script
- project-local `lingxi-session-distill` subagent config
- generated automation config for background distillation
- project runtime directory `.lingxi/`
- memory index and note storage
- tests for the new core contracts

### Out Of Scope

- Cursor compatibility layer
- `plan`, `build`, `review`, `testcase-designer`
- heavy hook-driven real-time memory analysis
- background self-iteration / self-improvement loop
- multiple specialized subagents in V1
- automatic public marketplace publishing
- complex semantic memory infrastructure in the first cut

---

## Core User Flows

### Flow A: Task Creation

1. User invokes LingXi task workflow.
2. LingXi retrieves relevant project memory.
3. LingXi creates or updates a task document.
4. Task document captures:
   - goal
   - scope
   - constraints
   - acceptance criteria

### Flow B: Task Vetting

1. User invokes LingXi vet workflow.
2. LingXi retrieves relevant project memory.
3. LingXi audits the task document for:
   - ambiguity
   - missing constraints
   - hidden risk
   - contradictory acceptance criteria
   - poor task framing

### Flow C: Background Session Distillation

1. Automation runs periodically.
2. It identifies recent unprocessed Codex sessions relevant to the repo.
3. It invokes LingXi session distillation.
4. Distillation extracts only durable engineering taste, such as:
   - coding preferences
   - review priorities
   - recurring tradeoff rules
   - anti-patterns
   - stable project constraints
5. Distilled memories are written into `.lingxi/memory/project/`.
6. Processed session state is updated to avoid duplicate work.

---

## Memory Strategy

### Memory Purpose

Memory is not a generic knowledge dump.

LingXi should store only durable, reusable signals that improve future work quality.

### What Counts As Memory

Good memory candidates include:

- implementation preferences
- review sensitivities
- engineering heuristics
- constraint rules
- anti-patterns to avoid
- stable project conventions

### What Should Not Be Stored

Do not store:

- one-off implementation steps
- transient debugging notes
- isolated task details with no reuse value
- temporary user requests

### Memory Storage

Target structure:

```text
.lingxi/memory/
  INDEX.md
  project/
  share/
```

### Memory Model

Each note should stay compact and practical.

Suggested fields:

- `Id`
- `Title`
- `Kind`
- `When to load`
- `One-liner`
- `Decision / Preference`
- `Evidence`
- `Source`
- `UpdatedAt`

### Retrieval Policy

Retrieval should be:

- minimal
- explicit
- task-relevant

Primary retrieval moments in V1:

- before `task`
- before `vet`

### Write Policy

Writes should happen through:

- explicit LingXi memory workflows
- background session distillation

Avoid intrusive write prompts during every user interaction.

---

## Runtime Artifacts In Target Repositories

After setup, a target repository should contain:

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

### Notes

- `.lingxi/state/processed-sessions.json` tracks what has already been distilled.
- `.lingxi/setup/automation.session-distill.toml` preserves generated automation config.
- `.codex/agents/lingxi-session-distill.toml` is the project-local background agent definition.

### Session Distillation State

`.lingxi/state/processed-sessions.json` is a required runtime contract.

It exists to:

- prevent duplicate distillation of unchanged sessions
- allow re-distillation after content changes
- allow re-distillation after distill rule upgrades
- record the previous result of each processed session

---

## Target Repository Structure For LingXi 2.0 Source

Planned source layout:

```text
.codex-plugin/
  plugin.json
skills/
  task/
  vet/
  memory-retrieve/
  memory-write/
  session-distill/
scripts/
  lingxi-setup.mjs
  lingxi-init-workspace.mjs
  lingxi-task-id.mjs
  lingxi-memory-index.mjs
templates/
  agents/
  automations/
  memory/
docs/
  architecture.md
  product-scope.md
  setup.md
test/
  skills/
  scripts/
  fixtures/
```

---

## Planned Plugin Surface

V1 plugin should remain minimal.

Planned plugin contents:

- `task`
- `vet`
- `memory-retrieve`
- `memory-write`
- `session-distill`

Planned plugin intent:

- plugin is the installable product shell
- setup script handles runtime environment generation

---

## Planned Subagent Surface

V1 uses exactly one project-local subagent:

- `lingxi-session-distill`

### Responsibilities

- analyze historical sessions for durable engineering taste
- ignore one-off task chatter
- invoke LingXi memory writing flow
- update processed session state

### Why Only One

This keeps V1 tractable and avoids premature multi-agent orchestration complexity.

If future scale requires it, LingXi can later split distillation into:

- session selection
- extraction
- governance

But not in V1.

---

## Planned Automation Policy

### Default Cadence

- every 6 hours

### Why

This is frequent enough to keep memory fresh, but infrequent enough to stay low-intrusion and cost-conscious.

### Responsibilities

- find recent sessions
- filter for repo relevance
- skip sessions already processed under the same content fingerprint and distill version
- invoke session distillation
- persist memory
- update state

### Installation Rule

Automation should be **generated by setup**, not assumed to be declared directly in plugin manifest.

---

## `AGENTS.md` Policy

Setup should:

- generate `AGENTS.md` only if missing
- avoid overwriting an existing file
- otherwise surface merge guidance to the user

Minimum LingXi runtime policy inside generated `AGENTS.md`:

- retrieve LingXi memory before `task` and `vet`
- use LingXi task and vet skills for those workflows
- only persist durable, reusable engineering taste
- avoid storing one-off implementation details as memory

---

## Migration Strategy

### Principle

Build the Codex-native path first, then retire Cursor-specific runtime parts.

### Safe Reuse

Potential reuse candidates:

- task id scripts
- memory indexing ideas
- note format concepts
- parts of deterministic tests

### Planned Removal / De-emphasis

These should not define the new architecture:

- `.cursor/hooks/`
- Cursor runtime plugin files
- multi-stage workflow artifacts
- self-iterate background system
- plan/build/review/testcase machinery

---

## Phase Plan

## Phase 0 - Freeze Direction

Deliverables:

- this roadmap
- architecture draft
- scope definition

Goal:

- stop re-litigating foundational decisions while implementation starts

## Phase 1 - New Skeleton

Deliverables:

- `.codex-plugin/plugin.json`
- new `skills/` tree
- new `templates/` tree
- new `scripts/` tree
- docs baseline

Goal:

- create the new LingXi 2.0 repository shape without yet finishing runtime logic

## Phase 2 - Setup And Workspace Bootstrap

Deliverables:

- `lingxi-setup.mjs`
- `lingxi-init-workspace.mjs`
- generated `.lingxi/` runtime structure
- generated `.codex/agents/lingxi-session-distill.toml`
- generated automation config artifact

Goal:

- prove install/bootstrap path

## Phase 3 - Memory Core

Deliverables:

- `memory-write`
- `memory-retrieve`
- note template
- index generation/update logic
- tests for write/retrieve/index contracts

Goal:

- establish the real LingXi core

## Phase 4 - Task And Vet

Deliverables:

- `task` skill
- `vet` skill
- task document template
- task id logic
- tests for task/vet workflows

Goal:

- complete the visible user workflow

## Phase 5 - Background Session Distillation

Deliverables:

- `session-distill` skill
- subagent template
- automation template
- processed session state tracking
- tests for session distillation logic

Goal:

- complete low-intrusion memory accumulation

## Phase 6 - Cleanup And Retirement

Deliverables:

- remove obsolete Cursor-first runtime pieces
- trim docs and tests that no longer apply
- update README for LingXi 2.0

Goal:

- make the repository coherent and product-ready

---

## Implementation Sequence

Recommended work order:

1. write `docs/architecture.md`
2. add plugin skeleton
3. add setup/bootstrap scripts
4. implement memory core
5. implement `task`
6. implement `vet`
7. implement `session-distill`
8. remove obsolete Cursor runtime pieces
9. rewrite README and product docs

This order minimizes rework because memory is the real dependency under both `task` and `vet`, while session distillation depends on memory-write being settled first.

---

## Test Strategy

Tests should shift from platform-specific Cursor runtime coverage to LingXi 2.0 contract coverage.

### High-Priority Test Areas

- plugin shape validation
- setup/bootstrap output
- task id generation
- task document creation/update
- vet behavior against task docs
- memory note write/update/index sync
- memory retrieval behavior
- session distillation filtering and persistence
- processed session deduplication

### Low-Priority / Legacy Areas

Do not preserve old tests solely because they already exist if they lock us into obsolete Cursor assumptions.

---

## Risks

### Risk 1: Plugin Capability Assumptions Drift

Mitigation:

- keep plugin manifest minimal
- keep automation and subagent config in setup-generated files

### Risk 2: Memory Scope Bloats

Mitigation:

- keep strict write rules
- optimize for durable engineering taste only

### Risk 3: Background Distillation Gets Too Aggressive

Mitigation:

- default 6-hour cadence
- track processed sessions
- ignore transient notes

### Risk 4: Partial Migration Creates Hybrid Complexity

Mitigation:

- build new path first
- delete old runtime pieces once replacement is ready

### Risk 5: Duplicate Session Distillation Pollutes Memory

Mitigation:

- store session processing state
- hash normalized session content
- version distillation rules
- keep memory-level merge logic independent from session-level dedupe

---

## Definition Of Success

LingXi 2.0 V1 succeeds when all of the following are true:

1. it installs as a Codex plugin
2. setup creates the required runtime files in a target repo
3. users can run `task`
4. users can run `vet`
5. task and vet both retrieve relevant LingXi memory
6. background automation can distill historical sessions into durable project memory
7. future tasks actually improve from those memories

---

## Change Control

If implementation reveals a meaningful constraint change, update this roadmap before expanding scope.

Acceptable revisions:

- changing file names
- changing exact script names
- refining note schema
- refining automation prompt structure

Changes that should require explicit roadmap revision:

- reintroducing removed workflows
- abandoning plugin-first delivery
- replacing background automation with real-time intrusive analysis
- replacing `.lingxi/` as runtime home
- expanding V1 to multiple subagents
