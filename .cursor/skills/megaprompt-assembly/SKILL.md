---
name: megaprompt-assembly
description: 显式调用。在任务委派前，组装发送给 lingxi-subagent 的 Megaprompt。
---

# 组装 Megaprompt

Megaprompt 是你传递给 Subagent 的完整任务包。它的质量直接决定 Subagent 的执行稳定性——结构越清晰，Subagent 产出越可预测。

按以下四步顺序构建，**顺序不可颠倒**。这个顺序背后的逻辑是：模型对越靠后的内容权重越高，所以最高优先级的内容（工程约束）应该靠近末尾，而不是放在开头容易被后续内容覆盖。

---

## 第一步：设定执行者角色

根据任务性质，用一句话为 Subagent 设定一个专业角色。角色的意义在于让模型在面对模糊决策时有一个清晰的取舍视角，所以要选择真正贴近任务核心能力的身份。

以下是几个典型锚点，其他类型照此自行判断：

- 编码/调试/测试 → `You are acting as a senior software engineer. Prioritize correctness, maintainability, and strict adherence to project conventions.`
- 文档/研究/分析 → `You are acting as a precise technical writer. Prioritize accuracy, clarity, and completeness.`
- 工作流类任务（task / vet / plan / review 等需要拆解、评估与编排的任务） → `You are acting as a precise technical analyst. Prioritize clarity, completeness, and actionable output.`
- 其他任务（如数据库设计、安全审计、性能调优、API 设计等）→ 选择最贴近该任务核心专业能力的身份，自行构造一句话声明

**格式约束**：角色声明必须是一句话，使用 `You are acting as a [role].` 结构，附带一句核心优先级说明。不要添加背景故事或华丽修饰语。若任务类型混合或不明确，省略角色声明，Subagent 默认身份以 `lingxi-subagent.md` 为准。

然后说明任务边界：这是什么类型的任务，Subagent 被授权在哪个范围内操作。

## 第二步：描述任务

从 `HOT_RAM.md` 的 `[TASK-CONTEXT]` 取出任务内容，整理为面向执行者的清晰表述：

- **用户意图**：重新表述用户目标（不要原文照搬，要翻译成执行层能直接理解的目标句）
- **子任务列表**：有序的、可执行的步骤检查项
- **Target Scope**：精确的文件路径、模块名、URL 或数据实体

## 第三步：注入工程约束

从 `HOT_RAM.md` 的 `[PRE-MEMORY]` 注入约束。把这一层放在任务描述之后，是为了利用模型对靠后内容的天然关注度，让约束不被任务描述覆盖。

注入时遵循以下原则：

- **全局项目原则**（架构约束、安全规则、编码规范等）：**完整注入**，不论看起来是否与当前任务直接相关。Subagent 必须始终遵守，不得以"本任务不涉及"为由跳过。
- **历史教训与 Key_Traps**：只注入与当前 Target Scope 存在交集的条目，不要把整个记忆库都倾倒进去。
- **本次会话的品味约束**（若 `taste-recognition` 有产出）：追加在上述内容之后。

## 第四步：提醒返回格式（始终置于末尾）

在 Megaprompt 的最后追加以下提醒，确保 Subagent 知道必须返回 Execution_Summary：

> Upon completing your task, you MUST return the `<Execution_Summary>` XML block as defined in your agent instructions (`lingxi-subagent.md`), followed by the mandatory interruption phrase, before any other content.
