# 实现环节品味嗅探规则

本环节在**情境驱动**时识别用户品味；拟提问前先用该条规则的 taste_key 查 INDEX，若存在且 Status=active 则**不再问**。

taste_key = `情境类型|原则维度`（小写、连字符、无空格）。

---

## 规则 1：复用/组件化

| 要素 | 内容 |
| --- | --- |
| **情境描述** | 用户要求抽组件、提公共逻辑、避免重复实现等。 |
| **可命名的原则/策略** | principles：`复用优先` / `先实现再抽象`；与 req 环节复用情境对齐。 |
| **情境类型** | `build-reuse-componentization` |
| **原则维度** | `reuse-vs-ship-first` |
| **taste_key** | `build-reuse-componentization|reuse-vs-ship-first` |
| **是否提问** | 可静默从对话抽取。 |
| **问什么** | 需要时可问「优先抽象复用还是先实现再视情况抽象？」 |
| **如何提取** | 映射到预定义 principles/choice，填 payload；source=choice。 |

---

## 规则 2：规范与例外

| 要素 | 内容 |
| --- | --- |
| **情境描述** | 用户坚持某种与常规规范不一致的写法，或绕过某条规范。 |
| **可命名的原则/策略** | principles：`遵守规范` / `例外有据`；choice + 例外条件（counter-signals）。 |
| **情境类型** | `build-norm-exception` |
| **原则维度** | `norm-vs-exception` |
| **taste_key** | `build-norm-exception|norm-vs-exception` |
| **是否提问** | 可问原因或例外适用边界。 |
| **问什么** | 「这样写是出于哪方面考虑？在什么情况下可以接受例外？」 |
| **如何提取** | 映射到 principles/choice，evidence 为用户理由；可选 counter-signals；source=choice。 |

---

## 衔接

嗅探产出 payload 后由主 Agent 交 lingxi-memory；payload.source=choice。提问前用 taste_key 查 INDEX 实现「不再问」。
