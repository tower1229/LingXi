---
name: taste-recognition
description: 从用户输入或行为中识别可沉淀的「品味」（场景下的原则与选择），产出结构化 payload。所有记忆写入必须先经本 Skill；仅当产出 payload 时由主 Agent 将 payload（单条或多条）组成 payloads 数组调用 lingxi-memory。
---

# 品味识别（Taste Recognition）

## 意图

从用户自由输入、/remember 指定内容、/extract 会话范围、/init 确认草稿或环节选择题反馈中判断是否存在可沉淀的「品味」；若有则产出**唯一合法**的 7 字段 payload，主 Agent 必须将 payload（单条或多条）组成 **payloads 数组**显式调用 lingxi-memory；无可沉淀时静默。本 Skill 不调用 lingxi-memory，不读写记忆库；禁止用原始对话或草稿直接调 lingxi-memory。

**品味**（可操作定义）：在给定场景下，在一组可能适用甚至冲突的原则中，用户实际采用的选择与权衡（含显式或可推断的理由）。识别目标：抽出「场景 + 原则候选 + 实际选择」→ 可写入记忆的 payload。

## 品味 Payload 规范（输出唯一形态，契约）

下游 lingxi-memory **仅接受 payloads 数组**（元素为本结构）；不产候选，只做校验 → 映射 → 治理 → 门控 → 写入。

| 字段 | 类型 | 必选 | 说明 |
| --- | --- | --- | --- |
| `scene` | string | 是 | 场景（何时/何类情境）；下游据此生成 whenToLoad、场景族。 |
| `principles` | string[] | 是 | 原则或选项，通常 1～2 项；与 choice 共同表达在哪些候选中做了选择。 |
| `choice` | string | 是 | 实际选择，须与 principles 中某一项一致或等价表述。 |
| `evidence` | string | 否 | 一句用户原文或引用；无则省略。 |
| `source` | enum | 是 | `auto` \| `remember` \| `extract` \| `choice` \| `init`，写入路径，供审计与分流。 |
| `confidence` | enum | 是 | `low` \| `medium` \| `high`；供门控：high 可静默 new，medium/low 须 questions。 |
| `apply` | enum | 否 | `personal` \| `project` \| `team`；缺省时下游可默认 project。 |

**门控**（下游 lingxi-memory）：merge/replace 一律 questions；new 时 `confidence === "high"` 可静默写入，medium/low 必须 questions。

**示例**：`{ "scene": "文档中引用 Skill 时", "principles": ["短引用", "完整路径"], "choice": "短引用", "evidence": "不要写完整路径", "source": "auto", "confidence": "high", "apply": "team" }`

## References

- **触发点与输入表、执行步骤、与环节品味嗅探的关系**：[references/execution-and-triggers.md](references/execution-and-triggers.md)
- Payload → note 映射与门控细节：`references/payload-to-note.md`；下游契约：`.cursor/agents/lingxi-memory.md`
