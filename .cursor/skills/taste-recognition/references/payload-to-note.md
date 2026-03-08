# Payload → Note 映射与门控（本 Skill 引用）

> 本 Skill 产出 payload 后，下游 lingxi-memory **仅按本约定**将 payload 映射为 note 并执行门控；不做升维或评分卡。

## 数据流中的位置

- **Payload 来源**：由 taste-recognition 产出，已含升维结果（layer、可选 l0OneLiner/l1OneLiner、patternHint、patternConfidence）；仅「判定为写」的条目会进入 payloads 数组。
- **下游行为**：lingxi-memory 接受 payloads 数组后，**仅按本约定**做字段到 note 的映射、治理（TopK）、门控与写入；不执行价值判定、不产候选。

---

## 1. 品味 Payload 规范（下游唯一合法输入）

| 字段 | 类型 | 必选 | 说明 |
| --- | --- | --- | --- |
| `scene` | string | 是 | 场景（何时/何类情境）；下游据此生成 whenToLoad、L0/L1 的「场景」或「场景族」。 |
| `principles` | string[] | 是 | 原则或选项，通常 1～2 项；与 choice 共同表达「在哪些候选中做了选择」；模式靠拢后可为模式名或「模式名+约束」。 |
| `choice` | string | 是 | 实际选择，须与 principles 中某一项一致或等价表述；模式靠拢后可为模式名或「模式名+具体约束」。 |
| `evidence` | string | 否 | 一句用户原文或引用，用于可验证性及 L0 事实层；无则省略。 |
| `source` | enum | 是 | `remember` \| `extract` \| `choice` \| `init`，写入路径，供审计与分流。`choice` = 环节选择题反馈。 |
| `confidence` | enum | 是 | `low` \| `medium` \| `high`；供门控：high 可静默 new，medium/low 须 questions。 |
| `apply` | enum | 否 | `project` \| `team`，适用范围；缺省时下游可推断或默认 project。team = 团队级、写入 memory/share/（跨项目复用）。 |
| `layer` | enum | 是 | `L0` \| `L1` \| `L0+L1`；由 taste-recognition 按 elevation-rules 填写。 |
| `l0OneLiner` | string | 否 | 当 layer 为 L0 或 L0+L1 时建议填写；下游直接用于 note 的 L0 句/事实句。 |
| `l1OneLiner` | string | 否 | 当 layer 为 L1 或 L0+L1 时建议填写；下游直接用于 note 的 L1 句/原则句。 |
| `patternHint` | string | 否 | 设计模式名称（与 pattern-catalog 一致）；匹配到模式时填写。 |
| `patternConfidence` | enum | 否 | `high` \| `medium` \| `low`；仅当 patternHint 存在时填写。 |

**门控（下游 lingxi-memory）**：merge/replace 一律 questions，与 confidence 无关。new：`confidence === "high"` 可静默写入；`medium` / `low` 必须 questions。

---

## 2. Payload → Note 映射要点（下游执行）

- **Meta**：Title 由 payload.scene + choice 生成（与 INDEX Title 一致）。若存在 payload.patternHint 且 patternConfidence=high，Kind 建议设为 `pattern`；否则 Kind/Status/Strength/Scope 按 source、apply、用户表述规则。Audience/Portability 来自 apply；Source 来自 payload.source；Supersedes 治理时填写。
- **When to load**：由 payload.scene 生成 1～3 条，偏「何时加载」；若有 patternHint 可结合 pattern-catalog 的 when-to-load 表述。与 One-liner 分工（One-liner 偏「做什么」）。
- **One-liner**：优先使用 payload.l1OneLiner（layer 为 L1 或 L0+L1）或 payload.l0OneLiner（layer 为 L0）；若无则按「在 [scene] 下优先 [choice]」生成。
- **Context/Decision**：Decision = principles + choice；Alternatives = principles 中除 choice 外；Counter-signals 可选。
- **L0/L1**：**仅按 payload.layer 与 payload.l0OneLiner、payload.l1OneLiner 填写**，不再由下游评分卡判定。若 note 模板有单独 L0/L1 区块则按 layer 写入对应句。
