# 审查环节品味嗅探规则

本环节在**情境驱动**时识别用户品味；拟提问前先用该条规则的 taste_key 查 INDEX，若存在且 Status=active 则**不再问**。

taste_key = `情境类型|原则维度`（小写、连字符、无空格）。

---

## 规则 1：例外处理

| 要素 | 内容 |
| --- | --- |
| **情境描述** | 用户对某条审查问题选择不修、接受风险或特殊处理（例外）。 |
| **可命名的原则/策略** | principles：`必须修复` / `接受风险或例外`；choice + 适用边界。 |
| **情境类型** | `review-exception` |
| **原则维度** | `fix-vs-accept-risk` |
| **taste_key** | `review-exception|fix-vs-accept-risk` |
| **是否提问** | 主动问例外理由与边界。 |
| **问什么** | 「接受该风险或例外的考虑是？在什么范围内适用？」 |
| **如何提取** | 从理由与边界映射到 principles/choice、evidence；填 payload，source=choice。 |

---

## 规则 2：设计品味/风格建议

| 要素 | 内容 |
| --- | --- |
| **情境描述** | 用户给出明确的风格、规则类建议（如「这类情况都建议…」「布局应…」）。 |
| **可命名的原则/策略** | 由用户表述归纳为可命名原则（如「布局先考虑可访问性」）；规则中可预列常见设计维度。 |
| **情境类型** | `design-taste-ui` |
| **原则维度** | 按内容归纳，如 `a11y-first` |
| **taste_key** | `design-taste-ui|a11y-first`（或归纳的 dimension） |
| **是否提问** | 可静默归纳；必要时确认适用范围。 |
| **问什么** | 「这条建议是否希望作为团队级约定沉淀？」 |
| **如何提取** | 归纳为 principles/choice，填 payload；source=choice。 |

---

## 衔接

嗅探产出 payload 后由主 Agent 交 lingxi-memory；payload.source=choice。提问前用 taste_key 查 INDEX 实现「不再问」。
