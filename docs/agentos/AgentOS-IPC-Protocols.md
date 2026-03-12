# LingXi AgentOS IPC Protocols (进程间通信协议)

> **定位**：本文档定义了 LingXi AgentOS 中主 Agent (Orchestrator)、子 Agent (Subagent) 以及系统环境之间进行状态同步与通信的**唯一合法文件格式契约**。
> 任何业务逻辑的改造与适配，必须严格遵循此处的 Schema 定义。

---

## 1. 核心状态控制台：`HOT_RAM.md`

**物理路径**：`.cursor/.lingxi/os/sessions/[session_id]/HOT_RAM.md`
**作用**：单会话的“图灵纸带”与状态机寄存器。主 Agent 在响应任何用户输入前必须首步读取此文件。

### 1.1 状态机生命周期 (State Machine Lifecycle)

主 Agent 必须严格按照以下状态流转，绝不可越权：

1. **`IDLE` (空闲/初始态)**：
   - **触发条件**：接收到用户的新指令。
   - **主 Agent 动作 (同步前置)**：主 Agent **亲自**调用 `taste-recognition` 和 `memory-retrieve`。将检索到的记忆写入 `[PRE-MEMORY]`；将提取的品味 payload 压入 `[POST-PROCESSING QUEUE]`；将拆解的业务任务写入 `[DYNAMIC TASK QUEUE]`。
   - **状态扭转**：切换至 `WAITING_SUBAGENT`，并唤起 Subagent。

2. **`WAITING_SUBAGENT` (等待沙盒执行)**：
   - **触发条件**：Subagent 正在沙盒中执行任务。
   - **主 Agent 动作**：挂起，禁止干预。直到 Subagent 返回 `<Execution_Summary>`。
   - **状态扭转**：收到 Summary 后，追加日志至 `SESSION_TRACE.md`，然后切换至 `POST_PROCESSING_REQUIRED`。

3. **`POST_PROCESSING_REQUIRED` (强制后置收敛)**：
   - **触发条件**：Subagent 执行完毕。
   - **主 Agent 动作**：严格按顺序消费 `[POST-PROCESSING QUEUE]` 中的 Checkbox 任务（如调用 `memory-write` 归档品味、触发后置检索等）。
   - **状态扭转**：队列全部打勾清空后，向用户汇报，切换回 `IDLE`。

4. **`HUMAN_INTERVENTION_REQUIRED` (熔断挂起)**：
   - **触发条件**：Subagent 返回 `FAILED` 且重试达到上限，或发生严重异常。
   - **主 Agent 动作**：停止一切自动派发，向用户暴露错误并请求人工决策。

### 1.2 格式规范 (Schema)

```markdown
# 🧠 OS HOT RAM - Session: [session_id]

> **[SYSTEM_WARNING]**: DO NOT EDIT THIS HEADER. 
> Current State MUST be one of: [IDLE | WAITING_SUBAGENT | POST_PROCESSING_REQUIRED | HUMAN_INTERVENTION_REQUIRED]

**Current State**: `IDLE`
**Last Updated**: `YYYY-MM-DD HH:mm:ss`

---

## 📥 [PRE-MEMORY] (前置上下文与约束)
> 存放由 `memory-retrieve` 预检索出的项目规范与历史教训。主 Agent 需将此区域内容编译进 Megaprompt。

- **Rule 1**: [来自 taste-recognition 的规则...]
- **Context A**: [来自 memory-retrieve 的上下文...]

---

## ⚙️ [DYNAMIC TASK QUEUE] (动态执行队列)
> 当前轮次需要 Subagent 执行的具体任务拆解。

- [ ] Task 1: ...
- [ ] Task 2: ...

---

## 📤 [POST-PROCESSING QUEUE] (后置处理队列)
> 存放等待主 Agent 消费的系统级义务。必须使用严格的 Markdown Checkbox。主 Agent 消费完毕后需打勾。
> **注意**：`[POST_RETRIEVE]`、`[WAL_BUFFER_SYNC]` 和 `[USER_REPORT]` 是每次状态机流转固有的默认任务，必须始终存在于队列中。

- [ ] `[POST_RETRIEVE]`: (默认必选项) 主 Agent 必须以 Subagent 返回的 `Touched Assets` 为 Query，调用 `memory-retrieve` (Post 模式) 检查是否触发滞后义务。若检索到新义务，必须将其作为新 Checkbox 追加到本队列下方。
- [ ] `[WAL_BUFFER_SYNC]`: (默认必选项) 主 Agent 必须读取 `.cursor/.lingxi/os/WAL_BUFFER.md`，如果发现有未处理的 `- [ ] \`[SESSION_DISTILL]\`` 任务，主 Agent 必须调用 `lingxi-session-distill` Subagent 去执行提炼，执行完毕后在 `WAL_BUFFER.md` 中将其打勾。
- [ ] `[MEMORY_WRITE]`: (动态追加) 由 taste-recognition 产生的 Payload 载荷 JSON 字符串。调用 `lingxi-memory-write` 消费。
- [ ] `[USER_REPORT]`: (默认必选项) 队列中所有其他任务消费完毕（打勾）后，向用户汇报最终执行结果。
```

---

## 2. 隔离执行返回契约：`<Execution_Summary>`

**作用**：Subagent 执行完毕后，必须在返回给主 Agent 的文本最前方严格输出此 XML 结构。它是主进程进行状态扭转和后置检索的唯一数据源。

### 2.1 格式规范 (Schema)

```xml
<Execution_Summary>
  <Status>SUCCESS</Status> <!-- 必须是 SUCCESS | PARTIAL_SUCCESS | FAILED -->
  
  <Task_Summary>
    <!-- 结构化陈述本轮次执行的分析诊断过程、关键修改节点及最终产出 -->
    Successfully implemented the login component. Fixed a type error in auth.ts.
  </Task_Summary>
  
  <Touched_Assets>
    <!-- 确切影响的代码资产、引用的 URL或操作的数据实体，用于 Post-Retrieve 的 Query -->
    - src/components/Login.tsx
    - src/utils/auth.ts
  </Touched_Assets>
  
  <Key_Traps>
    <!-- 意料外的架构/依赖限制、权限屏障及死胡同排错记录。无阻碍时填写 NONE -->
    Encountered a circular dependency when importing User context, resolved by moving types to a shared types.ts file.
  </Key_Traps>
  
  <Decisions_Made>
    <!-- 核心架构或方案的技术选型与拒绝项的推论 -->
    Chose to use JWT over session cookies due to existing backend architecture constraints.
  </Decisions_Made>
</Execution_Summary>

<!-- 强制打断语 -->
I have completed my execution. You MUST follow Law 3 to process the Execution_Summary and then strictly follow the Post-Processing Queue (后处理队列) defined in your Session's HOT_RAM.md before proceeding.
```

---

## 3. 会话时间轴流水账：`SESSION_TRACE.md`

**物理路径**：`.cursor/.lingxi/os/sessions/[session_id]/SESSION_TRACE.md`
**作用**：Append-only 追加日志。记录该会话下历次 Subagent 的试错轨迹，解决长周期任务的“上下文失忆”。

### 3.1 格式规范 (Schema)

```markdown
# 📜 Session Trace Log

> Append-only log of all Subagent executions and state transitions.

## [Turn ID: 001] - YYYY-MM-DD HH:mm:ss
**User Intent**: "帮我写一个登录页面"
**Megaprompt Dispatched**: 包含了 Pre-Memory 约束的登录页开发指令。

### Subagent Return:
<Execution_Summary>
  <Status>SUCCESS</Status>
  ... (完整保留 Subagent 返回的 Summary)
</Execution_Summary>

**Post-Processing Result**: 
- 提取了 1 条新记忆 (JWT 偏好)
- 完成用户汇报。

---

## [Turn ID: 002] - YYYY-MM-DD HH:mm:ss
...
```
