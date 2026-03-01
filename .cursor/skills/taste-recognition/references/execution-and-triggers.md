# 品味识别 — 触发点、执行步骤与下游关系

本文档为 taste-recognition 的触发点与输入约定、执行步骤、与环节品味嗅探的关系；SKILL.md 保留意图与 7 字段 payload 契约（含门控）。

## 触发点与输入

| 触发点 | 谁触发 | 本 Skill 的输入 | payload.source | confidence 约定 |
| --- | --- | --- | --- | --- |
| **1. Session 约定（每轮）** | 主 Agent 按 session 约定调用 | 本轮用户自由输入；仅当存在用户自由输入时才调用。需结合上文理解时须结合最近 1～2 轮对话。 | `auto` | 由证据强度判定 low/medium/high |
| **2. /remember** | 用户执行 /remember 后主 Agent 显式调用 | 当前轮用户输入或用户指定的「要记住的内容/对话范围」 | `remember` | 通常 medium 或 high |
| **3. /init 写入** | init 在用户确认写入时调用 | 用户确认后的草稿（类型化收集结果等）；可按「一条记忆一个 payload」拆成多条 | `init` | 建议 high |
| **4. 环节选择题** | 各环节嗅探规则命中时，经 ask-questions 收集用户选择后 | 用户对某条品味选择题的选项（按 option id 归一化）或自由补充理由 | `choice` | 用户明确选择通常 high |

无可沉淀时静默；有可沉淀时产出且仅产出 7 字段 payload，由主 Agent 用该 payload 调用 lingxi-memory。

## 本 Skill 的执行步骤

1. 确定触发场景（每轮 session / /remember / /init 写入 / 环节选择题）→ 确定输入范围与 source。
2. 上下文增强：当用户输入无法独立理解时，必须结合最近 1～2 轮对话理解用户认可、选择或拒绝的具体内容。
3. 判断是否可沉淀：仅依据用户自由输入/指定内容/确认草稿（含上下文推断出的实质）中的偏好、约束、取舍、决策或例外；不依据 command 模板、系统注入、工具输出。可沉淀情形包括任务完成或关键决策、需求固化、方案选择、用户拒绝或纠正、用户明确表示要记住、在若干原则间做出可命名的选择、用户对上一轮表示认可或延续（需从对话推断实质）等。
4. 若无可沉淀：静默返回，不产出 payload，不调用 lingxi-memory。
5. 若有可沉淀：从输入中抽取 scene、principles、choice 及可选的 evidence；填写 source、confidence（证据强度）、apply（可推断则填 personal/project/team，否则可省略由下游默认 project）。
6. 产出且仅产出一个符合 7 字段规范的 JSON；若同一轮有多条可沉淀可产出多个 payload，主 Agent 对每条分别调用 lingxi-memory。
7. 主 Agent 用产出的 payload 显式调用 lingxi-memory 子代理，并传入 conversation_id（及可选 generation_id）供审计。禁止将原始用户消息或对话片段作为 lingxi-memory 的输入。

## 与环节品味嗅探的关系

各环节（task/plan/build/review 等）在情境驱动时可能通过 ask-questions 向用户提问；该路径下先将返回的 option id 映射为原则与实际选择，再产出 payload（source=choice），仍由本 Skill 的 payload 规范统一，经主 Agent 交 lingxi-memory 写入。环节嗅探规则见各环节 references 中的品味嗅探规则文件。

## 引用与映射

Payload → note 的映射规则、门控细节：见 references/payload-to-note.md。下游契约：.cursor/agents/lingxi-memory.md（仅接受本 payload，不产候选）。
