# LingXi AgentOS 状态交换文件 (IPC Files) 设计文档

## 一、 设计背景与目标

在 Cursor 环境中，由于缺乏底层守护进程的绝对控制权，我们无法直接向 LLM 动态截断和注入 Prompt。为了解决“指令稀释”和“记忆脱落”的问题，我们借鉴操作系统的 **IPC (Inter-Process Communication, 进程间通信)** 机制，将对话上下文的控制权从“长对话”转移到“本地状态文件”上。

**目标**：设计一组文件读写规范，使得：
1. **主 Agent (Kernel)** 只需遵守最核心的一条原则：行动前必读状态文件。
2. **外部脚本 (Syscalls)** 负责组装巨型提示词（经验、记忆、SOP指令）并写入状态文件。
3. **防止冲突**：设计明确的读写锁协议（WAL），防止 Agent 和 Script 发生脏读写。

---

## 二、 核心状态文件目录规划

所有 AgentOS 的状态文件统一存放在 **`.cursor/.lingxi/os/sessions/`** 目录下（按当前会话 ID `session_id` 隔离存储），以防止多窗口并发污染。

| 文件名 | 职责说明 | 读写权限 |
| --- | --- | --- |
| `[session_id]/HOT_RAM.md` | **核心热状态存储**（单会话作用域）。存储当前轮次的巨型提示词、命中记忆和强制 Checklist。主 Agent 每次响应前必须宣读/读取。 | **读**：主 Agent<br>**写**：外部脚本 |
| `WAL_BUFFER.md` | **全局预写日志缓冲区**。跨会话共享，LLM 在执行复杂修改或调用深层写入（如落盘长期记忆）前，将意图存入此处等待系统级消费。 | **读**：外部脚本<br>**写**：主 Agent |

---

## 三、 详细数据结构设计

### 1. `HOT_RAM.md` (总线与注入靶点)

此文件是**巨型提示词（Megaprompt）**的物理实化载体。它高度结构化，分为 4 个区：

```markdown
# 🧠 LingXi AgentOS - Hot RAM (当前运行态)

> [!WARNING]
> [SYS_DIRECTIVE]: 如果你是 Agent，你在执行任何操作前，**必须**严格遵循本文档的约束。

## 📍 1. 运行状态 (System Status)
- **Current State**: [IDLE | ASSEMBLING_CONTEXT | AWAITING_SUBAGENT_RESULT | POST_PROCESSING]
- **Active Task**: `tasks/001.task.xxx.md` (如果为空则当前无任务)
- **Interrupts**: `NONE` (如存在系统级中断，Agent 须立刻优先响应)

## 💉 2. 动态记忆注入 (Injected Pre-Memory)
*(由底层 Hook 钩子刚刚检索并拼装出的最新经验，Agent 必须强制服从)*
- **[MEM-102]**: 发现有类似需求修改时，必须采用 Zustand 进行状态管理，禁止使用 Context API。 (Strength: Enforced)
- **[MEM-304]**: ...

## 📋 3. 执行纪律与 Checklist (Execution SOP)
*(当前阶段的大脑流转路线，主 Agent 作为 Orchestrator 必须推进)*
- [x] Step 1: 读取用户意图与 注入记忆。
- [x] Step 2: 组装任务与边界约束，下发给 `Subagents`（可调用预置的 `lingxi-subagent` 或按需动态创建）。
- [x] Step 3: [挂起等待] 等待 Subagent 执行归来，并获取 `Execution_Summary`。
- [ ] Step 4: **[🔒 POST-PROCESSING QUEUE]** (后置处理队列。必须依次完成以下所有系统级任务，方可向用户宣称最终完成)
  - [ ] **Task A (Memory Extraction)**: 强制对 Subagent 汇报的“踩坑记录”和“决策点”进行评估。若值得记录，调用 `memory-write` 进行持久化。
  - [ ] **Task B (User Notification)**: 将 Task Summary 呈现给用户。
  - [ ] *(未来可扩展的其他后置调度任务...)*

## 🛡️ 4. Dissent Check (批判性结构判定)
*(组装给 Subagent 的指令是否明确？是否遗漏了注入记忆中的警戒线？)*
- 变动范围是否最小化？是否有未确认的依赖？

---

### 2. `WAL_BUFFER.md` (预写日志与请求流转)

基于主从架构，WAL 缓冲区不再是干预全盘的万灵药，而是 Orchestrator (主 Agent) 与系统通信、调用深层写入（如落盘记忆）时的暂存区。通过 Hook 消费该区，可以实现极度纯净的记忆入库流。

```markdown
# 📝 WAL Buffer (Write-Ahead Log)

> [!NOTE] 
> Agent：当你决定要执行下一步关键操作，或者请求外部脚本处理事务前，请将 JSON 或结构化指令写在此处。

## [PENDING_ACTION]
- **ActionType**: `POST_MEMORY_REQUEST`
- **Target**: `memory-write`
- **Payloads**: 
  ```json
  [
    {
      "scene": "修复 Navbar 闪烁问题",
      "principles": "useEffect 中禁止做带防抖的 state 频繁更新",
      "choice": "改用 useRef 缓存计算值",
      // ... 
    }
  ]
  ```

## [STATUS]
- [WAITING_FOR_SCRIPT_TO_CONSUME]
```

**设计精髓**：
主 Agent 如果要提取 Post 记忆，不需要直接在长对话里调用 `memory-write` skill。它只需把意图按格式填入 `WAL_BUFFER.md`，然后状态机自然过渡。外部 Watcher 脚本或者心跳钩子一旦发现此文件被标记为 `WAITING`，后台进程立刻接管，并处理落盘，最终把状态写回 `HOT_RAM.md` 为 `IDLE`。

---

---

## 四、 废弃并发锁 (Lock-Free Context)

**设计转变**：
在最早的架构中，系统通过一个全局的 `os-lock.json` 和 TTL 过期机制来防止多读写竞争。但在多聊天窗口（Multi-Tab）并发工作时，抢占式的全局文件依然会造成灾难级的竞态死锁。

**最终方案 (Session Isolation)**：
现在的 AgentOS 完全基于**无锁多路复用**。
因为每一个聊天窗口的 Hook 脚本只去读写自己专属目录下的 `.cursor/.lingxi/os/sessions/[session_id]/HOT_RAM.md`。主 Agent (LLM) 在被 Hook 截获 prompt 时，也会被明确告知要前往自己的属地进行状态读取。
这在物理磁盘层面上彻底切断了多个对话上下文交织和抢锁的可能性，天然实现了操作系统的无锁并发安全性。
