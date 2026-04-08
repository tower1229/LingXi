[中文](./README_ZH.md)

# LíngXī（灵犀）

Cursor workflow with persistent memory.

---

## Why (Vision)

Your go-to toolkit for creators in the AI era.

## How (Approach)

### 1) In Sync With You

Persistent memory so the AI works the way you do.

### 2) AI Native

Respect AI capability and leave room for evolution.

### 3) To Your Liking

Lower cognitive load and a smooth, user-friendly experience.

---

## What (Implementation)

- **Flexible workflow**: Compose your own flow—rigorous when needed, light when not
- **Persistent memory bank**: Learns your judgment, taste, and responsibility in the project and applies them in every new conversation
- **Human in the loop**: Key decisions follow your lead—optional when you want, never overstepping when you don’t
- **Self-iterate**: Run low-risk, audit-driven improvements on heartbeat cycles so the system keeps getting more stable and accurate
- **Ready to use**: Use the install script to add LingXi to your project, then run `/init` to understand project context and bootstrap LingXi workflow

---

## Install & Quick Start

### Install

Run one of the following commands from your **project root** to install LingXi into your project:

- **Linux / macOS / Git Bash:**
  ```bash
  curl -fsSL https://raw.githubusercontent.com/tower1229/LingXi/main/install/bash.sh | bash
  ```
- **Windows PowerShell:**
  ```powershell
  irm https://raw.githubusercontent.com/tower1229/LingXi/main/install/powershell.ps1 | iex
  ```

After install, open the project in Cursor and run `/init` once to build project context and generate optional memory candidates (write is gated by your explicit choice).

---

### Quick Start

**We recommend running `/init` first** to understand the existing project and prepare optional memory candidates; then use the workflow skills or helper commands below.

#### Workflow skills

The core workflow is driven by **Skills** (task, vet, plan, build, review). Invoke them by typing `/task`, `/plan`, `/build`, `/review`, or `/vet` (Cursor shows the matching skill) or by natural language (e.g. “create a task document”, “plan task 001”).

Use these in lifecycle order:

| Skill      | Usage                                                                                                                                                         | Description                                                                                                                                                                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **task**   | `/task <description>` or “create task…”<br><br>**Examples:**<br>`/task Add user login with email and phone`<br>`/task Improve homepage load, target LCP < 1s` | **Create task doc**<br><br>Auto task id (001, 002...) and title; creates:<br>`.lingxi/tasks/001.task.<title>.md`<br><br>This is the core document for the whole workflow, including refined requirements, technical approach, and acceptance criteria.                   |
| **vet**    | `/vet [taskId]` or “review task doc”<br><br>**Examples:**<br>`/vet 001`<br>`/vet` (latest task)                                                               | **Review task doc (optional)**<br><br>Multi-dimension review of the task doc to improve quality. Optional, can be run multiple times.<br><br>No file output; results and suggestions in chat only.                                                                               |
| **plan**   | `/plan [taskId]` or “plan task…”<br><br>**Examples:**<br>`/plan 001`<br>`/plan` (latest task)                                                                 | **Task planning (optional)**<br><br>Generate plan and test-case docs from the task doc. For complex tasks; simple ones can skip.<br><br>**Tip:** Works with Cursor’s plan mode.                                                                                                  |
| **build**  | `/build [taskId]` or “implement task…”<br><br>**Examples:**<br>`/build 001`<br>`/build` (latest task)                                                         | **Run build (optional)**<br><br>Two modes:<br>- **Plan-driven**: Follow plan when present (recommended)<br>- **Task-driven**: Agent decides from task doc when no plan<br><br>**Tip:** In plan mode you can use its built-in build and skip LingXi’s build skill.                |
| **review** | `/review [taskId]` or “review delivery”<br><br>**Examples:**<br>`/review 001`<br>`/review` (latest task)                                                      | **Review delivery**<br><br>Multi-dimension review and report:<br><br>**Core:** functionality, test coverage, architecture, maintainability, regression<br><br>**Optional:** doc consistency, security, performance, E2E<br><br>**Tests:** unit, integration, E2E when applicable |

#### Helper commands

| Command     | Usage                                                                                                                            | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/remember` | `/remember <description>`<br><br>**Examples:**<br>`/remember Capture the lesson from that bug`<br>`/remember Always use X for Y` | **Write to memory (any time)**<br><br>No task id needed. Write judgments, tradeoffs, runbooks, or checks to `memory/project/` (or `memory/share/` for team-level) for later retrieval.<br><br>**Use when:**<br>- Stating a principle or decision<br>- Extracting from recent conversation<br>- Giving keywords so the system can find and extract the right content<br><br>**Session distillation** is automatic: when you start a new conversation and it has been more than 30 minutes since the last run, LingXi enqueues up to 3 finished sessions for background distillation (source=heartbeat); no command needed. |
| `/init`     | `/init`                                                                                                                          | **Initialize project context (first use)**<br><br>Guided understanding of an existing project, producing memory candidates with explicit write gating. Internal workspace bootstrap may run as a preflight step. Recommended when first using LingXi in a project.                                                                                                                                                                                                                                                                                                                                                        |

#### Sharing experience across projects (share dir + git submodule)

LingXi uses a designated share directory for team knowledge that can be reused across projects:

- Share directory: `.lingxi/memory/share/` (recommended as a **git submodule**). Team-level memory (`apply=team`) is written here; project-level memory is written to `memory/project/`.

**1) Add share repo (submodule)**

```bash
git submodule add <shareRepoUrl> .lingxi/memory/share
```

**2) Update share repo**

```bash
git submodule update --remote --merge
```

**3) Sync memory index (after adding shared notes)**

In Cursor, run the **memory-govern** skill (e.g. type `/memory-govern`) to sync INDEX with notes (removes orphan index rows and lets the model complete INDEX lines for unindexed notes).

## Related docs

- [Core Architecture](.cursor/skills/about-lingxi/references/architecture.md)
