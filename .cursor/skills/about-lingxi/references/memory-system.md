# 灵犀记忆系统 (Memory System)

## 概述

记忆系统是灵犀实现「心有灵犀」的核心能力：把对话中的判断与取舍沉淀为可检索资产，并在每轮对话中做最小注入，提升一致性与长期复用。在 AgentOS 架构下，记忆对应**记忆层**，与调度层（状态读写）、守护层（提炼与迭代触发）紧密配合，形成**情节 → 语义**的闭环。

本页说明**情节记忆 / 语义记忆 / 全局同步缓存**的划分、记忆固化与提炼路径，以及摄入、检索、写入、治理的机制。与 `architecture.md` 记忆层一节对应。

---

## 一、记忆层在架构中的三种形态

| 形态 | 用途 | 主要文件 | 生命周期 |
|------|------|----------|----------|
| **短期情节记忆 (Episodic)** | 当前会话状态、后处理队列、操作流水 | `HOT_RAM.md`、`SESSION_TRACE.md` | 会话内；支撑断点恢复与后处理消费 |
| **长效语义记忆 (Semantic)** | 用户偏好、项目规范、可复用经验 | `USER.md`、`memory/`、`INDEX.md` | 跨会话；经提炼或主动录入写入 |
| **全局同步缓存 (IPC)** | 跨会话异步任务队列（如会话提炼） | `WAL_BUFFER.md` | 入队 → 消费 → 勾选；格式见 `wal-schema.md` |

- **情节记忆**：会话内“正在做什么、还要做什么”一目了然；后处理队列（`[POST-PROCESSING QUEUE]`）驱动记忆写入、文档同步等衍生义务。
- **语义记忆**：情节在会话结束或守护层触发时，可经提炼写入语义记忆，实现**从操作到常识**的沉淀。
- **WAL**：守护层（heartbeat-plugins）将 30min/24h 等任务写入 WAL；主 Agent 在后处理阶段消费 WAL 中的 `[SESSION_DISTILL]` 并唤起 session-distill，完成后再勾选 WAL。详见 `architecture.md` 守护层。

---

## 二、情节记忆：HOT_RAM 与 SESSION_TRACE

- **HOT_RAM.md**：当前会话的**状态寄存器**。包含当前状态、`[POST-PROCESSING QUEUE]`、`[PRE-MEMORY]`、全局配置等；所有衍生义务在此排队，由调度层在后置收敛阶段依次消费，**无隐式分支**。
- **SESSION_TRACE.md**：本会话执行历史与操作流水，支撑跨轮上下文连续性；主 Agent 按需读取。

情节记忆不持久到下一会话；需要长期保留的内容经后处理写入语义记忆（见下文「记忆写入」）。

---

## 三、语义记忆：USER、memory/ 与 INDEX

- **USER.md**（`.cursor/.lingxi/os/USER.md`）：用户全局偏好与行为指引（称呼、语言、输出风格等），会话初始化时注入 HOT_RAM，零检索，对所有 Tier 生效。
- **memory/**：扁平化记忆库。
  - **INDEX.md**：统一索引（SSoT，最小元数据），用于治理与定位；真实语义检索以实体文件为准。
  - **memory/project/**：项目级记忆（语义 + 关键词混合检索的主搜索面）。
  - **memory/share/**：跨项目共享记忆（推荐 git submodule）；同 Id 时 **project 覆盖 share**。

语义记忆的写入必须经 **lingxi-memory-write** 子代理在独立沙盒中执行，并同步更新 INDEX；检索由 **memory-retrieve** Skill 承担（双路并发：语义相似度 + 关键词并集加权）。

---

## 四、全局同步缓存（WAL）与记忆提炼路径

**WAL_BUFFER.md** 用于跨会话的异步任务队列，格式与解析以 `wal-schema.md`、`wal-utils.mjs` 为准。

**记忆固化与提炼路径**：

1. **30 分钟会话提炼 (SESSION_DISTILL)**  
   守护层插件 `session-distill.mjs` 在满足时间与锁条件时入队一条 `[SESSION_DISTILL]` 任务（payload 含 `candidate_ids`、`enqueued_by`）。主 Agent 在后处理阶段读取 WAL，若发现未勾选的该任务，则唤起 **lingxi-session-distill** 子代理；子代理从 agent-transcripts 提炼可沉淀经验，产出 payload 经 **memory-write** 写入记忆层。完成后主 Agent 调用 `heartbeat-distill-done.mjs` 更新 control 并勾选 WAL 行，实现**从情节到语义的闭环**。
2. **24 小时自我迭代 (SELF_ITERATE)**  
   守护层插件 `self-iterate.mjs` 入队 `[SELF_ITERATE]`；Watchdog 在消费阶段后台执行 lingxi-self-iterate 的 Node 脚本，读取 `MEMORY_JOURNAL.jsonl` 等做低风险诊断与改进，仅在成功时勾选 WAL 行。

---

## 五、记忆摄入 (Ingestion)

- **前置品味识别 (taste-recognition)**：主 Agent 在 IDLE 收到用户输入时，可先调用 taste-recognition 嗅探具有长期记忆价值的内容，产出 Payload 压入 HOT_RAM 后处理队列。
- **主动记忆录入 (`/remember`)**：用户主动发起，经 taste-recognition 识别后转为 Payload 压入队列。
- **30min 心跳蒸馏**：见第四节；由 heartbeat-plugins 入队，主 Agent 消费 WAL 时唤起 session-distill。

---

## 六、记忆检索与应用 (Retrieval & Injection)

由 **memory-retrieve** Skill 承担，双路并发（语义相似度 + 标题/正文关键词并集加权）。

- **前置约束检索 (Pre-Retrieve)**：主 Agent 处于 IDLE 收到新指令时，按用户意图检索“事前生效”记忆，写入 HOT_RAM 的 `[PRE-MEMORY]`，并约束后续 Subagent（编译进 Megaprompt）。
- **后置义务检索 (Post-Retrieve)**：主 Agent 处于 POST_PROCESSING_REQUIRED 时，以 `<Execution_Summary>` 的 Touched Assets 为线索，检索“事后生效”记忆，结果作为 Checkbox 任务追加到 `[POST-PROCESSING QUEUE]`。

---

## 七、记忆写入与存储 (Storage)

- **独立沙盒写入**：所有记忆写入由 **lingxi-memory-write** 子代理执行，主 Agent 不直接写记忆文件。
- **写入前门控**：TopK 相似度检索；完全相同的去重，细节互补的合并，颠覆已有定义的低置信度新规须拦截并询问用户。
- **跨层级存储**：可明确保存到 `memory/project/` 或 `memory/share/`。
- **遥测**：写入事件追加至 `MEMORY_JOURNAL.jsonl` 供审计与 24h 自我迭代使用。

---

## 八、治理与维护 (Governance)

- **INDEX 同步**：任何记忆增删改须同步反映到 `INDEX.md`。
- **memory-govern**：显式 Skill，清理死链、为未注册实体补写元数据，支持整库盘点。
- **24h 自我迭代**：见第四节；Watchdog 执行 lingxi-self-iterate 脚本，读 MEMORY_JOURNAL 做诊断与改进提案。

---

## 九、文件数据结构（简要）

- **INDEX.md**：最小字段（Id, Kind, Title, When to load, Status, Strength, Scope, File 等），用于治理与定位。
- **记忆实体文件**（project/*.md, share/*.md）：Meta、When to load、One-liner、Context/Decision、Pointers 等；详见 workspace-bootstrap 与 memory-write 的模板与协议。

---

## 关联导航

- **上游**：`architecture.md`（记忆层与守护层）、`design-principles.md`（状态文件化、SSoT）
- **下游**：`ipc-protocols.md`（HOT_RAM 结构、后处理队列）、`engineering-practices.md`（心跳与完成路径）、`.cursor/skills/workspace-bootstrap/references/wal-schema.md`（WAL 契约）
- **同层**：`core-values.md`（心有灵犀）
