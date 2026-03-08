# 需求环节品味嗅探规则

本环节在**情境驱动**时识别用户品味；当下列情境出现且**拟提问前**，调用 `/memory-retrieve <决策点描述>`，其中决策点描述由 Agent 用自然语言构建（如「在方案对比中，用户更倾向于体验优先还是成本可控？」）；若检索到相关记忆且能覆盖当前选择，则**不再问**，直接按该记忆行为。

每条规则含：情境描述、可命名的原则/策略、是否提问、问什么、如何提取。

---

## 规则 1：体验优先 vs 成本可控

| 要素 | 内容 |
| --- | --- |
| **情境描述** | 需求或约束中出现「体验优先」「可多花成本」「不惜代价保证体验」或相反「先控制成本」「实现简单即可」等信号。 |
| **可命名的原则/策略** | principles：`体验优先` / `成本可控`；choice 取其一或用户表述映射到二者。 |
| **是否提问** | 可静默从对话抽取；若表述模糊可用 ask-questions 确认倾向。 |
| **问什么** | 「您更倾向于优先保证体验，还是优先控制实现成本？」选项与 principles 对齐（为每个选项配置稳定 option id）。 |
| **如何提取** | 用户选择或表述先归一化为 option id，再映射到 principles/choice，填 payload（scene 可为「需求阶段体验与成本取舍」）；source=choice。 |

---

## 规则 2：复用优先 vs 先实现再抽象

| 要素 | 内容 |
| --- | --- |
| **情境描述** | 需求中出现「抽公共」「避免重复」「组件化」「先跑通再抽象」等。 |
| **可命名的原则/策略** | principles：`复用优先` / `先实现再抽象`；choice 取其一。 |
| **是否提问** | 可静默从对话抽取；必要时 ask-questions 确认。 |
| **问什么** | 「您更倾向于优先抽象复用，还是先实现再视情况抽象？」（选项配置稳定 option id） |
| **如何提取** | 先按 option id 映射到预定义 principles/choice，再填 payload；source=choice。 |

---

## 规则 3：需求/验收/边界固化（产品/业务知识）

| 要素 | 内容 |
| --- | --- |
| **情境描述** | 用户明确固化验收标准、业务规则、边界条件或与竞品差异（如「我们产品里 X 一律按 Y 算」「验收必须包含 Z」）。 |
| **可命名的原则/策略** | 由用户表述归纳为 principles/choice；Kind 倾向 business/reference。 |
| **是否提问** | 可静默抽取；若表述模糊可问「是否希望将这条规则沉淀为记忆，以便后续需求/验收时自动参考？」。 |
| **问什么** | 与现有规则格式一致（选项配置稳定 option id，如需）。 |
| **如何提取** | 映射到 principles/choice、evidence；scene 偏需求/验收/边界；source=choice；沉淀类型为产品/业务知识。 |

---

## 与可沉淀内容类型的对应

本环节嗅探以**偏好**、**决策经验**、**产品/业务知识**为主。类型定义与信号见 taste-recognition 的 [references/content-types.md](../../taste-recognition/references/content-types.md) 与 [references/execution-and-triggers.md](../../taste-recognition/references/execution-and-triggers.md)。

---

## 与 taste-recognition、lingxi-memory 的衔接

- 嗅探产出 payload 后由主 Agent 交 lingxi-memory 写入；payload.source=choice。
- 「不再问」：拟提问前调用 memory-retrieve，传入 Agent 构建的决策点描述；若命中相关记忆则不再问。
