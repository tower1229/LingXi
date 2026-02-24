# 规划环节品味嗅探规则

本环节在**情境驱动**时识别用户品味；当下列情境出现且**拟提问前**，先用该条规则的 taste_key 查 INDEX，若存在对应 TasteKey 且 Status=active 则**不再问**。

taste_key = `情境类型|原则维度`（小写、连字符、无空格）。

---

## 规则 1：用户选非推荐方案时问理由

| 要素 | 内容 |
| --- | --- |
| **情境描述** | Agent 给出推荐方案 A，用户明确选择 B 或其它非推荐项。 |
| **可命名的原则/策略** | 由用户理由归纳为 principles 与 choice；规则中预定义常见维度：可维护性/性能/工期/风险偏好等，或从用户表述归纳。 |
| **情境类型** | `plan-non-recommended-choice` |
| **原则维度** | `maintainability-vs-speed` 或归纳所得维度 slug |
| **taste_key** | `plan-non-recommended-choice|maintainability-vs-speed`（或按理由归纳的 dimension） |
| **是否提问** | 主动用 questions 问选择理由。 |
| **问什么** | 「请简短说明您选择该方案的主要考虑。」选项可与常见原则维度对齐。 |
| **如何提取** | 从理由映射到预定义或归纳 principles/choice、evidence；填 payload，source=choice。 |

---

## 规则 2：先简单实现 vs 预留扩展点

| 要素 | 内容 |
| --- | --- |
| **情境描述** | 方案讨论中出现「先简单」「预留扩展」「一步到位」等。 |
| **可命名的原则/策略** | principles：`先简单实现` / `预留扩展点`；choice 取其一。 |
| **情境类型** | `plan-simplicity-vs-extension` |
| **原则维度** | `simplicity-vs-extension` |
| **taste_key** | `plan-simplicity-vs-extension|simplicity-vs-extension` |
| **是否提问** | 可静默从对话抽取或 questions 确认。 |
| **问什么** | 「您更倾向于先简单实现再迭代，还是预留扩展点？」 |
| **如何提取** | 映射到预定义 principles/choice，填 payload；source=choice。 |

---

## 衔接

嗅探产出 payload 后由主 Agent 交 lingxi-memory；payload.source=choice。提问前用 taste_key 查 INDEX 实现「不再问」。
