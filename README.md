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

Respect AI capabilities and leave room to evolve.

### 3) To Your Liking

Lower cognitive load and a smooth, user-friendly experience.

---

## What (Implementation)

- **Flexible workflow**: Compose your own flow—rigorous when needed, light when not
- **Persistent memory bank**: Learns your judgment, taste, and responsibility in the project and applies them in every new conversation
- **Human in the loop**: Key decisions follow your lead—optional when you want, never overstepping when you don’t
- **Context curation**: Optimize context so the model focuses on what matters
- **Ready to use**: Install from the Cursor plugin marketplace, then run `/init` to quickly set up LingXi in your project

---

## Install & Quick Start

### Install

Install LingXi from the **Cursor plugin marketplace** (search for “LingXi” or “灵犀”). Once installed, its commands, skills, agents, and hooks load with the plugin and are available in any open workspace.

- **First time**: We recommend running `/init` once in your project to create the workspace layout (`.cursor/.lingxi/`) and optional memory drafts.

---

### Quick Start

**We recommend running `/init` first** to initialize the project (creates `.cursor/.lingxi/` skeleton and templates); then use the commands below.

#### Core workflow commands

Use these in lifecycle order:

| Command       | Usage                                                                                                                                    | Description                                                                                                                                                                                                                                                                      |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/req`        | `/req <description>`<br><br>**Examples:**<br>`/req Add user login with email and phone`<br>`/req Improve homepage load, target LCP < 1s` | **Create task doc**<br><br>Auto task id (001, 002...) and title; creates:<br>`.cursor/.lingxi/tasks/001.req.<title>.md`<br><br>Core doc for the whole workflow: refined requirements, technical approach, and more.                                                              |
| `/review-req` | `/review-req [taskId]`<br><br>**Examples:**<br>`/review-req 001`<br>`/review-req` (latest task)                                          | **Review req doc (optional)**<br><br>Multi-dimension review of the req doc to improve quality. Optional, can be run multiple times.<br><br>No file output; results and suggestions in chat only.                                                                                 |
| `/plan`       | `/plan [taskId]`<br><br>**Examples:**<br>`/plan 001`<br>`/plan` (latest task)                                                            | **Task planning (optional)**<br><br>Generate plan and test-case docs from the req. For complex tasks; simple ones can skip.<br><br>**Tip:** Works with Cursor’s plan mode.                                                                                                       |
| `/build`      | `/build [taskId]`<br><br>**Examples:**<br>`/build 001`<br>`/build` (latest task)                                                         | **Run build (optional)**<br><br>Two modes:<br>- **Plan-driven**: Follow plan when present (recommended)<br>- **Req-driven**: Agent decides from req when no plan<br><br>**Tip:** In plan mode you can use its built-in build and skip LingXi’s `/build`.                         |
| `/review`     | `/review [taskId]`<br><br>**Examples:**<br>`/review 001`<br>`/review` (latest task)                                                      | **Review delivery**<br><br>Multi-dimension review and report:<br><br>**Core:** functionality, test coverage, architecture, maintainability, regression<br><br>**Optional:** doc consistency, security, performance, E2E<br><br>**Tests:** unit, integration, E2E when applicable |

#### Helper commands

| Command     | Usage                                                                                                                            | Description                                                                                                                                                                                                                                                                                                                   |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/remember` | `/remember <description>`<br><br>**Examples:**<br>`/remember Capture the lesson from that bug`<br>`/remember Always use X for Y` | **Write to memory (any time)**<br><br>No task id needed. Write judgments, tradeoffs, runbooks, or checks to `memory/notes/` for later retrieval.<br><br>**Use when:**<br>- Stating a principle or decision<br>- Extracting from recent conversation<br>- Giving keywords so the system can find and extract the right content |
| `/init`     | `/init`                                                                                                                          | **Initialize project (first use)**<br><br>Guided collection of project info (stack, patterns, rules), then optional write of initial memory to `memory/notes/`. Recommended when first using LingXi in a project.                                                                                                             |

#### Sharing experience across projects (share dir + git submodule)

LingXi uses a designated share directory for team knowledge that can be reused across projects:

- Share directory: `.cursor/.lingxi/memory/notes/share/` (recommended as a **git submodule**)

**1) Add share repo (submodule)**

```bash
git submodule add <shareRepoUrl> .cursor/.lingxi/memory/notes/share
```

**2) Update share repo**

```bash
git submodule update --remote --merge
```

**3) Sync memory index (after adding shared notes)**

```bash
npm run memory-sync
```

> `memory-sync` recursively scans `.cursor/.lingxi/memory/notes/**` and updates `.cursor/.lingxi/memory/INDEX.md`.

## Related docs

- [Core Architecture](.cursor/skills/about-lingxi/references/architecture.md)
