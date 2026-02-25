# Payload → Note 映射与门控（本 Skill 引用）

> 本 Skill 产出 payload 后，下游 lingxi-memory 按本约定做映射与门控。

---

## 1. 品味 Payload 规范（下游唯一合法输入）

| 字段 | 类型 | 必选 | 说明 |
| --- | --- | --- | --- |
| `scene` | string | 是 | 场景（何时/何类情境）；下游据此生成 whenToLoad、L0/L1 的「场景」或「场景族」。 |
| `principles` | string[] | 是 | 原则或选项，通常 1～2 项；与 choice 共同表达「在哪些候选中做了选择」。 |
| `choice` | string | 是 | 实际选择，须与 principles 中某一项一致或等价表述。 |
| `evidence` | string | 否 | 一句用户原文或引用，用于可验证性及 L0 事实层；无则省略。 |
| `source` | enum | 是 | `auto` \| `remember` \| `choice` \| `init`，写入路径，供审计与分流。 |
| `confidence` | enum | 是 | `low` \| `medium` \| `high`；供门控：high 可静默 new，medium/low 须 questions。 |
| `apply` | enum | 否 | `personal` \| `project` \| `team`，适用范围；缺省时下游可推断或默认 project。team = 团队级、可跨项目共享。 |

**门控（下游 lingxi-memory）**：merge/replace 一律 questions，与 confidence 无关。new：`confidence === "high"` 可静默写入；`medium` / `low` 必须 questions。

---

## 2. Payload → Note 映射要点（下游执行）

- **Meta**：Title 由 payload.scene + choice 生成（与 INDEX Title 一致）；Kind/Status/Strength/Scope 按 source、apply、用户表述规则；Audience/Portability 来自 apply；Source 来自 payload.source；Supersedes 治理时填写。
- **When to load**：由 payload.scene 生成 1～3 条，偏「何时加载」；与 One-liner 分工（One-liner 偏「做什么」）。
- **One-liner**：在 scene 下优先 choice 或避免非 choice 项；公式如 `在 [scene] 下优先 [choice]`。
- **Context/Decision**：Decision = principles + choice；Alternatives = principles 中除 choice 外；Counter-signals 可选。
- **L0/L1**：由下游 008 评分卡决定是否写 L0、L1 或双层；payload 含足够信息即可生成二者。
