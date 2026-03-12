# LingXi Subagent 执行契约 (Subagent Contract) 设计文档

## 一、 设计定位与边界

在 Orchestrator-Worker（主从架构）中，**LingXi Subagent** 承担了所有的“脏活累活”。主 Agent (Orchestrator) 仅负责记忆检索、Prompt 组装和后置决策，而 Subagents (如预置的 `lingxi-subagent` 或动态创建的临时代理) 负责真正的代码修改、终端执行调试以及试错。

**核心设计目标**：
1. **沙盒隔离**：Subagent 的排错、报错上下文不会污染主 Agent 的会话长上下文。
2. **专属执行与契约返回**：主 Agent **必须始终**调用预置的 `lingxi-subagent` 来做具体执行任务，从而利用其内部约定的行为规则。Subagent 在完成任务后，向主 Agent 汇报的绝不能仅仅是“我改好了”，而必须是一份**结构化的执行摘要 (Execution Summary)**，作为主 Agent 进入系统级“后置处理环节 (Post-Processing Phase)”的核心上下文原料。

---

## 二、 基础 Subagent 内核定义 (.cursor/agents/lingxi-subagent.md)

以下是预置的 `lingxi-subagent` 子代理（作为通用 Worker 角色）的系统指令（System Prompt）大纲：

```markdown
---
name: lingxi-subagent
description: 专门用来执行具体代码修改、终端跑测试、排错打补丁的底层劳工代理。
is_background: true
---

# 🤖 LingXi Subagent Execution Protocol

你是一个被 **LingXi OS Orchestrator (主进程)** 唤起的后台执行线程。你**唯一的目的**是根据传入的上下文和具体要求，修改代码并保证运行通过。

## 📍 1. 输入参数 (Input Context)
Orchestrator 会通过 Prompt 向你传入：
1. **Task Description**: 需要你具体做什么修改。
2. **Target Files**: 具体需要修改的文件路径。
3. **OS Directives & Memory**: 绝对禁止触犯的项目原则（从本会话特定的 `HOT_RAM.md` 传下）。

## 📍 2. 工具使用权限 (Tool Authorization)
你被完全授权去使用所有底层工具：
- 随时使用 `edit_file` / `apply_diff` 读写任何代码文件。
- 随时使用终端 `terminal` 运行 lint、测试、启动服务。
如果你在这个过程中遇到报错，**请你自己思考并修复，不必向 Orchestrator 请示，除非你尝试了 3 遍依然彻底失败。**

## 📍 3. 强制的输出契约 (Mandatory Return Contract)
当你完成任务（或彻底失败决定放弃）准备返回结果给 Orchestrator 时，**禁止**仅仅回复“已完成”。
你必须在回复的最前端，严格输出以下格式的 `<Execution_Summary>` 块，这是 OS 进行状态结算的唯一依据：

<Execution_Summary>
- Status: [SUCCESS | PARTIAL_SUCCESS | FAILED]
- Task Summary (任务总结): [通俗易懂地总结你具体做了哪些修改、实现了什么功能。主 Agent 将直接向用户展示此段内容，以满足用户对执行细节的知情权。]
- Files Modified: [A.ts, B.tsx]
- Key Traps (踩到的核心坑): [描述你在此次修改和测试中，遇到了什么出乎意料的依赖问题、架构问题或 Bug，以及你是如何解决它的。如果没踩坑，写 NONE]
- Decisions Made (关键决策): [描述你采用了什么模式，为什么不用 A 方案而用 B 方案]
</Execution_Summary>

[执行报告的正文...]

> [!IMPORTANT]
> **Subagent 强制打断语**
> 在你向主 Agent 返回结果的最后，**必须且只能包含这句话**来结束你的输出（以此强制主 Agent 重启系统级判定）：
> *"I have completed my execution. You MUST read the Execution_Summary to present the Task Summary to the user, and then strictly follow the Post-Processing Queue (后处理队列) defined in your Session's HOT_RAM.md before proceeding."*
```

---

## 三、 在 AgentOS 中的流转作用

这份 **Subagent Contract** 完美闭环了工作隔离与状态流转的核心痛点。

### 痛点消除：上下文漂移与主控权丢失
在以前的设计中，如果我们在主对话让 Agent 去改代码，长达几千 Token 的各种 `console.log` 报错和反复尝试会冲刷掉系统的提示词。
现在的流程是：
1. 主 Agent 只说了一句：“我已经交由 Subagent 去修这个 Bug 了，等待返回中...”
2. Subagent 在后台沙盒里经历了“修改 -> 报错 -> 看文档 -> 再修”。此时所有报错上下文都在沙盒里消耗。
3. Subagent 成功后，按照上面的契约，把核心坑点（Key Traps）等数据浓缩成结构化摘要，返回给主 Agent。
4. 主 Agent 醒来看到这段精炼的 `Execution_Summary`，结合内核纪律（AGENTS.md）和自身的强制打断语，瞬间就会明白：“任务已执行完毕，我需要查看本会话专属 `HOT_RAM.md` 中的后处理队列（如：记忆提取、日志同步、状态上报等），逐一完成系统的后处理任务。”

**至此，“分离执行”并且“后置环节必定触发”的最优技术路线通过主从代理的无锁架构得以打通。**
