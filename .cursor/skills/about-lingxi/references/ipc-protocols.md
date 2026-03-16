# 灵犀 AgentOS IPC 协议 (IPC Protocols)

> **定位**：本文档定义灵犀进程间/组件间通信的**契约**：HOT_RAM 结构、Execution Summary、Megaprompt 组装标准，以及 WAL 与 wal-schema/wal-utils 的对应关系。满足「契约唯一」：同一类交互只在一处约定格式与解析，实现见各节所指权威位置。

---

## 0. 用户全局行为配置：`USER.md`

**物理路径**：`.lingxi/memory/USER.md`

**权威实现**：
- **初始化模板** → `skills/workspace-bootstrap/references/USER.default.md`
- **注入时机与规则** → `rules/agentos-kernel.md` Law 1（`[GLOBAL CONFIG] Initialization`）
- **写入逻辑（分流路由）** → `agents/lingxi-memory-write.md`（步骤 2 分流路由）
- **内容识别（行为偏好判定）** → `skills/taste-recognition/references/content-types.md`（偏好类型的 `destination` 路由规则）

### 说明

三层记忆架构中的 **User Config Layer**（用户配置层），存储用户对 Agent 行为的全局配置性偏好（程序记忆）：称呼、回答语言、输出风格等。与语义记忆库的核心区别：

- **无需检索**：每次会话初始化时由主 Agent 一次性注入 `HOT_RAM.md` 的 `[GLOBAL CONFIG]` 区块，后续轮次直接读取，零额外检索开销
- **对所有 Tier 生效**：包括 Tier-1 纯问答和 Tier-2 快速路径，而语义记忆库仅在 Tier-3 或项目特异性问题时才检索
- **文件可移植**：纯 Markdown 文件，可随项目 Git 管理，可备份和跨设备共享

**写入来源**：
- `/remember` 显式触发（`source: remember`）→ 直接写入，无门控
- `taste-recognition` 自动识别（`source: extract/heartbeat`）→ 需门控确认后写入

---

## 1. 核心状态控制台：`HOT_RAM.md`

**物理路径**：`.lingxi/os/sessions/[session_id]/HOT_RAM.md`

**权威实现**：
- **行为规则**（主 Agent 何时读写、状态转换逻辑、合法 State 值）→ `rules/agentos-kernel.md` Law 1
- **初始化模板**（Markdown 格式）→ `skills/workspace-bootstrap/references/HOT_RAM.default.md`

### 说明

单会话的"图灵纸带"与状态机寄存器。主 Agent 在响应任何用户输入前必须首步读取此文件。文件包含三个区块：

- **`[PRE-MEMORY]`**：`memory-retrieve` 预检索的项目规范与历史教训，主 Agent 将此内容按规范编译进 Megaprompt。
- **`[DYNAMIC TASK QUEUE]`**：当前轮次需 Subagent 执行的具体任务拆解。
- **`[POST-PROCESSING QUEUE]`**：强制后置处理的 Checkbox 清单，默认包含 `[POST_RETRIEVE]`、`[WAL_BUFFER_SYNC]`、`[USER_REPORT]` 三项。

---

## 2. Megaprompt 组装协议

**权威实现** → `rules/megaprompt-assembly.mdc`

### 说明

主 Agent 在 Tier-3 路径下向 `lingxi-subagent` 派发任务时，必须按四层结构组装 Megaprompt：

1. **执行者角色与任务边界**（Layer 1）
2. **任务描述**（Layer 2）
3. **工程约束注入**（Layer 3，靠近末尾，最高权重）
4. **返回契约提示**（Layer 4，置于末尾）

---

## 3. 隔离执行返回契约：`<Execution_Summary>`

**权威实现** → `agents/lingxi-subagent.md`（§3 强制输出契约）

### 说明

Subagent 执行完毕后，必须在返回给主 Agent 的文本最前方严格输出此 XML 结构，包含：`Status`、`Task_Summary`、`Touched_Assets`、`Key_Traps`、`Decisions_Made`，以及可选的机器可读结构化载荷 `Payload` (JSON)。

主 Agent 以此作为状态扭转、后置检索和渲染 UI 的唯一数据源。

---

## 4. 会话时间轴流水账：`SESSION_TRACE.md`

**物理路径**：`.lingxi/os/sessions/[session_id]/SESSION_TRACE.md`

**权威实现**：
- **追加时机与内容要求** → `rules/agentos-kernel.md` Law 3（Step 1）
- **折叠规范**（语义压缩保留结构化摘要）→ Watchdog 守护进程约定（待实现）

### 说明

Append-only 追加日志，记录该会话下历次 Subagent 的执行摘要、状态转换及后处理结果。解决长周期任务的"上下文失忆"。

每条追加记录的建议结构：

```markdown
## [Turn ID: NNN] - YYYY-MM-DD HH:mm:ss
**User Intent**: "..."
**Subagent Return**:
<Execution_Summary>
  ...（完整保留）
</Execution_Summary>
**Post-Processing Result**: ...
---
```

---

## 5. 全局缓存：`WAL_BUFFER.md`

**物理路径**：`.lingxi/os/WAL_BUFFER.md`

**格式与解析契约**（契约唯一）：

- **行格式**：`- [ ] \`[TYPE]\`: <JSON>` / `- [x] \`[TYPE]\`: <JSON>`；TYPE 如 `SESSION_DISTILL`、`SELF_ITERATE`，与 `heartbeat-plugins/` 插件 `id` 一致。
- **权威定义**：`skills/workspace-bootstrap/references/wal-schema.md`（格式与 payload 结构）
- **权威实现**：`hooks/wal-utils.mjs`（`parseWalLine`、`getPendingTasks`、`appendWalTask`、`markWalLineChecked`）

**其他**：

- **初始化模板** → `skills/workspace-bootstrap/references/WAL_BUFFER.default.md`
- **消费规则** → `rules/agentos-kernel.md` Law 3（`[WAL_BUFFER_SYNC]` 队列项）；主 Agent 在后处理阶段消费未勾选的 `[SESSION_DISTILL]` 等，Watchdog 消费 `[SELF_ITERATE]`。详见 `architecture.md` 守护层。

---

## 关联导航

- **上游**：`architecture.md`（记忆层、守护层、执行层）、`design-principles.md`（契约唯一、后置闭环）
- **下游**：`memory-system.md`（HOT_RAM/WAL 在记忆中的角色）、`skills/megaprompt-assembly/SKILL.md`（Megaprompt 组装）、`skills/workspace-bootstrap/references/wal-schema.md`
- **同层**：`memory-system.md`（记忆与 WAL 提炼路径）
