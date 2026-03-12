# 记忆系统机制（Memory-first）

## 概述

记忆系统是 LingXi OS 实现“心有灵犀”的核心能力。它以 **更好的检索与注入** 为最终目的：把对话中的判断与取舍沉淀为可检索资产，并在每一轮对话前做最小注入，提升一致性与长期复用能力。

**记忆系统分为三部分**：**记忆沉淀**（用户通过 /remember 触发 + 心跳自动会话提炼）、**记忆写入**（由 lingxi-memory-write 子代理执行）、**记忆提取**（由 memory-retrieve 按 pre/post 双时机执行）。

本版本采用 **扁平化记忆库**：

- `memory/INDEX.md`：统一索引（SSoT，最小元数据）
- `memory/project/`：项目级记忆文件（语义 + 关键词混合检索的主搜索面）
- `memory/share/`：跨项目共享记忆（推荐 git submodule）

## 每轮参与

检索与注入在**每次用户输入**时由主 Agent 的 `IDLE` 状态同步前置动作触发，并写入 `HOT_RAM.md` 的 `[PRE-MEMORY]` 区块。
写入则通过用户触发的 /remember 或**心跳自动会话提炼**产生 Payload，压入 `HOT_RAM.md` 的 `[POST-PROCESSING QUEUE]` 中，在后置收敛阶段执行。

## 记忆沉淀（用户触发 + 记忆写入）

### 1) 触发方式

由用户通过 **/remember** 主动触发记忆捕获；**会话提炼**由**心跳**自动触发（新会话时若距上次提炼超过 30 分钟，按 transcript 增量入队最多 3 个候选会话，由 lingxi-session-distill 后台子代理提炼）；**工作流内置品味嗅探**（task/plan/build/review 等 **skill** 环节在情境驱动时经 ask-questions 收集用户选择，经 taste-recognition 产出 payload、source=choice）也会产生沉淀并写入。主 Agent 在用户执行 /remember 或环节选择题反馈时，先经 taste-recognition 产出 payload，再压入队列。

### 2) 记忆写入（Subagent lingxi-memory-write）

**数据流（实现逻辑）**：taste-recognition 产出扩展品味 payload（已含升维结果：layer、可选 l0OneLiner/l1OneLiner、patternHint）；仅「判定为写」的条目进入 payloads 数组。主 Agent 将其压入 `HOT_RAM.md` 队列。在 `POST_PROCESSING_REQUIRED` 阶段，唤起 lingxi-memory-write 消费队列；lingxi-memory-write 校验 payloads 后调用 **memory-write** skill 执行：按 payload 映射生成 note → 治理（TopK）→ 门控 → 写 note 与 INDEX，并返回 `<Execution_Summary>`。

## 记忆提取（Retrieve + Inject）

**触发方式**：
- **Pre-Phase**：主 Agent 处于 `IDLE` 状态收到新指令时，以用户输入为 Query 调用，结果写入 `HOT_RAM.md` 的 `[PRE-MEMORY]` 区块。
- **Post-Phase**：主 Agent 处于 `POST_PROCESSING_REQUIRED` 状态消费队列时，以 Subagent 返回的 `<Execution_Summary>` 中的 `Touched Assets` 为 Query 调用，命中滞后义务则压入队列。

**检索机制**：memory-retrieve 执行流程为**理解判断 → 提炼（语义摘要 + 关键词）→ 检索必要性判断 → 双路径检索**。双路径检索采用**语义 + 关键词**混合，**并集加权合并**（0.7×语义 + 0.3×关键词）、**召回优先**。

## 统一索引（INDEX.md）

索引只存最小字段，用于治理与定位；真实语义检索以 `memory/project/*.md`、`memory/share/*.md` 为准。

建议字段：

| Id | Kind | Title | When to load | Status | Strength | Scope | Supersedes | CreatedAt | UpdatedAt | Source | Session | File |

## 记忆文件（project/*.md、share/*.md）

每条记忆一个文件，小而清晰，建议结构：

- Meta（Id/Title/Kind/Status/Strength/Scope/Audience/Portability/Source/Tags/Supersedes/CreatedAt/UpdatedAt/Session）
- When to load（1-3 条）
- One-liner（用于注入）
- Context / Decision（decision + signals + alternatives + counter-signals）
- Pointers（代码/文档指针）

## 跨项目复用（Share 目录：git submodule）

灵犀提供一个硬性约定的共享目录，用于承载“可跨项目复用”的团队经验：

- 共享目录：`.cursor/.lingxi/memory/share/`
- 推荐形态：**git submodule**（团队仓库，版本锁定、同步明确）
- 生效方式：share 目录下的记忆与项目记忆一起参与检索。添加或更新 share 后运行 **memory-govern** Skill（在 Cursor 中输入 `/memory-govern`）同步索引并可选治理。

### 冲突优先级（稳定规则）

当出现同一 `Id` 同时存在于项目与 share 时，默认 **project 覆盖 share**（避免团队库更新导致项目行为不可控）。运行 **memory-govern** Skill（如 `/memory-govern`）时可看到重复 Id 提示，便于人工治理与收敛。
