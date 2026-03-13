# LingXi OS 记忆系统机制 (Memory System)

## 概述

记忆系统是 LingXi OS 实现“心有灵犀”的核心能力。它以 **更好的检索与注入** 为最终目的：把对话中的判断与取舍沉淀为可检索资产，并在每一轮对话前做最小注入，提升一致性与长期复用能力。

在 AgentOS 架构下，记忆系统的写入、检索与治理均被重构为符合“状态机流转”与“后置收敛”的严格闭环。

本版本采用 **扁平化记忆库**：
- `memory/INDEX.md`：统一索引（SSoT，最小元数据）
- `memory/project/`：项目级记忆文件（语义 + 关键词混合检索的主搜索面）
- `memory/share/`：跨项目共享记忆（推荐 git submodule）

记忆系统在整体上分为 **三层**，对应不同的访问模式：

| 层 | 文件 | 内容类型 | 访问方式 | 对哪些 Tier 生效 |
|---|---|---|---|---|
| **User Config Layer** | `.cursor/.lingxi/os/USER.md` | 行为偏好（称呼、语言、输出风格） | 会话初始化时全量注入 HOT_RAM，零检索 | 所有 Tier（1/2/3）|
| **Memory Layer（语义记忆库）** | `memory/project/` + `memory/share/` | 项目规范、技术决策、历史教训 | 按任务相关性语义检索（Pre/Post） | Tier-3 + 项目特异性 Tier-1 |
| **Session Episodic（情节缓存）** | `sessions/[id]/SESSION_TRACE.md` | 本会话执行历史 | 主 Agent 主动读取 | 按需，跨轮上下文连续性 |

---

## 📥 一、 记忆提取与摄入 (Ingestion)

记忆的来源分为主动触发与被动蒸馏：

1. **前置品味识别 (Taste-Recognition)**：在响应包含自由描述的用户输入时，主 Agent 在 `IDLE` 状态下，必须在执行核心任务之前，先调用 `taste-recognition` 自动嗅探并提取具有长期记忆价值的内容（如偏好、约束、局部决策），产出 Payload 压入 `HOT_RAM.md` 后处理队列。
2. **主动记忆录入 (`/remember`)**：用户主动发起，经 `taste-recognition` 识别后转为 Payload 压入 `HOT_RAM.md` 队列。
3. **高频心跳蒸馏 (30min Session Distill)**：由 `post-command` 触发 Watchdog 检查。若距上次提炼超过 30 分钟，Watchdog 将提炼任务写入 `WAL_BUFFER.md`。主 Agent 在后处理阶段消费 `WAL_BUFFER.md` 时，唤起 `lingxi-session-distill` 子代理，拉取近期对话流水静默提炼经验。

---

## 🧠 二、 记忆检索与应用 (Retrieval & Injection)

记忆的提取由 `memory-retrieve` Skill 承担，采用**双路并发搜索机制**（大模型语义相似度搜索 + 标题/正文关键词硬匹配并集加权合并）。

记忆在 AgentOS 的生命周期中分两次介入：

1. **前置约束检索 (Pre-Retrieve)**：
   - **时机**：主 Agent 处于 `IDLE` 状态收到新指令时。
   - **行为**：根据用户初始意图，仅检索带有“事前生效”标签的记忆（如代码规范、防坑指南）。
   - **结果**：写入 `HOT_RAM.md` 的 `[PRE-MEMORY]` 区块，并以此约束接下来的 Subagent 执行行为（编译进 Megaprompt）。

2. **后置义务检索 (Post-Retrieve)**：
   - **时机**：主 Agent 处于 `POST_PROCESSING_REQUIRED` 状态，消费 `HOT_RAM.md` 队列时。
   - **行为**：以 Subagent 返回的 `<Execution_Summary>` 中的 `Touched Assets` 为搜寻线索，仅检索带有“事后生效”标签的滞后规定（如“改了库文件必须同步改 README”、“更新版本号”）。
   - **结果**：扫出后作为新的 Checkbox 任务，动态追加到 `HOT_RAM.md` 的 `[POST-PROCESSING QUEUE]` 中继续处理。

---

## 💾 三、 记忆写入与存储 (Storage)

所有的记忆写入操作，必须由特权子代理 **`lingxi-memory-write`** 在独立沙盒中执行，严禁主 Agent 直接写文件。

1. **独立沙盒写入通道**：主 Agent 在后置收敛阶段，将累积的 Payload 数组交给 `lingxi-memory-write`。
2. **写入前查重与防突变门控**：向库内写记忆前，强制执行 TopK 相似度检索。完全相同的静默去重；细节互补的执行合并；遇到颠覆已有定义的低置信度新规，必须拦截并向用户询问确认。
3. **跨层级实体存储**：支持将记忆明确保存到“当前项目专属目录” (`memory/project/`) 或“团队跨项目共享目录” (`memory/share/`)。
4. **遥测日志记录**：写入完成后，子代理会将核心事件（如 `memory_note_created`, `memory.merge.diagnosed`）追加至 `MEMORY_JOURNAL.jsonl` 供后续审计。

---

## 🛠️ 四、 大盘治理与维护 (Governance & Iteration)

1. **统一注册表维护**：任何记忆增删改，都必须同步反映到 `INDEX.md` 中。
2. **全局碎片排查与自愈 (`/memory-govern`)**：提供显式调用的 Skill，清理注册表中实际已丢失文件的“死链”，并自动为未注册的实体文件补写标题和生效触发条件。支持主动盘点整库状态。
3. **低频心跳诊断 (24h Self-Iterate)**：复用 Watchdog 体系，每 24 小时触发一次 `lingxi-self-iterate` 任务。Watchdog 会直接在后台执行 Node.js 脚本，读取 `MEMORY_JOURNAL.jsonl` 评估大盘记忆的熵增情况与沉淀质量，给出深度的重构、合并或系统迭代提案，并将结果写回日志。

---

## 📁 五、 记忆文件数据结构

### 5.1 统一索引 (`INDEX.md`)
索引只存最小字段，用于治理与定位；真实语义检索以实体文件为准。
字段包含：`Id`, `Kind`, `Title`, `When to load`, `Status`, `Strength`, `Scope`, `Supersedes`, `CreatedAt`, `UpdatedAt`, `Source`, `Session`, `File`。

### 5.2 记忆文件 (`project/*.md`, `share/*.md`)
每条记忆一个文件，小而清晰，建议结构：
- **Meta**: (Id/Title/Kind/Status/Strength/Scope/Audience/Portability/Source/Tags/Supersedes/CreatedAt/UpdatedAt/Session)
- **When to load**: (1-3 条触发条件)
- **One-liner**: (用于注入的极简总结)
- **Context / Decision**: (decision + signals + alternatives + counter-signals)
- **Pointers**: (代码/文档指针)

### 5.3 跨项目复用优先级
当出现同一 `Id` 同时存在于项目与 share 时，默认 **project 覆盖 share**（避免团队库更新导致项目行为不可控）。运行 `memory-govern` 时可看到重复 Id 提示，便于人工治理与收敛。