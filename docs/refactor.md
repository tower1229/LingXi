这份重构方案的设计目标非常明确：保留灵犀“四层架构”的业务价值（主从隔离、前后置约束、持久化记忆），但将其底层的工程实现从“重度 Node.js 状态机”重构为“Agent Native 的工具链（Thin Kernel, Thick Skills）”。

以下是用于指导详细设计与实施的《灵犀 Agent OS 重构方案设计》。

───

灵犀 Agent OS 重构方案设计：走向 Agent Native

一、 核心架构思想：控制反转 (IoC)

将原本由“框架代码”维护的生命周期（路由、心跳、校验），全部反转交还给大模型的 Tool-use 循环。

• 框架只提供“物理法则”：Skill 内部的强校验和报错拦截。
• Agent 自行决定“业务流转”：通过 System Prompt (Rule) 告知标准 SOP，Agent 自主调用工具完成闭环；若违规，被物理法则弹回（Tool Error）并触发自我修正。

───

二、 架构模块演进对比

| 模块   | 当前实现 (重框架)                                                     | 重构后实现 (Agent Native)                                                                               | 收益                                               |
| ------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 调度层 | 框架拦截输入，代码树判断走 Fast-Path 还是 Strict OS，手动挂起主会话。 | 取消框架路由。 所有请求直达主 Agent。主 Agent 通过调用 spawn_subagent 工具主动派发隔离任务。            | 消除复杂的框架层分流代码，主 Agent 流程归一化。    |
| 执行层 | Subagent 作为独立系统组件，通过 Megaprompt 被框架拉起。               | Subagent 降级为标准 Skill。 框架提供运行沙箱，作为 Tool 供主 Agent 调用，结果以 Tool Result 返回。      | 隔离机制保留，但调度链路极度简化，不污染主上下文。 |
| 守护层 | Hook 拦截请求 -> 写入 WAL 队列 -> Watchdog 轮询 -> 触发记忆提炼。     | 彻底删除守护层与 WAL。 改为惰性触发 (Lazy Evaluation)。在调用任务收尾 Skill 时作为副作用同步/异步执行。 | 砍掉庞大的后台心跳逻辑、状态锁和队列协议。         |
| 记忆层 | 依赖前置拦截器和后置队列来读写 HOT_RAM 和 INDEX。                     | 保持 File-as-State 理念。通过前后置 Skill 显式读写，未调用则拒绝执行核心任务。                          | 核心资产沉淀不变，逻辑收敛至单一 Skill 内部。      |

───

三、 核心链路详细设计

1. 主从调度链路重构：Tool-Driven Subagent

废除代码层面的 if (isComplex) { routeToSubagent() }，改造为主 Agent 的自主决策。

• System Prompt (Rule) 约束：
• “你是一个决策枢纽。对于闲聊、文档查询、简单问答，请直接回复。”
• “对于任何涉及代码编写、系统修改、多步调试的复杂任务，绝对禁止直接执行，必须调用 spawn_subagent 工具派发任务。”
• 工具设计 spawn_subagent(task_description, constraints)：
• 输入：子任务描述、约束条件。
• 内部逻辑：Node.js 层拉起一个独立的 LLM 进程/线程，携带 Subagent 的 Megaprompt 进行沙箱执行。
• 输出：返回标准的 <Execution_Summary> 文本，作为 Tool Result 返回给主 Agent。

2. 前后置约束链路重构：基于 Tool Error 的状态机守卫

废除框架层的前置拦截器，改为带状态校验的 Skill。

• 状态标记：在 HOT_RAM.md 或内存中维护当前会话的状态（如 CONTEXT_SYNCED=false）。
• 前置工具 sync_context(query)：
• 主 Agent 调用此工具检索 INDEX.md 和历史记录。
• 执行成功后，设置 CONTEXT_SYNCED=true。
• 物理拦截：
• 当主 Agent 试图越权直接调用 spawn_subagent 或写文件工具时。
• Skill 内部首行代码校验：if (!CONTEXT_SYNCED) throw new Error(...)
• 重点：向主 Agent 抛出友好的 Tool Error："Action Denied: 违反操作纪律。在派发任务前，必须先调用 sync_context 获取上下文。"
• 主 Agent 收到 Error 后，原生能力会驱动它自我反思，转去调用 sync_context，从而实现无代码编排的强流水线。

3. 记忆提炼链路重构：惰性触发替代 Daemon

彻底废弃 heartbeat-trigger、heartbeat-check 和 WAL_BUFFER.md。

• 后置工具 commit_task(summary) 或 close_session()：
• 主 Agent 在完成所有任务后，被 Prompt 约束必须调用此工具收尾。
• 副作用触发 (Side-effect)：
• commit_task 工具内部逻辑：

1. 正常记录本次任务状态到 SESSION_TRACE.md。
2. 惰性检查：读取 SESSION_TRACE.md 的行数或计算距上次提炼的时间差。
3. 触发提炼：如果满足条件（如大于 30 分钟或累计 5 个 Task），就在当前 Node.js 进程中直接 await runSessionDistill()，提炼结果并更新到全局记忆库。
4. 返回 Tool Result 给主 Agent："任务已提交，记忆库已自动更新。"

───

四、 实施演进路线 (Roadmap)

为了保证平滑过渡，建议分三个阶段落地：

• Phase 1: 培育工具 (Add Tools & Update Rules)
• 实现 spawn_subagent 工具，将底层的隔离执行逻辑包裹进工具中。
• 实现 sync_context 和 commit_task 工具。
• 更新主 Agent 的 System Prompt，教导它使用这三个新工具。
• 此时，旧的框架路由和 Daemon 依然保留，与新工具并存。
• Phase 2: 拆除脚手架 (Remove Router & Daemon)
• 删除框架入口处识别 Strict OS / Fast-Path 的分流代码，所有流量无脑导向主 Agent。
• 删除 beforeSubmitPrompt 中的 Watchdog 触发器。
• 删除 WAL_BUFFER.md 的解析与入队逻辑。
• 将记忆提炼逻辑完整迁移至 commit_task 的判断分支中。
• Phase 3: 加固物理隔离 (Enforce State Guards)
• 在所有破坏性或核心 Skill 内部加上 CONTEXT_SYNCED 等状态检查。
• 测试大模型被 Tool Error 阻断后的重试和反思表现，微调 Error Message 确保模型能顺利纠正行为。

───

最终架构形态：一个极其轻量的 Kernel
仅负责接收消息并维持 Tool-use 循环；
一个丰富的 Skill 库负责提供隔离算力、读写状态和阻断违规操作；
系统的智能、记忆和边界，在这个循环中自然流转并达成统一。
