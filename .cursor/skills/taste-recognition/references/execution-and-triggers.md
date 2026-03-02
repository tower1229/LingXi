# 品味识别 — 触发点、执行步骤与下游关系

本文档描述 taste-recognition 的触发点、输入约定、**执行步骤**（与实现逻辑一致）及与环节品味嗅探的关系。SKILL.md 定义意图与扩展 payload 契约（含 layer、可选 l0OneLiner/l1OneLiner、patternHint；门控由下游 lingxi-memory 按 confidence 执行）。

## 实现逻辑概要

**顺序**：确定触发与输入 → 判断可沉淀 → 若可沉淀则「模式靠拢 → 四维升维判定」→ 不写则不产出该条；仅对判定为写的条目标注 layer 并产出扩展 payload → **仅当 payloads 非空时**主 Agent 调用 lingxi-memory（不传 skip，不写即不调用）。

## 触发点与输入

| 触发点 | 谁触发 | 本 Skill 的输入 | payload.source | confidence 约定 |
| --- | --- | --- | --- | --- |
| **1. /remember** | 用户执行 /remember 后主 Agent 显式调用 | 当前轮用户输入或用户指定的「要记住的内容/对话范围」 | `remember` | 通常 medium 或 high |
| **2. /extract** | 用户执行 /extract 后主 Agent 显式调用 | 当前会话或指定时间范围内的对话内容（汇总后的文本） | `extract` | 由证据强度判定 |
| **3. /init 写入** | init 在用户确认写入时调用 | 用户确认后的草稿（类型化收集结果等）；可按「一条记忆一个 payload」拆成多条 | `init` | 建议 high |
| **4. 环节选择题** | 各环节嗅探规则命中时，经 ask-questions 收集用户选择后 | 用户对某条品味选择题的选项（按 option id 归一化）或自由补充理由 | `choice` | 用户明确选择通常 high |

无可沉淀时静默；有可沉淀时经**模式靠拢 + 四维升维判定**后，仅对判定为写的条目标产扩展 payload。**判定不写**的条目不产出、不加入 payloads。主 Agent **仅当 payloads 非空时**将 payload（单条或多条）组成 **payloads 数组**传入 lingxi-memory；不写时不调用 lingxi-memory。

## 本 Skill 的执行步骤（与实现逻辑一致）

1. **确定触发与输入**：确定触发场景（/remember / /extract / /init 写入 / 环节选择题）→ 输入范围与 source。
2. **上下文增强**：当用户输入无法独立理解时，结合最近 1～2 轮对话理解用户认可、选择或拒绝的具体内容。
3. **判断是否可沉淀**：仅依据用户自由输入/指定内容/确认草稿（含上下文推断）中的偏好、约束、取舍、决策或例外；不依据 command 模板、系统注入、工具输出。可沉淀情形包括任务完成或关键决策、需求固化、方案选择、用户拒绝或纠正、用户明确表示要记住、在若干原则间做出可命名的选择、用户对上一轮表示认可或延续等。
4. **若无可沉淀**：静默返回，不产出 payload，不调用 lingxi-memory。
5. **若有可沉淀**：抽取 scene、principles、choice、evidence；**模式靠拢**（参考 references/pattern-catalog.md），若匹配则更新 principles/choice 或设置 patternHint、patternConfidence。
6. **升维判定**：按 references/elevation-rules.md 做四维评分，计算 T 与 D1–D4；若 T≤3 或触犯例外不写 → **不产出该条**，不加入 payloads。
7. **产出 payload**：对建议写入的条目标注 layer、可选 l0OneLiner/l1OneLiner；产出符合扩展 payload 规范的 JSON；同一轮多条组成 payloads 数组。
8. **主 Agent 行为**：**仅当 payloads 非空时**调用 lingxi-memory 并传入 payloads 数组；禁止将原始用户消息或对话片段作为 lingxi-memory 的输入。

## 与环节品味嗅探的关系

各环节（task/plan/build/review 等）在情境驱动时可能通过 ask-questions 向用户提问；该路径下先将返回的 option id 映射为原则与实际选择，再产出 payload（source=choice），仍由本 Skill 的 payload 规范统一，经主 Agent 交 lingxi-memory 写入。环节嗅探规则见各环节 references 中的品味嗅探规则文件。

## 引用与映射

Payload → note 的映射规则、门控细节：见 references/payload-to-note.md。下游契约：.cursor/agents/lingxi-memory.md（仅接受 **payloads 数组**，不产候选）。
