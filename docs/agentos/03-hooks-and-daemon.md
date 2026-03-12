# LingXi AgentOS Hooks 与守护进程 (Syscalls) 设计文档

## 一、 设计背景与定位

在前两步设计中，我们已经确立了：
- **IPC 文件** (`HOT_RAM.md`, `WAL_BUFFER.md`) 构成了系统的内存与通信总线。
- **内核纪律** (`AGENTS.md`) 构成了约束大模型的第一物理定律。

系统若要运转，必须有“**发动机**”去动态修改总线文件并执行底层的读写逻辑。在 Cursor 中，最合适的发动机就是 **Hooks 机制**。通过拦截 Agent 执行的生命周期，我们可以将 Node.js 脚本伪装成操作系统的底层中断请求（Interrupts）和系统守护进程（Daemons）。

---

## 二、 核心钩子 (Hooks) 映射设计

基于 Cursor 原生的 `hooks.json` 生命周期，我们需要重构 LingXi 的 Hook 绑定关系，使之适配 AgentOS 架构。

### 1. `beforeSubmitPrompt` (触发时机：用户按下回车，但 prompt 还未发送给 LLM 前)
**扮演角色**：**请求拦截器 (Request Interceptor) / 任务调度器 (Scheduler)**

* **核心痛点**：外部 Node 脚本无法低成本调用 LLM 或者执行类似于 `memory-retrieve` 技能中复杂的语义扩展与检索决策；多并发会话时全局 Context 会被串台。
* **执行任务**：
  1. 拦截获取当前活跃会话的 `session_id`。
  2. 脚本在专属沙盒目录 `.cursor/.lingxi/os/sessions/[session_id]/` 下准备当前轮次的 `HOT_RAM.md`，并将用户的请求意图记录，标记状态区为：`[SYS_FLAG]: PRE_MEMORY_RETRIEVE_REQUIRED`。
  3. 通过 Hook 修改传给 Agent 的 Prompt，或者依赖 `AGENTS.md` 中的定律，并**强制注入本会话的物理寻址指令**：“Your core state file for this task is at sessions/[session_id]/HOT_RAM.md”。
  4. 放行 Prompt。
* **架构意义**：脚本不代替 `memory-retrieve` 技能做累活，脚本只充当**强硬的调度器与内存分配器**。它为各个并发请求分配独立内存页 (Session File)，并逼迫 Agent 去指定地址读取状态。

*(放弃该 Hook 强制拦截)*：基于生产环境压测反馈，无需在此层做强制的工具使用隔离（防火墙）。若大模型理解能力足以遵循 `AGENTS.md` 法典，它会自然调用专属 Subagent；若理解能力不足，强行拦截反而可能导致无限重试死循环。因此，直接放任自流，依靠 Prompt 和状态流转引导即可。

### 3. `subagentStop` / `postToolUse` (触发时机：Subagent 执行完毕返回结果给 Orchestrator 的瞬间)
**扮演角色**：**状态推进器与后置处理发令枪 (State Advancer & Post-Processing Trigger)**

* **核心痛点**：要确保主 Agent 醒来看到结果后不急着下班，而是进入后置处理环节队列。
* **执行任务**：
  1. 钩子检测到这是一个 `subagent_stop` 或者结束了对 Subagent 调用的 `postToolUse`。
  2. 自动更新 `HOT_RAM.md` 任务区，将主线状态强行推至：`[!] POST_PROCESSING_REQUIRED`。
  3. *(可选补充)* 在 Tool Result 末尾附加系统中断词，确保主 Agent 被刚性唤醒并去读 HOT_RAM。
* **架构意义**：它在主 Agent 即将完成思考周期的缝隙里，用最强硬的状态机制逼迫主 Agent 在单轮会话中完成“需求分发-沙盒执行-后置处理”三位一体的流转。

---

## 三、 守护进程异常处理与日志管理机制 (Daemon Fallback & Log Management)

在真实的生产环境中，大模型的输出格式往往是不稳定的，且长对话会导致上下文爆炸。因此，守护脚本承担了两项核心的数据兜底清道夫工作：

### 1. 模糊降级解析 (Fuzzy Fallback Parsing)
* **核心痛点**：`subagentStop` 触发时，我们需要从 Subagent 的返回中精准提取 `<Execution_Summary>` 注入到会话日志中。但大模型可能忘记写 XML 闭合标签，或者把标签写在 markdown 代码块里。
* **执行任务**：守护脚本在解析时应采取多级降级策略：
  1. **精确模式**：正则精确提取 `<Execution_Summary>` 内部的内容。
  2. **标题模式**：若提取失败，退而去寻找 Markdown 的 `## Execution Summary` 标题下的文本段落。
  3. **兜底模式**：若完全未发现结构化标志，截取 Subagent 返回的末尾 500 个字符，包装为 `[WARN: UNSTRUCTURED RETURN]` 强行入库，确保状态机的刚性流转不被解析错误中断。

### 2. 日志窗口化折叠 (Trace Log Truncation / Rolling Window)
* **核心痛点**：随着会话的加深，`SESSION_TRACE.md` 会不可避免地膨胀，最终因为超过 Subagent 的上下文窗口上限导致崩溃。
* **执行任务**：守护脚本在每次 Append 记录前，检查历史 Turn 数量：
  * 当 Turn 数量达到危险水位（如 10 轮以上）时，启用“遗忘折叠”策略。
  * 仅保留最初的 `[Turn 1]`（原始意图），以及最新的两轮 `[Turn N-1, Turn N]`（当前上下文），并将中间的繁杂试错过程截断，替换为一句提示符，例如：`<... 8 Turns of iterative debugging omitted ...>`。

---

## 四、 系统的时序流转总结图 (The IPC Loop)

当用户说出：**"修一下这段代码报错。"**

1. `用户提交` -> 拦截入 `beforeSubmitPrompt` hook
2. `Hook 脚本` -> 获取当前 `session_id`，检索相关长期记忆: `[MEM-102] 修复此文件需用 try-catch` 
3. `Hook 脚本` -> 写入专属的 `sessions/[session_id]/HOT_RAM.md`，放行 prompt 并带上物理寻址参数。
4. `Kernel (主 Agent)` -> 读 `AGENTS.md` -> 被迫去读自己 Session 的 `HOT_RAM.md`。
5. `Kernel (主 Agent)` -> 明白自己是调度的 Orchestrator，调用专属的 `lingxi-subagent` 工具并传递需求与命中记忆。
6. `Subagent (执行体)` -> 在后台无声地看代码、写代码、排错、Lint、测试，最终生成一份包含 Task Summary 和 Key Traps 的 `<Execution_Summary>`，并通过强制打断语返回给主 Agent。
7. `Hook 脚本` -> 监听到 Subagent 归来，将属于该 Session 的 `HOT_RAM.md` 状态扭转为 `POST_PROCESSING_REQUIRED`，并在 `SESSION_TRACE.md` (会话日志) 里追加刚才的执行纪要。
8. `Kernel (主 Agent)` -> 被唤醒，看到返回的 `Execution_Summary` 与专属 `HOT_RAM.md` 中的 `POST-PROCESSING QUEUE`（后处理队列）。
9. `Kernel (主 Agent)` -> 开始执行队列任务：向用户展示 Task Summary，提取 Key Traps 写成记忆持久化至 `WAL_BUFFER.md`，完成流转。

至此，一个隔离代码乱修污染、保留连续工作记忆、并具有后置处理弹性的 OS 架构生命周期完美闭环！
