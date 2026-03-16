---
name: taste-recognition
description: 显式调用。从用户输入或行为中识别可沉淀的「品味」，产出结构化 payload。由主 Agent 将 payload 压入 HOT_RAM.md 的 [POST-PROCESSING QUEUE] 中。
---

# 品味识别（Taste Recognition）

## 意图

从用户自由输入、/remember 指定内容、心跳对入队会话的完整对话内容、/init 确认草稿或环节选择题反馈中判断是否存在可沉淀的「品味」；若有则经**升维**（模式靠拢 + 价值判定）后产出**唯一合法**的扩展 payload，主 Agent 必须将 payload（单条或多条）压入 `HOT_RAM.md` 的 `[POST-PROCESSING QUEUE]` 中，格式为 `- [ ] [MEMORY_WRITE]: <payload_json>`；无可沉淀或**判定不写**时静默（不产出 payload、不压入队列）。本 Skill 在既有流程内统一执行准入规则：Exclusions 在识别阶段前置拦截，Inclusion 语义在识别与升维中综合判定。详见下文「实现逻辑（数据流）」及 references/elevation-rules.md、references/pattern-catalog.md。

**品味**（可操作定义）：在给定场景下，在一组可能适用甚至冲突的原则中，用户实际采用的选择与权衡（含显式或可推断的理由）。识别目标：抽出「场景 + 原则候选 + 实际选择」→ 可写入记忆的 payload。

**入参统一**：本 Skill 的入参形式统一为**完整对话内容**（按轮次排列的 user/assistant 文本或约定格式）。**可沉淀性判断**以对话中的**用户消息（user）**为主：偏好、约束、取舍、决策、纠正等仅依据用户输入；assistant 内容仅作上下文与证据补充，不单独作为沉淀依据。

## 实现逻辑（数据流）

1. **识别（含前置排除）**：从当前触发点的输入中判断是否可沉淀（偏好、约束、取舍、决策等），并前置排除 Exclusions：secrets/tokens/credentials/private personal data、one-off task instructions、transient details（如分支名、commit hash、临时错误）。无可沉淀或命中排除项则静默返回，不产出 payload、不压入队列。
2. **模式靠拢**：对可沉淀条目标抽 scene、principles、choice、evidence 后，参考 [references/pattern-catalog.md](references/pattern-catalog.md) 尝试将用户选择映射到常见设计模式；若匹配则更新 principles/choice 或填写 patternHint、patternConfidence。
3. **价值判定（升维）**：对（可能已模式升维的）内容按 [references/elevation-rules.md](references/elevation-rules.md) 做升维判定，得到总分 T 与 layer。判定时同时吸收 Inclusion 语义：actionable（可执行）、stable（稳定）、repeated-or-broad-rule（重复信号或用户明确通用规则）、non-sensitive（非敏感）；若 T≤3 或触犯例外则**不写**该条——不产出该条、不加入 payloads。
4. **产出**：对判定为写的条目标注 layer、可选 l0OneLiner/l1OneLiner，产出符合扩展 payload 规范的 JSON。
5. **主 Agent 行为**：**仅当 payloads 非空时**将 payload 序列化为 JSON 字符串，并以 `- [ ] [MEMORY_WRITE]: <json>` 的格式追加到 `HOT_RAM.md` 的 `[POST-PROCESSING QUEUE]` 中。下游 `lingxi-memory-write` 将根据每条 payload 的 `destination + source` 组合执行分流路由（`user-config` → USER.md，`memory` → 语义记忆库）。

本 Skill 不直接调用 lingxi-memory-write，不读写记忆库；禁止用原始对话或草稿直接调 lingxi-memory-write。

## 品味 Payload 规范（输出唯一形态，契约）

下游 lingxi-memory-write **仅接受 payloads 数组**（元素为本结构）；不产候选，只做校验 → 按 payload 映射 → 治理 → 门控 → 写入。

| 字段 | 类型 | 必选 | 说明 |
| --- | --- | --- | --- |
| `scene` | string | 是 | 场景（何时/何类情境）；下游据此生成 whenToLoad、场景族。 |
| `principles` | string[] | 是 | 原则或选项，通常 1～2 项；与 choice 共同表达在哪些候选中做了选择；模式靠拢后可为模式名或「模式名+约束」。 |
| `choice` | string | 是 | 实际选择，须与 principles 中某一项一致或等价表述；模式靠拢后可为模式名或「模式名+具体约束」。 |
| `evidence` | string | 否 | 一句用户原文或引用；无则省略。始终保留用户原文便于可验证性与 L0。 |
| `source` | enum | 是 | `remember` \| `extract` \| `choice` \| `init` \| `heartbeat`，写入路径，供审计与分流。其中 `choice` 表示环节选择题反馈（与 payload 字段 `choice`「实际选择」区分）；`heartbeat` 表示心跳自动会话提炼。 |
| `confidence` | enum | 是 | `low` \| `medium` \| `high`；供门控：high 可静默 new，medium/low 须 questions。 |
| `apply` | enum | 否 | `project` \| `team`；缺省时下游可默认 project。项目级=写入 memory/project/，团队级=写入 memory/share/（跨项目复用）。 |
| `layer` | enum | 是 | `L0` \| `L1` \| `L0+L1`；由本 Skill 按 references/elevation-rules.md 填写。 |
| `destination` | enum | 是 | `user-config` \| `memory`。决定写入目标：`user-config` 写入 `.lingxi/memory/USER.md`（行为偏好类，如称呼/语言/输出风格）；`memory` 写入语义记忆库（技术规范/项目决策等，默认值）。 |
| `l0OneLiner` | string | 否 | 当 layer 为 L0 或 L0+L1 时建议填写；下游直接用于 note 的 L0 句/事实句。 |
| `l1OneLiner` | string | 否 | 当 layer 为 L1 或 L0+L1 时建议填写；下游直接用于 note 的 L1 句/原则句。 |
| `patternHint` | string | 否 | 设计模式名称（与 references/pattern-catalog.md 一致）；匹配到模式时填写。 |
| `patternConfidence` | enum | 否 | `high` \| `medium` \| `low`；仅当 patternHint 存在时填写。 |

**门控**（下游 lingxi-memory-write）：merge/replace 一律 questions；new 时 `confidence === "high"` 可静默写入，medium/low 必须 questions。

**示例**：`{ "scene": "文档中引用 Skill 时", "principles": ["短引用", "完整路径"], "choice": "短引用", "evidence": "不要写完整路径", "source": "remember", "confidence": "high", "apply": "team", "layer": "L1", "destination": "memory", "l1OneLiner": "引用能力时优先自然语言短引用，避免暴露实现路径" }`

## References

- **可沉淀内容类型（类型定义、与 Kind 映射、格式约定）**：[references/content-types.md](references/content-types.md)
- **触发点与输入表、执行步骤、与环节品味嗅探的关系**：[references/execution-and-triggers.md](references/execution-and-triggers.md)
- **升维规则（写/不写 + layer）**：[references/elevation-rules.md](references/elevation-rules.md)
- **设计模式目录（模式靠拢参考）**：[references/pattern-catalog.md](references/pattern-catalog.md)
- Payload → note 映射与门控细节：`references/payload-to-note.md`；下游契约：`agents/lingxi-memory-write.md`
