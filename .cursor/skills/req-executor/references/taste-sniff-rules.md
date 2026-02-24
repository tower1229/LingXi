# 需求环节品味嗅探规则

本环节在**情境驱动**时识别用户品味；当下列情境出现且**拟提问前**，先用该条规则的 taste_key（情境类型|原则维度）查 INDEX，若存在对应 TasteKey 且 Status=active 则**不再问**，直接按该记忆行为。

每条规则含：情境描述、可命名的原则/策略、是否提问、问什么、如何提取；taste_key = `情境类型|原则维度`（小写、连字符、无空格）。

---

## 规则 1：体验优先 vs 成本可控

| 要素 | 内容 |
| --- | --- |
| **情境描述** | 需求或约束中出现「体验优先」「可多花成本」「不惜代价保证体验」或相反「先控制成本」「实现简单即可」等信号。 |
| **可命名的原则/策略** | principles：`体验优先` / `成本可控`；choice 取其一或用户表述映射到二者。 |
| **情境类型** | `ux-priority` |
| **原则维度** | `experience-vs-cost` |
| **taste_key** | `ux-priority|experience-vs-cost` |
| **是否提问** | 可静默从对话抽取；若表述模糊可用 questions 确认倾向。 |
| **问什么** | 「您更倾向于优先保证体验，还是优先控制实现成本？」选项与 principles 对齐。 |
| **如何提取** | 用户选择或表述映射到 principles/choice，填 payload（scene 可为「需求阶段体验与成本取舍」）；source=choice。 |

---

## 规则 2：复用优先 vs 先实现再抽象

| 要素 | 内容 |
| --- | --- |
| **情境描述** | 需求中出现「抽公共」「避免重复」「组件化」「先跑通再抽象」等。 |
| **可命名的原则/策略** | principles：`复用优先` / `先实现再抽象`；choice 取其一。 |
| **情境类型** | `reuse-componentization` |
| **原则维度** | `reuse-vs-ship-first` |
| **taste_key** | `reuse-componentization|reuse-vs-ship-first` |
| **是否提问** | 可静默从对话抽取；必要时 questions 确认。 |
| **问什么** | 「您更倾向于优先抽象复用，还是先实现再视情况抽象？」 |
| **如何提取** | 映射到预定义 principles/choice，填 payload；source=choice。 |

---

## 与 taste-recognition、lingxi-memory 的衔接

- 嗅探产出 payload 后由主 Agent 交 lingxi-memory 写入；payload.source=choice。
- taste_key 由本规则的情境类型|原则维度生成，写入 note Meta 与 INDEX，供「不再问」与检索。
