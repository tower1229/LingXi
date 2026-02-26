---
name: taste-recognition
description: 从用户输入或行为中识别可沉淀的「品味」（场景下的原则与选择），产出结构化 payload。所有记忆写入必须先经本 Skill；仅当产出 payload 时由主 Agent 用该 payload 调用 lingxi-memory。
---

# 品味识别（Taste Recognition）

从**用户自由输入、/remember 指定内容、或 /init 确认草稿**中判断是否存在可沉淀的「品味」，若有则产出**唯一合法**的品味 payload；无可沉淀时静默。本 Skill **不**调用 lingxi-memory，不读写记忆库；主 Agent 在收到 payload 后**必须**用该 payload 显式调用 lingxi-memory，**禁止**用原始对话或草稿直接调 lingxi-memory。

## 品味的定义（可操作）

**品味**：在**给定场景**下，在一组**可能适用甚至冲突的原则**中，用户**实际采用的选择与权衡**（含显式理由或可从行为推断的理由）。

- **场景**：决策发生的上下文、阶段（如文档引用方式、命名风格、方案取舍）。
- **可选/冲突的原则**：该场景下可用的候选原则或策略（如 KISS vs 可扩展性、短引用 vs 完整路径）。
- **选择与权衡**：实际采纳的策略及（显式或隐式）理由。

识别目标：从输入中抽出「场景 + 原则候选 + 实际选择」，形成可写入记忆的结构化 payload。

## 触发点与输入（三种）

| 触发点 | 谁触发 | 本 Skill 的输入 | payload.source | confidence 约定 |
| --- | --- | --- | --- | --- |
| **1. Session 约定（每轮）** | 主 Agent 按 session 约定调用 | 本轮用户自由输入；**当用户输入无法独立理解、需结合上文理解**时（如指代、省略、延续性指令、纯确认等），**必须**结合最近 1～2 轮对话片段理解，否则无法推断用户认可或选择的具体内容。**仅当存在用户自由输入时**才调用。 | `auto` | 由证据强度判定 low/medium/high |
| **2. /remember** | 用户执行 /remember 后，主 Agent 显式调用 | 当前轮用户输入，或用户指定的「要记住的内容/对话范围」 | `remember` | 通常 medium 或 high；用户明确指定原文时可设 high |
| **3. /init 写入** | init command 在用户确认写入时调用 | /init 流程中用户确认后的草稿（类型化收集结果等）；可按「一条记忆一个 payload」拆成多条 | `init` | 用户已确认的草稿建议 high |
| **4. 环节选择题** | 各环节嗅探规则命中时，经 ask-questions 收集用户选择后 | 用户对某条品味选择题的选项（按 option id 归一化）或自由补充理由 | `choice` | 用户明确选择通常为 high；从理由推断可为 medium |

**约定**：无可沉淀时**静默**（不产出、不调用 lingxi-memory）。有可沉淀时产出**且仅产出**下述 7 字段 payload，由主 Agent 用该 payload 调用 lingxi-memory。

## 品味 Payload 规范（输出唯一形态）

下游 lingxi-memory **仅接受**此结构；不产候选，只做校验 → 映射 → 治理 → 门控 → 写入。

### 字段定义

| 字段 | 类型 | 必选 | 说明 |
| --- | --- | --- | --- |
| `scene` | string | 是 | 场景（何时/何类情境），可具体可抽象；下游据此生成 whenToLoad、L0/L1 的「场景」或「场景族」。 |
| `principles` | string[] | 是 | 原则或选项，通常 1～2 项；与 choice 共同表达「在哪些候选中做了选择」。 |
| `choice` | string | 是 | 实际选择，须与 principles 中某一项一致或等价表述。 |
| `evidence` | string | 否 | 一句用户原文或引用，用于可验证性及 L0 事实层；无则省略。 |
| `source` | enum | 是 | `auto` \| `remember` \| `choice` \| `init`，写入路径，供审计与分流。 |
| `confidence` | enum | 是 | `low` \| `medium` \| `high`；供门控：high 可静默 new，medium/low 须 questions。 |
| `apply` | enum | 否 | `personal` \| `project` \| `team`，适用范围；缺省时下游可推断或默认 project。team = 团队级、可跨项目共享。 |

### 示例

```json
{
  "scene": "文档中引用 Skill 时",
  "principles": ["短引用", "完整路径"],
  "choice": "短引用",
  "evidence": "不要写完整路径",
  "source": "auto",
  "confidence": "high",
  "apply": "team"
}
```

### 门控（下游 lingxi-memory 使用）

- merge/replace：一律 questions，与 confidence 无关。
- new：`confidence === "high"` 可静默写入；`medium` / `low` 必须 questions。

## 本 Skill 的执行步骤

1. **确定触发场景**：当前是「每轮 session 约定」「/remember」还是「/init 写入」；据此确定输入范围和 `source`。
2. **上下文增强（需结合上文理解时）**：本 Skill 与主 Agent 共享上下文窗口。当**用户输入无法独立理解、需结合上文理解**时，**必须**结合最近 1～2 轮对话（尤其是上一轮模型回复）理解：用户认可、选择或拒绝的具体内容。仅凭字面输入无法推断可沉淀内容时，需从对话中抽取实质。
3. **判断是否可沉淀**：仅依据**用户自由输入/指定内容/确认草稿**（含上下文推断出的实质）中的偏好、约束、取舍、决策或例外；不依据 command 模板、系统注入、工具输出。可沉淀情形包括但不限于：
   - 任务完成或关键决策出现；需求固化、范围调整、优先级变更；
   - 目标纠正、方案选择、约束添加；边界明确、验收调整、风险确认；
   - 用户拒绝、纠正、排除（如不要/别用/改成…）；
   - 用户明确表示需要记住、请记住、写入记忆；
   - 在若干原则或方案间做出可命名的选择（如「优先体验」「先简单实现」）；
   - **用户对上一轮方案/决策表示认可或延续**（输入需结合上文理解时，如「好的」「继续」「按你说的来」等，需从对话中推断认可或延续的具体内容）。
4. **若无可沉淀**：静默返回，不产出 payload，不调用 lingxi-memory。
5. **若有可沉淀**：从输入中抽取 **scene、principles、choice**，以及可选的 **evidence**；填写 **source**（由上一步触发场景定）、**confidence**（证据强度：用户原话一字不差且无歧义 → high；需轻度推断 → medium；多义或强推断 → low）、**apply**（能推断则填 personal/project/team，否则可省略由下游默认 project）。
6. **输出**：产出**且仅产出**一个符合上表规范的 JSON 对象（7 字段）；若同一轮有多条可沉淀，可产出多个 payload，由主 Agent 对每条分别调用 lingxi-memory。
7. **主 Agent 后续动作**：用产出的 payload 显式调用 lingxi-memory 子代理（如「使用 lingxi-memory 子代理将以下 payload 写入记忆库：<payload>」或等价方式），并传入 conversation_id（及可选 generation_id）供审计。**禁止**将原始用户消息或对话片段作为 lingxi-memory 的输入。

## 与环节品味嗅探的关系

各环节（req/plan/build/review 等）在**情境驱动**时可能通过 ask-questions 向用户提问并得到选择；该路径下先将返回的 option id 映射为原则与实际选择，再产出 payload（`source=choice`），仍由本 Skill 的 payload 规范统一，经主 Agent 交 lingxi-memory 写入。环节嗅探规则见各环节 references 中的品味嗅探规则文件；本 Skill 负责从「自由输入 / remember 内容 / init 草稿 / 选择题反馈」中**统一**产出 7 字段品味 payload（scene, principles, choice, evidence, source, confidence, apply）。

## 引用与映射

- Payload → note 的映射规则、门控细节：见本 Skill 的 references 目录下 `payload-to-note.md`。
- 下游契约：`.cursor/agents/lingxi-memory.md`（仅接受本 payload，不产候选）。
