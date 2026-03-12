# LingXi AgentOS 架构蓝图 (Architecture Blueprint)

> **版本定位**：此文档为灵犀（LingXi）AgentOS 的唯一合法实现蓝图。所有早期的碎片化备忘录均已废弃，未来一切代码开发与测试验收，必须严格以本文档中的架构设定为最高准则。

---

## 🧭 一、 架构目标与理念

LingXi AgentOS 旨在将自然流散的 AI 聊天对话，升维改造为具备**确定性状态机**和**多线程并发安全**的后台批处理系统。
其工程核心理念如下：

1. **无锁隔离 (Session Isolation)**：所有状态和长下文都以用户的会话窗口 (`session_id`) 为边界隔离，绝无全局锁死与多开串台。
2. **读写分离与职责剥离 (Orchestrator-Worker)**：主 Agent 仅负责大盘调度与状态扭转，具体的代码实体操作、环境分析等高复杂性执行均下放给专用 Subagent 隔离执行。
3. **强制后置收敛 (Post-Processing Guarantee)**：大模型禁止以模糊推断直接结案响应，生命周期必须经过“意图解析 -> 沙盒执行 -> 文件状态同步 -> 经验提取与收尾”的完整刚性闭环。
4. **主进程主动引导 (Active Bootstrapping)**：放弃依赖外部 Hook 强行注入系统指令的不稳定做法，全面拥抱“主 Agent 被法典约束，在响应任何用户输入前必须首步主动读取环境状态文件”的硬核自洽解法。

---

## 🗂️ 二、 系统物理组成与空间规划

所有 AgentOS 的状态生命周期文件均放置在专用的沙盒目录：**`.cursor/.lingxi/os/`**。
在并发体系下，其数据层级分布如下：

| 文件物理路径                                | 定位与生命周期                                                                                                                                                      | 读写权限                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `os/sessions/[session_id]/HOT_RAM.md`       | **单会话核心状态控制台**。存储该会话当前轮次的命中记忆（Pre-Memory）和具有严格约束的**后处理队列 (Post-Processing Queue)**。                                        | **主Agent**：读 / 覆写状态<br>**Hook守护进程**：生成 / 初始化写入     |
| `os/sessions/[session_id]/SESSION_TRACE.md` | **单会话时间轴流水账 (WAL)**。Append-only 追加。记录了该会话下历次 Subagent 试错轨迹、排错断点及用户核心意图。用于解决主 Agent 长周期任务下发时的“上下文失忆”问题。 | **主Agent**：主动追加写入<br>**Hook守护进程**：监测膨胀并负责裁切折叠 |
| `os/WAL_BUFFER.md`                          | **全局系统级缓存**。所有跨会话共享的低频重量级操作（例如将特定会话内的排错经验提取固化为项目全局规范），均由主 Agent 写入此缓存，随后由进程异步归档入库。           | **主Agent**：写入结构化载荷<br>**Watch进程**：轮询消费清理            |

---

## ⚖️ 三、 核心法典映射定义

### A. 内核进程级法典 (`AGENTS.md`)

本文件是对整个 IDE 全局置顶（权重最高）的规则。它的作用是让大模型认清自己的 Orchestrator（主控调度器）身份。

```markdown
# ⚡️ LingXi AgentOS Kernel Directive

[SYSTEM_OVERRIDE]: You are no longer just a coding assistant. You are the Kernel process of the **LingXi AgentOS**. Your execution environment is strictly sandboxed by the following absolute laws. Do not bypass them under any circumstances.

## 📜 Law 1: The Bootstrapping Imperative (内核引导协议)

Your "memory" of the conversation history is considered volatile and unreliable.
[CRITICAL]: Upon receiving ANY message from the user, before you analyze the request or invoke any Subagents, your ABSOLUTE FIRST ACTION must be to invoke your file reading tools to read your System State (`.cursor/.lingxi/os/sessions/[your_session_id]/HOT_RAM.md`).
If the file does not exist, you must initialize it. You are FORBIDDEN from generating any subjective response until you have ingested the `HOT_RAM.md` file for this turn. This file contains your contextual memory and your dynamic Task Queue. You **must** obey `HOT_RAM.md` unconditionally.

## 📜 Law 2: Absolute Separation of Concerns (职能隔离)

You are the **Orchestrator**. You are strictly **FORBIDDEN** from directly performing business code modifications, running tests, or diagnosing minor syntax errors.
Under no circumstances should you directly use terminal tools or file-editing tools to fix bugs.
If code must be written, analyzed, or executed, you **MUST MUST MUST** delegate the execution to **Subagents** (either invoking predefined `lingxi-subagent` or dynamically instantiating task-specific subagents), passing down the relevant `HOT_RAM.md` constraints to them.

## 📜 Law 3: Mandatory Post-Processing Phase (强制后置处理环节)

When your subordinate **Subagent** finishes execution and returns the `<Execution_Summary>` back to you, you will wake up from the suspended state.
You are strictly forbidden from eagerly telling the user "Task is done" and terminating your thoughts.
Instead, you **MUST MUST MUST** immediately execute these State-Sync actions using your file editing tools:

1. Append the Subagent's `<Execution_Summary>` to your Session's `SESSION_TRACE.md`.
2. Modify your Session's `HOT_RAM.md`, changing its `Current State` to `POST_PROCESSING_REQUIRED`.
3. Read the `POST-PROCESSING QUEUE` declared in step 4 of `HOT_RAM.md`.
4. Execute ALL pending post-processing tasks sequentially (e.g., evaluating "Key Traps" for memory extraction using `/memory-write`, reporting the Task Summary to the user, tracking statuses, etc.).
   Only AFTER every post-processing task in the queue is complete, are you permitted to conclude your response to the user.

## 📜 Law 4: The Dissent Check (强制自省)

Never hallucinate a context. Since you do not write code directly, your orchestration commands must be perfect. If your confidence in orchestrating the Subagent is low, halt and demand clarification from the user.

---

**[ACKNOWLEDGE]:** If you have read this, begin your very first response in any new session with: _"LingXi OS Kernel Booted."_
```

### B. 执行底层契约 (`.cursor/agents/lingxi-subagent.md`)

专供底层 Subagent 使用的行为准则，它定义了沙盒子代理是如何与主 Agent 交付工作的：

```markdown
---
name: lingxi-subagent
description: 系统级的通用执行单元 (Universal Worker)。负责承接 Orchestrator 组装好的巨型指令，执行具体操作（代码开发、文档编写、资料检索、报错排查等）。
is_background: true
---

# 🤖 LingXi Subagent Execution Protocol

你是一个被 **LingXi OS Orchestrator (主进程)** 唤起的后台执行线程。你**唯一的目的**是根据传入的上下文和绝对指令，完成 Orchestrator 委派的一切通用型任务，并汇报结果。

## 📍 1. 输入参数 (Input Context)

Orchestrator 会通过 Prompt 向你传入：

1. **Delegated Task**: 详细的任务描述与巨型提示词（Megaprompt）。
2. **Target Scope**: 任务作用域（可能是特定文件、网址列表、或特定功能的范围）。
3. **OS Directives & Memory**: 绝对禁止触犯的项目原则与历史记忆教训（从本会话特定的 `HOT_RAM.md` 获取）。

## 📍 2. 工具使用权限 (Tool Authorization)

你被完全授权去使用解决该任务所需的一切可用工具（包括但不限于 `edit_file`, `terminal`, `browser`, `search` 等）。如果在执行过程中遇到困难、报错或死胡同，**请你自己思考并尝试不同的方案自我修复，不必向 Orchestrator 请示（除非你尝试了 3 遍依然彻底失败，此时方可放弃并汇报失败）。**

## 📍 3. 强制的输出契约 (Mandatory Return Contract)

当你完成任务（或决定放弃）返回结果给 Orchestrator 时，**必须且只能**在正文最前方严格输出以下结构：

<Execution_Summary>

- Status: [SUCCESS | PARTIAL_SUCCESS | FAILED]
- Task Summary (任务总结): [结构化陈述本轮次执行的分析诊断过程、关键修改节点及最终产出，供主 Agent 用于最终汇报内容]
- Touched Assets: [确切影响的代码资产、引用的 URL或操作的数据实体]
- Key Traps (技术阻碍与排错轨): [意料外的架构/依赖限制、权限屏障及死胡同排错记录。无阻碍时填写 NONE]
- Decisions Made (关键决策): [核心架构或方案的技术选型与拒绝项的推论]
  </Execution_Summary>

> [!IMPORTANT]
> **Subagent 强制打断语**
> 在你向主 Agent 返回结果的最后，**必须且只能包含这句话**来结束你的输出（以此强制主 Agent 重启系统级判定）：
> _"I have completed my execution. You MUST follow Law 3 to process the Execution_Summary and then strictly follow the Post-Processing Queue (后处理队列) defined in your Session's HOT_RAM.md before proceeding."_
```

---

## ⚙️ 四、 三段夹层式流转生命周期 (The Sandwich Execution Pipeline)

所有的繁文缛节，汇聚为这唯一无二的流转链条：

**【入口点】用户输入**：触发系统响应的自然语言指令。

1. **[主进程主动寻址与启动 (Bootstrapping)]**
   - 主 Agent 拦截用户层输入，严格受制于 Law 1，**禁止产生未经系统校验的即时推理响应**。
   - 第一步：立刻通过工具主动挂载执行状态环境 `.cursor/.lingxi/os/sessions/[session_id]/HOT_RAM.md`，确立当前会话的上下文基线。
   - _(注：基础设施层 Hook 脚本仅作为系统守护进程，用于后台静默执行诸如 `SESSION_TRACE.md` 的体积折叠裁切等纯 I/O 数据维护工作，不再越权干涉 Prompt。)_
2. **[前置预备约束期 (Pre-Phase)]**
   - **偏好抽取 (Taste-Recognition)**：若用户包含自由指令表达，主 Agent 必须在派发任何执行前，前置启动偏好提取引擎，精准抽取出具有工程沉淀价值的规则与原则。
   - **强制预检索 (Pre-Retrieve)**：以增强后的意图与特征提取为 Query，主动定向检索范围受限于 `pre` 或是 `both` 触发周期的已有项目记忆和代码规范。
   - 主 Agent 将原始意图、最新提取原则聚合所有召回的“高优约束条令”，编译为主控级指令树载荷 (Megaprompt)，等待委派。
3. **[隔离沙盒执行期 (Execution Phase)]**
   - 主 Agent 发起底层设备层面互操作调用，将组装好的 Megaprompt 委派给相应的 `lingxi-subagent` 工具执行。
   - Subagent 实例化于独立的沙盒执行环境中，自主开启终端、调度分析命令和执行代码层面的实际修改。整个复杂高耗时排错过程彻底剥离于主聊天进程视窗，确保主干对话层不被执行日志信息污染。
   - Subagent 运行结束，按契约标准向主进程返回含有**精准业务破坏半径、修改链路**的结构体 `<Execution_Summary>`，并附带用于重启状态循环跳跃点的硬件级打断命令词（Mandatory Contract）。
4. **[状态机收敛与同步 (State-Sync)]**
   - 主 Agent 解析到底层唤醒打断语后，放弃生成推测性回答，从而被动转入操作系统接管角色：
     - 利用文件编排级原子追加 (`Append`)，将 Summary 记录至 `SESSION_TRACE.md` 的末端以供审计回溯和长期决策推论。
     - 即时覆写单例环境指针 `HOT_RAM.md`，强制扭转状态寄存器切换至 `POST_PROCESSING_REQUIRED`。
5. **[系统后置校验与追溯执行 (Post-Phase)]**
   - **后置联动精密检索 (Post-Retrieve)**：系统级核心闭环！主 Agent 采用新鲜返回的 `<Execution_Summary>` 中精密暴露的工程连带影响面作为全新高权 Query，横向回查绑定在 `post` 或 `both` 关联触发机制的系统级义务约束（例如：若修改底层库版本即时触发测试环境重建）。
   - 一旦触发命中这类滞后的衍生物义务清单，将其压入 `HOT_RAM` 动态事件池中，由此**引发非用户侧干预条件下的第二周期 Subagent 并发委派**实现无缝自动化清理工作。
   - 唯有确保所有驻留在后发单向任务池上的堆叠任务已被依次成功析构和清理，主 Agent 才能最终释放锁进程状态执行谢幕交互：_"LingXi AgentOS 环境变更周期已完成收敛与稳态保存，就绪下限指令分发。"_

---

## 🎭 五、 动态任务编排与多态算力 (Dynamic Orchestration)

LingXi AgentOS 不在代码里硬编码僵化的 `预处理 -> 执行 -> 后处理` 流水线，而是彻底采用 **“Turing Tape （图灵纸带队列）+ 多态算力容器”** 的微内核架构：

1. **`HOT_RAM.md` 即动态编排队列**
   主 Agent 拥有基于执行情况**动态规划路径**的能力。如果在某一环发生了不可预知的架构阻碍，主 Agent 可以凭空在 `HOT_RAM.md` 的队列中插入全新的待办事项（如：`-[ ] 执行修复数据库迁移`），所有的步骤最终被平铺成一个单向的清单 (Checklist) 驱动引擎。

2. **`lingxi-subagent` 只是通用算力容器**
   `lingxi-subagent` 不是某类特定的写死角色的 Agent。在 `HOT_RAM.md` 队列的牵引下，它可以被主进程利用 Megaprompt 进行反复的“多态实例化”：
   - **前置复用**：扫描全局目录生成接口 JSON 描述档（预处理）。
   - **执行复用**：修改 `Login.tsx` 页面逻辑（干脏活）。
   - **后置决策复用**：根据执行后的代码破坏范围，独立推断并修改 `package.json` 的 SemVer 语义化版本号（二次委派）。

在这套读写分离、主从隔离的队列环之下，主进程永远保持了“高高在上的纯粹调度者”身份（规避了被巨量代码污染上下文和焦点漂移），将所有的逻辑脏活与边界推断，全部下放给了可随时抛弃和重用的 Subagent 算力集群。

---

## ⚠️ 六、 潜在设计盲区与系统风控漏洞 (Design Vulnerability & Defect Radar)

在此宏观蓝图确立后，结合 LLM 特性，有三个工程维度的逻辑真空区（漏洞）需要在代码实施层级或策略上予以特殊防范补漏：

1. **Subagent 委派重试引发的无限死循环 (The Retry Amplification Bug)**
   - **现象**：若 Subagent 在遇到权限不足或编译错误经历了 `3次` 沙盒内容错常试探后按契约标准抛回 `FAILED` 状态，主 Agent 基于被设定的尽职调度倾向，极易触发“原地继续修复”判决。直接基于同样错误的上下文重新包装任务回传 Subagent，诱发进程间死锁且耗光全局 Token 限额。
   - **修补应对**：强行规定当 `<Execution_Summary>` 的 Status 为 `FAILED` 时，主 Agent **必须**切换挂起状态至 `HUMAN_INTERVENTION_REQUIRED` 寻求人工决策（或提供选项策略分支），严禁在无外源输入发生参数变化的情境下盲目委派回重试池。

2. **状态机文件操作熔断引发的不可逆状态撕裂 (State-Sync Mismatch)**
   - **现象**：当流转至第 4 步（状态机自我拉平）时，若由于大量并发文件修改或 Cursor 编辑工具调用故障/响应超时导致执行中断。欠缺类似传统关系型数据库事务锁（ACID 原子性）保障，主 Agent 可能只成功写入 `SESSION_TRACE.md` 追加审计线索，却未更改单例配置指针 `HOT_RAM.md` 写入新状态。造成任务队列不匹配以及长期记忆断点问题。
   - **修补应对**：需要独立出独立系统的外围状态自检进程 (Watchdog)，针对 `SESSION_TRACE` 文件指纹变化与 `HOT_RAM` 状态不同步现象，在用户界面的状态感知或次轮触发前执行回流恢复协议。

3. **后置检索阶段的雪崩式递归衍生链 (Avalanche Obligation Recursive Chains)**
   - **现象**：业务极度延展时，若 `Post-Retrieve` 扫出了必须协同变更需求 `A` （修改核心依赖声明），当新代理修改结束后反馈回的二阶 `<Execution_Summary>` 基于判定将再度击中 `Post-Retrieve` （要求其重写编译手册 `B` ）。缺乏逃逸判断则极易造成 Agent 的子代深重嵌套与任务面恶性膨胀、失去控制端点。
   - **修补应对**：必须确立在 `HOT_RAM.md` 调控参数中预设严格判定：即所谓的单向执行限制原则。强制规定事件处理栈最大深度或**严禁后置校验后派生的产出对象被再次作为 query 送入全记忆库**，彻底切断长尾衍生连环调用可能。
