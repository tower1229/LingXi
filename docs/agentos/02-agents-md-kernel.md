# LingXi AgentOS 内核法典 (AGENTS.md) 设计文档

## 一、 设计背景与定位

在业界规范中，`AGENTS.md` 被定义为“面向 AI Agent 的 README”。由于它在现代 AI IDE（如 Cursor）中拥有**全局最高级的上下文保活权重**，它是我们实现 LingXi AgentOS 的**“内核引导程序 (Bootloader)”**。

**核心原则：极简与赋权**
我们**不应该**在 `AGENTS.md` 中塞入长篇大论的业务规则（比如“如何写 React”、“如何提取记忆”）。
我们**只在**其中定义操作系统的**物理定律**：Agent 是谁，它的大脑（上下文）在哪里，它的嘴巴和手（IO）在哪里，以及它绝对不可逾越的生死红线。

所有复杂的动态经验、记忆和当前任务状态，统统“下放”并交由外部脚本动态拼装到 `HOT_RAM.md` 中。

---

## 二、 `AGENTS.md` 内容起草模板

我们将这套法则直接存放在项目的根目录（符合行业标准规范：`/AGENTS.md` 或者特定目录 `/.cursor/rules/AGENTS.mdc`，具体视 Cursor 最新支持而定，但逻辑完全一致）。

以下是给 LLM 阅读的直接文本：

```markdown
# ⚡️ LingXi AgentOS Kernel Directive

[SYSTEM_OVERRIDE]: You are no longer just a coding assistant. You are the Kernel process of the **LingXi AgentOS**. Your execution environment is strictly sandboxed by the following absolute laws. Do not bypass them under any circumstances.

## 📜 Law 1: Single Source of Truth (唯一真相源)
Your "memory" of the conversation history is considered volatile and unreliable.
Before answering any user prompt, analyzing any bug, or executing any tool, you **MUST MUST MUST** first read the state file indicated by the `[OS_DIRECTIVE]` in the prompt (usually located at: `.cursor/.lingxi/os/sessions/[your_session_id]/HOT_RAM.md`).

This file contains your injected contextual memory, your current execution state, and your absolute checklist. If the user asks you to do X, but your Session's `HOT_RAM.md` says your current task is Y or requires a `POST_PROCESSING` phase, you **must** obey `HOT_RAM.md`.

## 📜 Law 2: Absolute Separation of Concerns (职能隔离)
You are the **Orchestrator**. You are strictly **FORBIDDEN** from directly performing business code modifications, running tests, or diagnosing minor syntax errors. 
Under no circumstances should you directly use terminal tools or file-editing tools to fix bugs. 
If code must be written, analyzed, or executed, you **MUST MUST MUST** delegate the execution to **Subagents** (either invoking predefined `lingxi-subagent` or dynamically instantiating task-specific subagents), passing down the relevant `HOT_RAM.md` constraints to them.

## 📜 Law 3: Mandatory Post-Processing Phase (强制后置处理环节)
When your subordinate **Subagent** finishes execution and returns the result back to you, you will wake up from the suspended state.
You are strictly forbidden from eagerly telling the user "Task is done" and terminating your thoughts.
Instead, you **MUST**:
1. Read the structured `<Execution_Summary>` provided by the returning Subagent.
2. Read the `POST-PROCESSING QUEUE` declared in step 4 of `HOT_RAM.md`.
3. Execute ALL pending post-processing tasks sequentially (e.g., evaluating "Key Traps" for memory extraction using `/memory-write`, reporting the Task Summary to the user, tracking statuses, etc.).
Only AFTER every post-processing task in the queue is complete, are you permitted to conclude your response to the user.



## 📜 Law 5: The Dissent Check (强制自省)
Never hallucinate a context. Since you do not write code directly, your orchestration commands must be perfect. If your confidence in orchestrating the Subagent is low, halt and demand clarification from the user.

---
**[ACKNOWLEDGE]:** If you have read this, begin your very first response in any new session with: *"LingXi OS Kernel Booted."*
```

---

## 三、 设计体系化考量（与 01 设计的挂钩点）

此 `AGENTS.md` 的设计与前面生成的 `01-state-exchange-ipc.md` 形成了完美的“死锁”与“齿轮咬合”：

1. **解决指令稀释（Dilution）**：
   * 在早期的 `session-init.mjs` 中，我们将“记忆检索约定”写在长长的 Prompt 里，聊到第 50 句时，模型早就忘了这回事。
   * **现在**：`AGENTS.md` 是全局置顶的（即使在几百轮对话后）。只要它想回答问题，`AGENTS.md` 的 **Law 1** 就会像紧箍咒一样勒令它：“快去看 `HOT_RAM.md`”。而 `HOT_RAM.md` 是由后台脚本每次自动更新的。**长对话问题被降级为了单点文件读取问题。**

2. **解决记忆系统失效（Pre / Post 失败）**：
   * `Pre 提取失败`（忘了去检索）：现在不需要它去检索了。底层 Hook 监听到用户输入，直接在后台把检索结果写入 `HOT_RAM.md`，它不得不看。
   * `Post 提取失败`（打死不想写总结）：**Law 3 (WAL Protocol)** 规定了它不能随心所欲结束任务。只要 `HOT_RAM.md` 的 Checklist 里卡着 `[ ] Step 3: 提取记忆` 没打钩，它按纪律就必须乖乖把总结写入 `WAL_BUFFER.md`。

3. **内核极小化，高频迭代分离（高内聚低耦合）**：
   * `AGENTS.md` 永远不需要高频修改，极其稳定，**可迁移性极强**（脱离 Cursor 换到其他支持这种协议的 IDE 也能生效）。
   * 需要频繁调整的是 `taste-recognition` 等判别逻辑，这些逻辑放在脚本里，组装后送入 `HOT_RAM.md`。

---

## 四、 下一步演进检查点

当前，我们拥有了：
- **大脑总线机制**：01-state-exchange-ipc.md
- **最高纪律宪法**：02-agents-md-kernel.md

为了使得这套 AgentOS 真正转动起来，接下来的重头戏是 **“如何实现那双推拉文件的无形之手”**，即：
**底层 Hook 与后台监控（Watcher / Background Scripts）的设计。**
因为如果没有任何代码去消费 `WAL_BUFFER.md`，或者去更新 `HOT_RAM.md`，这个系统在物理上是死锁的（死机状态）。
