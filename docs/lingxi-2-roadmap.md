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
14. `task` and `vet` should evolve toward a hybrid architecture: LLM reasoning for refinement/judgment, deterministic scripts for validation/rendering/persistence.
15. LingXi should not treat rule scripts as the primary place for high-level task refinement logic.

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
3. LingXi reads relevant project context.
4. LingXi refines the request into a structured task spec.
5. LingXi validates and compiles that spec into a task document.
6. Task document captures:
   - goal
   - scope
   - constraints
   - acceptance criteria
   - non-goals
   - user stories
   - project context signals when relevant

### Flow B: Task Vetting

1. User invokes LingXi vet workflow.
2. LingXi retrieves relevant project memory.
3. LingXi reads relevant project context.
4. LingXi audits the task document for:
   - ambiguity
   - missing constraints
   - hidden risk
   - contradictory acceptance criteria
   - poor task framing
5. LingXi emits a structured vet report, not only free-form commentary.

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

## Task/Vet Direction

The next major quality phase should stop pushing more high-level judgment into deterministic scripts alone.

Instead, LingXi should explicitly adopt:

- LLM reasoning for refinement and review
- deterministic rules for validation, compilation, and persistence

### Why

Pure rules are good at enforcing a floor, but weak at:

- extracting the real user goal
- surfacing hidden assumptions
- generating strong non-goals
- challenging weak success criteria
- doing nuanced review adapted to repo context

Pure prompting is good at those tasks, but weak at:

- schema stability
- deterministic output structure
- changelog/version safety
- testable output contracts

So the design target is a hybrid path, not a choice between the two.

### `TaskSpec` Direction

`task` has now moved onto an explicit intermediate schema, currently implemented as `TaskSpec`.

`TaskSpec` should become the source of truth before markdown rendering.

Current draft fields:

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

Compatibility fields currently preserved by the deterministic task path:

- `goal`
- `scope[]`
- `acceptance_criteria[]`
- `task_id`
- `tags[]`

### `VetReport` Direction

`vet` has now moved onto an explicit intermediate schema, currently implemented as `VetReport`.

Current stable fields:

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

Current review behavior already expects:

- solution rationale quality, not just solution presence
- dynamic development-guidance sufficiency, not just requirement row completeness
- grouped revision themes that tell the human what to fix first

### Repair Loop Requirement

The intended task path is:

1. LLM produces `TaskSpec`
2. validator returns structured errors
3. LLM repairs the spec
4. validator re-checks
5. compiler renders task markdown

The same repair-loop pattern now also applies to `VetReport`, with report acceptance replacing markdown compilation at the terminal step.

This should become the standard LingXi path instead of relying on raw script exceptions as the main user-facing refinement mechanism.

Current compiler behavior already treats markdown as a deterministic compiled artifact:

- `TaskSpec.guidance_blocks[]` compile into a dynamic `开发指导` section
- the guidance section sits between `功能需求` and the acceptance checklist
- missing guidance should be fixed by updating `TaskSpec`, not by hand-editing markdown as the source of truth

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

- `.cursor/hooks/` (already retired from the main repository)
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

## Phase 4 - Task And Vet Baseline

Deliverables:

- `task` skill
- `vet` skill
- task document template
- task id logic
- tests for task/vet workflows

Goal:

- complete the visible user workflow

## Phase 4.5 - Hybrid Task/Vet Refactor

Deliverables:

- `TaskSpec` schema draft
- `VetReport` schema draft
- rewritten `task` skill instructions oriented around LLM refinement
- rewritten `vet` skill instructions oriented around LLM review
- validator/compiler split for task
- clearer validator output contracts
- repair-loop contracts for `TaskSpec` and `VetReport`
- contract tests for schema stability and repair-loop behavior

Goal:

- shift `task/vet` from script-heavy judgment to hybrid LLM-plus-rules architecture without losing deterministic outputs

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
7. refactor `task/vet` toward `TaskSpec` and `VetReport`
8. implement `session-distill`
9. remove obsolete Cursor runtime pieces
10. rewrite README and product docs

This order minimizes rework because memory is the real dependency under both `task` and `vet`, while session distillation depends on memory-write being settled first. It also avoids baking too much high-level refinement logic into deterministic task scripts before the hybrid contract is defined.

---

## Test Strategy

Tests should shift from platform-specific Cursor runtime coverage to LingXi 2.0 contract coverage.

### High-Priority Test Areas

- plugin shape validation
- setup/bootstrap output
- task id generation
- task document creation/update
- vet behavior against task docs
- `TaskSpec` validation and repair-loop behavior
- `VetReport` structure stability
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

### Risk 6: Overfitting Task/Vet To Deterministic Rules

Mitigation:

- move high-level refinement into LLM-guided `TaskSpec` generation
- keep deterministic scripts focused on validation and compilation
- test the schema contracts rather than hard-coding all reasoning into scripts

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
8. task quality improves through LLM refinement without losing deterministic task document quality
9. vet quality improves through LLM review without losing stable review contracts

---

## Change Control

If implementation reveals a meaningful constraint change, update this roadmap before expanding scope.

Acceptable revisions:

- changing file names
- changing exact script names
- refining note schema
- refining automation prompt structure
- refining `TaskSpec` and `VetReport` schemas


---

## Appendix: Daemon Pattern Research And Possible LingXi Enhancements

This appendix records the current technical research conclusion on the **daemon / background service** pattern, so the engineering team can review it as part of LingXi 2.0 planning.

It is intentionally framed as a technical option analysis, not as a change to the fixed roadmap decisions above.

### Reference Pattern Studied

A useful recent reference is the `Claude-to-IM-skill` project, which uses a background daemon to bridge external message channels with Claude Code / Codex.

The implementation pattern is broadly:

1. install the skill into the Codex skill directory
2. install dependencies and build a bundled daemon entrypoint
3. start the daemon through a thin shell launcher
4. hand process lifecycle to a platform-specific supervisor
5. persist PID, status, and logs into a runtime directory
6. let the daemon process update authoritative runtime state after successful startup

The Codex install script in that project copies or symlinks the skill into `~/.codex/skills`, runs `npm install`, builds `dist/daemon.mjs`, and prunes dev dependencies before use. citeturn205659view0

The daemon launcher then prepares runtime directories, checks whether a rebuild is needed, loads config, starts the process through a platform-specific supervisor, and confirms successful startup by polling a status file rather than assuming the child process is healthy immediately. citeturn205659view1

On Linux, the supervisor pattern is intentionally simple: use `setsid` or `nohup`, redirect stdout/stderr to a log file, write a fallback PID immediately, and then let the real daemon overwrite the PID with the authoritative process id after it is fully running. citeturn205659view2turn205659view1

On macOS, the same project uses `launchd` with a generated LaunchAgent plist, which forwards selected environment variables, registers the service, and lets `launchctl` become the source of truth for service lifecycle and status. citeturn205659view3

This is the main technical takeaway: a good daemon implementation is usually **two-layered**.

- Layer 1: a thin launcher / supervisor wrapper
- Layer 2: the actual Node.js runtime that owns business state

That separation is directly relevant to LingXi if the team ever chooses to add a background runtime helper.

### Daemon Implementation Pattern Worth Reusing

If LingXi ever adopts a daemon-style helper, the implementation should follow a similar pattern:

#### 1. Thin launcher, thick runtime

Use a small launcher script only for:

- locating the workspace
- ensuring required directories exist
- checking whether the runtime bundle is stale
- starting or stopping the background process
- surfacing status and logs

The launcher should **not** contain LingXi memory logic.

All business logic should stay in the runtime entrypoint.

#### 2. Platform-specific supervision

If adopted, supervision should remain explicit:

- macOS: `launchd`
- Linux: `setsid` / `nohup` fallback, or later a stricter service manager if needed
- Windows: only if truly required later; not necessary for LingXi V1 planning

This keeps the daemon operationally understandable and avoids pretending that one process-control strategy works equally well everywhere.

#### 3. Runtime state as files, not hidden memory

A LingXi daemon helper should persist operational state into `.lingxi/state/`, for example:

```text
.lingxi/state/
  daemon.pid
  daemon-status.json
  daemon-log.txt
  processed-sessions.json
  distill-journal.jsonl
  dirty-sessions.json
```

The main lesson from the reference pattern is that PID, status, logs, and business state should be explicitly persisted and inspectable, not kept only in process memory. The reference daemon persists PID and status separately and uses status confirmation instead of assuming process spawn equals healthy startup. citeturn205659view1turn205659view2

#### 4. Health confirmation after startup

If LingXi uses a daemon helper, `start` should not mean merely “spawned a process.”

It should mean:

- process started
- runtime initialized successfully
- workspace paths resolved
- required config loaded
- status file written by the runtime itself

That startup rule is important because it avoids false positives and stale PID issues. The reference implementation explicitly waits for a status file to report healthy state after launch. citeturn205659view1

#### 5. Separation between operational state and semantic state

If a daemon exists, it should manage operational concerns such as:

- which sessions are dirty
- which distill jobs are pending
- whether a previous run failed
- whether a retry is needed

But semantic LingXi outputs should still be written through the existing memory contracts:

- `.lingxi/memory/...`
- `.lingxi/state/processed-sessions.json`
- `.lingxi/state/distill-journal.jsonl`

The daemon should not invent a second hidden memory system.

### What LingXi Could Realistically Enhance With A Daemon Helper

The roadmap already commits LingXi to **automation-backed session distillation** as the primary low-intrusion mechanism.

That should remain the main path.

However, a daemon helper could still be useful as an **optional enhancement layer** for a later phase if the team decides automation alone is not sufficient.

The most plausible enhancements are below.

### Enhancement A: Dirty-Session Queue Maintenance

A daemon helper could watch for newly created or changed session artifacts and maintain a `dirty-sessions.json` queue.

Possible responsibilities:

- detect newly appeared sessions
- detect content changes to already-known sessions
- compute normalized content fingerprints
- mark sessions as pending distillation
- avoid rescanning the full session corpus every run

This would make background distillation more incremental and cheaper without changing the visible product surface.

### Enhancement B: Faster Incremental Distillation Scheduling

Instead of waiting for a broad periodic scan every 6 hours, a daemon helper could pre-stage work continuously and let the official automation run consume that queue.

Possible model:

1. daemon detects changed sessions
2. daemon updates queue and metadata only
3. automation still performs the actual `session-distill`
4. memory writes remain under the existing LingXi workflow

This preserves the roadmap's “automation-backed” principle while reducing scan overhead.

### Enhancement C: Retry And Recovery For Failed Distill Jobs

A daemon helper could maintain operational recovery metadata, for example:

- last failure timestamp
- last attempted fingerprint
- retry count
- backoff state
- interrupted run marker

That would improve resilience for background distillation without changing the semantic memory model.

### Enhancement D: Repo-Relevance Pre-Filtering

A daemon helper could improve session selection before distillation by continuously maintaining repo-relevance metadata, such as:

- working directory match
- referenced file paths
- repository root match
- explicit exclusions for cross-repo sessions

This would reduce noisy candidate sessions before the more expensive distillation logic runs.

### Enhancement E: Operational Observability

A daemon helper could expose better runtime introspection for engineering and debugging, for example:

- current queue depth
- last successful distill run
- last failed distill run
- current content fingerprint version
- currently pending sessions
- stale lock or PID detection

This is especially useful if background processing becomes hard to reason about from automation logs alone.

### Enhancement F: Coalescing Repeated Session Changes

If one session changes many times in a short period, a daemon helper could coalesce those updates before distillation.

For example:

- session changed 15 times in 10 minutes
- daemon keeps only the latest normalized fingerprint
- automation later distills only the newest stable snapshot

This can reduce duplicate work while still respecting the roadmap's dedupe contract.

### What A LingXi Daemon Should Not Do

Based on both the roadmap direction and the reference implementation study, the daemon pattern should **not** be used in LingXi as the main mechanism for:

- analyzing every user message inline
- injecting memory into every conversation turn by default
- replacing the `task -> vet` visible workflow with hidden orchestration
- writing memory opportunistically on transient signals
- reintroducing Cursor-style hook-heavy runtime behavior under a new name

If LingXi adopts a daemon helper at all, it should remain an infrastructure-level assistant, not the product's main intelligence path.

### Recommendation For LingXi 2.0

Current recommendation:

1. **Do not** make daemon technology part of the LingXi 2.0 V1 critical path.
2. Keep the roadmap's current default: automation-backed batch session distillation.
3. If later needed, introduce a daemon only as an **optional runtime helper** for queueing, recovery, pre-filtering, and observability.
4. Keep memory extraction and memory writing inside the existing LingXi contracts, not inside an opaque always-on service.

### Decision Frame For Engineering Review

If the team wants to evaluate a daemon helper later, review it against these questions:

- Does it reduce rescanning or improve recovery enough to justify added operational complexity?
- Does it preserve automation-backed distillation as the primary semantic path?
- Does it keep all state inspectable inside `.lingxi/`?
- Does it avoid per-message intrusive analysis?
- Does it avoid reintroducing hybrid Cursor-era runtime complexity?

If the answer to any of the last two questions is “no,” then the daemon direction should be rejected for LingXi.
