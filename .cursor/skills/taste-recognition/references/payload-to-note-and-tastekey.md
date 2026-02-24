# Payload → Note 映射、TasteKey 与门控（本 Skill 引用）

> 本 Skill 产出 payload 后，下游 lingxi-memory 按本约定做映射、生成 TasteKey 与门控。内容从品味识别与沉淀设计固化而来，存于本 references 以便 skill 自洽、不依赖 tasks 目录。

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

- **Meta**：Title 由 payload.scene + choice 生成（与 INDEX Title 一致）；Kind/Status/Strength/Scope 按 source、apply、用户表述规则；Audience/Portability 来自 apply；Source 来自 payload.source；**TasteKey** 由 payload 按「记忆键」规则生成，仅存 Meta 不写入 Tags；Supersedes 治理时填写。
- **When to load**：由 payload.scene 生成 1～3 条，偏「何时加载」；与 One-liner 分工（One-liner 偏「做什么」）。
- **One-liner**：在 scene 下优先 choice 或避免非 choice 项；公式如 `在 [scene] 下优先 [choice]`。
- **Context/Decision**：Decision = principles + choice；Alternatives = principles 中除 choice 外；Counter-signals 可选。
- **L0/L1**：由下游 008 评分卡决定是否写 L0、L1 或双层；payload 含足够信息即可生成二者。

---

## 3. 记忆键（TasteKey）设计

- **键名**：`taste_key`。**键值格式**：`<情境类型>|<原则维度>`，即 `context|dimension`，归一化存储（小写、连字符、无空格）。
- **用途**：① 环节选择题「已沉淀则不再问」——提问前用该键查 INDEX，存在且 Status=active 则不再问；② 检索时 memory-retrieve 可对 INDEX 的 TasteKey、Title、When to load 做关键词匹配。
- **生成规则**：
  - **环节嗅探（source=choice）**：由该条规则的**情境类型**与**原则维度**生成 `taste_key = normalize(情境类型) + "|" + normalize(原则维度)`。
  - **品味识别（auto/remember/init）**：由 payload.scene 与 payload.choice 生成稳定 slug，拼成 `scene_slug|choice_slug`；若与某嗅探情境的 (情境类型, 原则维度) 语义等价，可共用同一 taste_key。
- **存储**：note Meta 的 TasteKey 字段；INDEX 的 TasteKey 列。仅存于此，不重复写入 Tags。
