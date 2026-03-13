# 灵犀（LingXi）架构概览 (Architecture Overview)

> **定位**：本文档是灵犀（LingXi）AgentOS 工程体系的顶层设计说明，也是整个 `about-lingxi` 知识体系的**骨架**。四层架构与开发工作流在此统一呈现，其它机制与原则均依附于此展开。阅读顺序建议：先建立四层心智模型，再理解工作流如何在这一架构上运行。

---

## 一、AgentOS 四层架构模型

灵犀将 Agent 能力收敛为一座**基于文件系统运行的 Agent 操作系统 (AgentOS)**：调度、执行、记忆、守护四层各司其职，形成从决策到落地、从状态到保活的完整闭环。这一分层并非简单归类，而是通过**职责边界清晰**与**契约唯一**，使系统可推理、可审计、可演进。

下图概括了四层之间的数据流与依赖关系：

```mermaid
graph TD
    classDef layer fill:#f9f9f9,stroke:#333,stroke-width:2px;

    User((用户))

    subgraph 调度层 [一、调度层 Orchestrator Layer - 大脑]
        MainAgent(主 Agent / Kernel)
        Tiers(双轨决策: Fast-Path vs Strict OS)
    end

    subgraph 执行层 [二、执行层 Execution Layer - 手脚]
        Subagents(Subagents 算力集群)
        Protocol(Megaprompt 交互协议)
    end

    subgraph 记忆层 [三、记忆层 Memory Layer - 存储]
        StateFile(短期情节记忆: HOT_RAM/TRACE)
        Knowledge(长效语义记忆: USER/Memory/INDEX)
        GlobalSync(全局同步缓存: WAL_BUFFER)
    end

    subgraph 守护层 [四、守护层 Daemon Layer - 心跳机制]
        Hooks(心跳触发: beforeSubmitPrompt)
        Watchdog(heartbeat-check 调度与执行)
        Apps(30min 会话提炼入队 / 24h 自我迭代)
    end

    User <--> MainAgent
    MainAgent -- 1. 分级决策与挂载 --> StateFile
    MainAgent -- 2. 派发被约束的任务 --> Subagents
    Subagents -- 3. 操作工程环境 --> Workspace[(代码工作区)]
    Subagents -- 4. 返回契约 (Summary) --> MainAgent
    MainAgent -- 5. 更新状态与消费后处理队列 --> StateFile
    Hooks -- 6. 用户提交消息时触发 --> Watchdog
    Watchdog -. 写 WAL / 扫 WAL 执行 24h 任务 .-> StateFile
    MainAgent -. 消费 WAL 唤起 session-distill .-> Knowledge

    class 调度层,执行层,记忆层,守护层 layer;
```

### 1. 调度层 (Orchestrator Layer / Kernel)

**定位**：系统的决策中枢。所有用户请求首先由调度层解读与分级，再决定“谁来做、以何种模式做”，调度层自身不直接执行业务代码或重度 I/O，从而保持**单一职责**与**可审计性**。

**核心机理**：

- **双轨执行决策 (Dual-Path Execution)**：内核通过决策树将请求划分为 Tier 1/2/3。纯信息类、轻量交互、以及**工作流中的 task / vet / plan / review**（交互与审计类）走 **Fast-Path**，由主 Agent 直接执行，可 ask-questions、直接写文档与完整审查报告，无需状态机与子代理派发，**低延迟、省 token**；仅**涉及代码编写、调试或 build 步骤**的请求强制进入 **Strict OS Mode**，激活状态机并委派 Subagent，**隔离风险、契约可追溯**。双轨设计使“规划与审查在主会话完成、仅实现阶段走子代理”成为可能，兼顾体验与可控性。
- **确定性管道 (Deterministic Pipeline)**：在 Strict OS 下，调度层严格按“前置检索 → 任务委派 → 状态回收 → 后置义务”执行。每一轮子代理返回后，内核必先同步状态文件、再消费后处理队列，**无隐式分支**，便于推理与排错。
- **后置闭环收敛 (Lifecycle Convergence)**：通过 `HOT_RAM.md` 中的 `[POST-PROCESSING QUEUE]`，所有衍生义务（如记忆写入、文档同步、报告呈现）在会话收敛前被显式执行并勾销。**会话结束即无遗留任务**，避免“做了开发却忘了记一笔”的语义泄漏。

**架构优势**：决策集中、路径可预测；双轨降低简单请求成本，严格管道保障复杂请求的完整性与可追溯性。

---

### 2. 执行层 (Execution Layer / Worker)

**定位**：提供**隔离的算力单元**。所有高风险、重度 I/O 的操作（写代码、跑测试、大规模读写）均由执行层承担，调度层只做“派发 + 回收结果”，从而实现**主从解耦**。

**核心机理**：

- **主从解耦 (Orchestrator-Worker)**：调度层不直接修改代码或执行长链工具调用；此类工作一律通过 **Subagent** 在独立上下文中完成。主 Agent 上下文得以保持精简，专注于“理解意图、做决策、收结果”，子代理专注于“在约束内执行并返回契约”。职责分离后，主会话不易被实现细节污染，子代理可独立升级或替换。
- **标准契约协议 (The Protocol)**：调度层通过 **Megaprompt**（含 4 步约束注入）下发任务，Subagent 必须返回 **`<Execution_Summary>`** 结构体（含状态、摘要、可选的 Payload JSON）。统一的 I/O 契约使不同模型、不同子代理类型都能与内核无缝协作，**可替换、可扩展**。

**架构优势**：执行与调度解耦，主会话稳定、子代理可隔离演进；统一契约降低集成成本，便于多模型/多任务编排。

---

### 3. 记忆层 (Memory Layer / Storage)

**定位**：AgentOS 的**虚拟内存与持久存储**。状态与知识均以**文件即状态 (File-as-State)** 的形式落盘，便于版本管理、人工巡检与跨会话恢复。

**工程实现**：

- **短期情节记忆 (Episodic)**：`HOT_RAM.md` 作为当前会话的**状态寄存器**（当前状态、后处理队列、全局配置等），`SESSION_TRACE.md` 记录顺序操作流水，共同支撑断点恢复与后处理消费。会话内“正在做什么、还要做什么”一目了然。
- **长效语义记忆 (Semantic)**：`USER.md` 存用户全局偏好与行为指引，`memory/` 与索引（如 `INDEX.md`）存项目资产与规范。情节记忆在会话结束或守护层触发时，可经提炼写入语义记忆，实现**从操作到常识**的沉淀。
- **全局同步缓存 (IPC)**：`WAL_BUFFER.md` 用于跨会话的异步信号与大块数据暂存（如会话提炼任务），由主 Agent 在后处理阶段消费，避免阻塞主循环。

**架构优势**：状态可读、可查、可恢复；情节与语义分离，既满足会话内即时需求，又支持长期资产积累；文件形态与现有工具链兼容，易于治理与审计。

---

### 4. 守护层 (Daemon Layer / Heartbeat)

**定位**：守护层的**主体是心跳机制**。由 Hook 在用户每次提交消息时触发、Watchdog（`heartbeat-check.mjs`）执行，不阻塞主对话；基于心跳目前实现了两类应用：**30 分钟自动会话提炼**与 **24 小时自我迭代**，二者均通过写入或消费 `WAL_BUFFER.md` 与主 Agent 或后台脚本协同。

**核心机理**：

- **心跳机制 (Heartbeat)**：`beforeSubmitPrompt` 触发 `heartbeat-trigger.mjs`，其调用 `heartbeat-check.mjs`，与用户使用节奏对齐、触发及时。Watchdog 只做两件事：**按条件向 WAL 写入任务**；**扫描 WAL 并执行可由脚本直接完成的任务**（如 24h 自我迭代），不注入主会话上下文、不占用大模型额度。
- **30 分钟会话提炼**：若距上次提炼完成超过 30 分钟，Watchdog 将 `[SESSION_DISTILL]` 任务（含候选会话 id）写入 `WAL_BUFFER.md`，并更新 `heartbeat-control.json` 等状态。主 Agent 在后续轮次的后处理阶段读取 WAL，若发现未处理的 `[SESSION_DISTILL]` 则唤起 **lingxi-session-distill** 子代理；子代理从历史对话（agent-transcripts）中提炼可沉淀经验，产出 payload 经 memory-write 写入记忆层，实现**从情节到语义的自动化沉淀**。
- **24 小时自我迭代**：若距上次诊断超过 24 小时，Watchdog 将 `[SELF_ITERATE]` 任务写入 WAL，并在扫描 WAL 时**直接在后台 `exec`** 执行 `lingxi-self-iterate` 的 Node 脚本（如 memory-improvement-proposal + apply），读取 `MEMORY_JOURNAL.jsonl` 等做低风险诊断与改进，结果写入日志，不经过主 Agent。

**架构优势**：心跳与用户行为绑定，主流程无感；30min 提炼由主 Agent 消费 WAL 后唤起子代理，24h 迭代由 Watchdog 纯脚本执行，职责清晰、可扩展；记忆可持续沉淀，支撑“心有灵犀”的长期价值。

---

## 二、开发工作流（Workflow）

开发工作流是灵犀在四层架构之上提供的一条**可选、显式触发**的工程管道：从需求到交付，各步骤由对应 Skill 实现，产物与状态落在记忆层，执行路径由调度层双轨决策与执行层 Subagent 契约共同保障。工作流与架构的关系见下文 2.2。

### 2.1 工作流概览

**定位**：可伸缩的软件开发管道——既可严格走全流程（task → vet → plan → build → review），也可按需切入任意阶段（如直接 `/plan`、`/build`），兼顾工程严谨与轻便快捷（对应核心价值中的“称心如意”与“可伸缩工作流”）。

**步骤与职责**：

| 步骤 | 职责 | 主要产物 / 输出 |
|------|------|-----------------|
| **task** | 需求提纯与放大，产出可验收的 task 文档 | `.cursor/.lingxi/tasks/<taskId>.task.<标题>.md` |
| **vet** | 对 task 做多维度审查（D1–D5），不写文件 | 审查结果与下一步建议 |
| **plan** | 任务拆解、F→T→TC 映射、先测再实现顺序 | `<taskId>.plan.*.md`、`<taskId>.testcase.*.md` |
| **build** | 按 task/plan 实现与测试（Plan-driven 或 Task-driven，TDD） | 代码与测试变更 |
| **review** | 按需求编号验收，多维度审查（文档一致性 / 安全 / 性能 / E2E） | `<taskId>.review.*.md` |

**统一契约**：上述步骤及 `/init`、`/remember` 均遵循 `workflow-output-principles.md`：成功时静默或最小高信号输出；有产物时必须在当轮回复末尾给出「下一步可尝试（选一项）」及 A/B/C/D 选项，保证用户每步之后都能明确可选动作。契约由各 Command/Skill 文档引用该文件统一约束，不通过全局 Rules 注入，**保持工作流行为可预测且易于调优**。

### 2.2 工作流与四层的关系

工作流并非独立于四层之外，而是**由四层协同承载**：

| 层级 | 在工作流中的角色 |
|------|------------------|
| **调度层** | 判定请求属于哪一工作流步骤；**task / vet / plan / review** 走 **Fast-Path**（主 Agent 直接执行，可 ask-questions、直接写文档与完整审查报告）；**仅 build** 走 **Strict OS**（委派 Subagent，主 Agent 做零干预派发与后处理）。编排、下一步建议、状态读写均经调度层。 |
| **执行层** | 各步骤由对应 **Skill** 实现；**仅 build** 由 **Subagent** 在隔离上下文中执行，通过 Megaprompt 与 `<Execution_Summary>` 与内核交互；task / vet / plan / review 由主 Agent 在主会话中直接执行。 |
| **记忆层** | 工作流**产物**统一落在 `.cursor/.lingxi/tasks/`（task / plan / testcase / review 文档）；会话状态与后处理队列在 `HOT_RAM.md`、`SESSION_TRACE.md`；后处理阶段可能触发记忆写入等，仍写入记忆层。 |
| **守护层** | 不驱动工作流步骤，但通过心跳与状态自愈保障 `HOT_RAM` 与会话一致性，使工作流在异常或中断后**可恢复、可追溯**。 |

由此可见：**工作流是架构的上层用法**，四层为其提供决策、执行、持久化与保活能力；工作流的可伸缩与可跳过设计，也反过来依赖调度层双轨与执行层契约才能稳定实现。

### 2.3 延伸阅读

- **输出与静默契约**：`workflow-output-principles.md`
- **组件与入口**：`component-guides.md`（工作流 Skills、Commands、Subagents 分工）
- **各步细节**：task / plan / build / review / vet 的 `SKILL.md`

---

## 三、架构骨架下的文档映射

本文档是整个 `about-lingxi` 的顶层心智模型，其它文档按层级与主题挂靠如下：

1. **指向调度层**：`design-principles.md`、`evaluation-criteria.md`、`rules-guide.md`
2. **指向执行层**：`component-guides.md`、`cursor-agent-tools.md`
3. **指向记忆层**：`memory-system.md`、`ipc-protocols.md`
4. **指向守护层**：`engineering-practices.md` 及心跳相关实现
5. **指向工作流**：`workflow-output-principles.md`、`component-guides.md`（工作流 Skills 与 Commands）、各工作流 Skill 的 `SKILL.md`

> **结语**：灵犀架构的核心是**用调度层思考、用执行层干活、写在记忆层、依托守护层保活**；开发工作流则是在此之上的可伸缩管道，从需求到交付均可追溯、可跳过、可组合。这是一套既便于人理解、又便于 AI 在约束内自我驱动的工程框架。
