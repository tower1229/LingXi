# 灵犀生命周期与调度管道 (Lifecycle Flow)

本文档展开灵犀 AgentOS 的**四阶段统一管道**：Phase 0（脚本预处理）→ Phase 1（任务预处理）→ Phase 2（任务委派）→ Phase 3（后置处理）。与 `architecture.md` 调度层、`agentos-kernel.mdc` 规则一一对应。

---

## 总览：四阶段管道

```
用户提交消息
    │
    ▼
Phase 0  脚本预处理（beforeSubmitPrompt hook，Agent 启动前同步完成）
    │      session-init → heartbeat-check → user-config-inject
    │
    ▼
Phase 1  任务预处理（主 Agent，LLM 语义操作）
    │      读 HOT_RAM → memory-retrieve Pre → taste-recognition
    │
    ▼
Phase 2  任务委派（主 Agent）
    │      megaprompt-assembly → 派发 lingxi-subagent → 等待返回
    │
    ▼
Phase 3  后置处理（主 Agent，消费队列）
           POST_RETRIEVE → WAL_BUFFER_SYNC → MEMORY_WRITE → USER_REPORT
```

所有请求统一走此管道，无分支决策。

---

## Phase 0 — 脚本预处理

**执行者**：`hooks/heartbeat-trigger.mjs`（beforeSubmitPrompt hook，同步，Agent 启动前完成）

**职责**：承接所有确定性的纯文件操作，Agent 不再承担任何初始化或兜底工作。

| 步骤 | 说明 |
|------|------|
| `session-init` | 以 `conversation_id` 为会话 ID，幂等创建 `.lingxi/os/sessions/<id>/` 目录与 `HOT_RAM.md`（从模板复制，替换占位符）。若文件已存在则跳过。 |
| `heartbeat-check` | 调用 Watchdog：先入队（按注册表扫描 SESSION_DISTILL / SELF_ITERATE 插件的 `shouldEnqueue`），再消费（对 watchdog 类型任务 exec 执行，成功后勾选 WAL 行）。 |
| `user-config-inject` | 读取 `.lingxi/memory/USER.md`，检查 HOT_RAM `[GLOBAL CONFIG]` 区块是否为占位符；若为空则写入行为偏好内容，每会话只执行一次（幂等）。 |

Phase 0 执行完毕后，HOT_RAM 已完全就绪：文件存在、GLOBAL CONFIG 已注入、心跳任务已入队或消费。

---

## Phase 1 — 任务预处理

**执行者**：主 Agent

**前提**：HOT_RAM 由 Phase 0 完全准备好，Agent 直接读取，禁止自行创建文件或注入配置。

**职责**：完成所有需要 LLM 语义理解的"备料"工作，为 Phase 2 的 Megaprompt 组装准备完整材料。

**执行顺序**：

1. **读取 HOT_RAM**：获取 `Current State`、`[GLOBAL CONFIG]`、`[PRE-MEMORY]` 等所有区块内容。
2. **memory-retrieve（Pre 模式）**：以当前用户消息为 Query，双路径检索 `.lingxi/memory/project/` 与 `.lingxi/memory/share/`，命中内容格式化后写入 HOT_RAM `[PRE-MEMORY]` 区块。若无相关记忆则静默跳过。
3. **taste-recognition**：对当前用户消息识别可沉淀的品味 payload；非空时以 `- [ ] [MEMORY_WRITE]: <payload_json>` 格式压入 HOT_RAM `[POST-PROCESSING QUEUE]`；无可沉淀内容则静默。

> 若对任务理解置信度不足，在 Phase 1 结束前通过 `ask-questions` 向用户澄清，再进入 Phase 2。

---

## Phase 2 — 任务委派

**执行者**：主 Agent

**职责**：以 Phase 1 产出的材料组装 Megaprompt，派发 Subagent 执行任务。这是上下文工程的核心实现——前置记忆在此注入。

**执行顺序**：

1. **megaprompt-assembly**：按四步协议组装 Megaprompt：
   - Layer 1：执行者角色与任务边界
   - Layer 2：任务描述（用户意图、子任务列表、Target Scope）
   - Layer 3：工程约束注入（从 HOT_RAM `[PRE-MEMORY]` 读取，置于靠近末尾以提高权重）
   - Layer 4：返回格式提醒（`<Execution_Summary>` 契约）

2. **派发 lingxi-subagent**：携带 Megaprompt 调用子代理，同时将 HOT_RAM `Current State` 写为 `WAITING_SUBAGENT`。

3. **接收返回**：获取 `<Execution_Summary>`：
   - `SUCCESS` / `PARTIAL_SUCCESS`：进入 Phase 3
   - `FAILED`：将 `Current State` 写为 `HUMAN_INTERVENTION_REQUIRED`，停止执行，向用户请求下一步指示

---

## Phase 3 — 后置处理

**执行者**：主 Agent

**触发条件**：Subagent 返回状态为 `SUCCESS` 或 `PARTIAL_SUCCESS`。

**前置动作（按序）**：
1. 将 `<Execution_Summary>` 追加写入 `SESSION_TRACE.md`（append-only，文件已由 Phase 0 脚本创建）
2. 将 HOT_RAM `Current State` 写为 `POST_PROCESSING_REQUIRED`

**队列消费顺序**（严格按序，全部勾销后才可结束）：

| 队列项 | 执行内容 |
|--------|----------|
| `[POST_RETRIEVE]` | 以 Subagent 返回的 `Touched Assets` 为 Query，调用 `memory-retrieve`（Post 模式），将命中的滞后义务格式化为新 Checkbox 追加到队列末尾。 |
| `[WAL_BUFFER_SYNC]` | 读取 `WAL_BUFFER.md`，循环处理所有未勾选的 `[SESSION_DISTILL]` 任务：每条独立调用一次 `lingxi-session-distill` Subagent，完成后执行 `node hooks/heartbeat-distill-done.mjs` 更新 control 并勾选 WAL 行。 |
| `[MEMORY_WRITE]` | 消费 Phase 1 由 `taste-recognition` 压入的品味 payload（若有），调用 `lingxi-memory-write` 写入记忆库。 |
| `[USER_REPORT]` | 向用户呈现最终结果（含 Subagent 的 `next_steps_options`、`f_results` 等字段，原样呈现不改写）；所有队列项勾销后将 `Current State` 复位为 `IDLE`。 |

---

## 关联导航

- **上游**：`architecture.md`（调度层、四层架构）、`design-principles.md`（后置闭环、主从解耦）
- **下游**：`ipc-protocols.md`（HOT_RAM 结构、Megaprompt、Execution_Summary）、`memory-system.md`（后处理中的记忆与 WAL）、`rules/agentos-kernel.mdc`（权威规则）
- **同层**：`architecture.md`（工作流与四层关系）、`workflow-output-principles.md`（输出契约）
