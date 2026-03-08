# 可沉淀内容类型（Content Types）

**在实现中的位置**：本表在 taste-recognition 的「判断是否可沉淀」步骤中被引用，用于按类型识别用户信号；类型与 Note Kind 的对应关系供升维与 memory-write 映射时参考。完整定义见 [references/execution-and-triggers.md](execution-and-triggers.md) 中的可沉淀情形与信号。

---

## 类型表（9 类）

| 类型 | 定义与边界 | 对应 Note Kind | 典型 scene/choice/evidence 特征 | 常用 apply |
|------|------------|----------------|----------------------------------|------------|
| **偏好 (Preference)** | 在特定情境下「要/不要」的稳定选择（风格、工具、表述、流程偏好），可无深层理由。 | principle / heuristic | scene=情境；choice=选中的做法；evidence=用户原文「喜欢/习惯/就用 X」。 | project |
| **决策经验 (Decision)** | 在若干选项中做过取舍，且带有情境、理由、备选与结果（或预期）。 | decision | scene=决策所处情境；principles=备选；choice=最终选择；evidence=理由或结果。 | project |
| **领域知识 (Domain)** | 某领域的术语、概念、约定、最佳实践、常见坑与排障路径（可验证、可复用）。 | tech / reference | scene=使用该知识的场景；choice=核心事实或规则；evidence=原文或引用。 | project |
| **产品/业务知识 (Product/Business)** | 产品语义、业务规则、验收标准、边界条件、与竞品的差异。 | business / reference | scene=需求/验收/边界讨论；choice=规则或标准；evidence=固化表述。 | project |
| **行业/组织经验 (Industry/Org)** | 行业惯例、合规约束、组织内约定、协作方式、沟通偏好。 | reference / principle | scene=跨项目也会遇到的场景；choice=约定内容；常带「我们公司/团队」。 | team |
| **启发式 (Heuristic)** | 「在 X 情况下通常 Y」「遇到 A 先看 B」等可复用的判断规则，未必有严格证明。 | heuristic | scene=触发条件；choice=规则本身；principles 可为 [该规则, 不按该规则]。 | project |
| **模式 (Pattern)** | 可命名的设计/工程/协作模式及其适用场景与 when-to-load。 | pattern | 经 pattern-catalog 匹配；patternHint/patternConfidence 填写；scene/choice 可被模式名改写。 | project / team |
| **反例与约束 (Counter-signals)** | 明确「不要」「这里不用」「例外」的禁止与边界。 | principle / heuristic | choice 或 evidence 表禁止；One-liner 用「在 [scene] 下避免 X」；Counter-signals 填何时不适用。 | project |
| **排障与根因 (Troubleshooting)** | 某类问题的典型表现、排查顺序、根因与可复现步骤。 | tech / reference | scene=现象/错误类型；choice=根因或排查结论；evidence=现象或步骤摘要；须可复现、可迁移。 | project |

---

## 与现有 Kind 的映射

Note 的 **Kind** 枚举（见 memory-note-template）：`principle` | `heuristic` | `decision` | `pattern` | `business` | `tech` | `reference` | `other`。

| Kind | 内容类型（多对一） | 说明 |
|------|--------------------|------|
| principle | 偏好、行业/组织经验、反例与约束 | 原则性选择或禁止 |
| heuristic | 偏好、启发式、反例与约束 | 经验法则、稳定偏好 |
| decision | 决策经验 | 有备选与理由的取舍 |
| pattern | 模式 | 匹配 pattern-catalog 时由 write-protocol 设为 pattern |
| business | 产品/业务知识 | 业务规则、验收、边界 |
| tech | 领域知识、排障与根因 | 技术事实、排障路径 |
| reference | 领域知识、产品/业务知识、行业/组织经验、排障 | 可查证的事实或约定 |
| other | 未归入上述类型 | 兜底 |

---

## 格式约定（不新增 payload 字段）

在现有 payload（scene / principles / choice / evidence / source / confidence / apply / layer / l0OneLiner / l1OneLiner / patternHint / patternConfidence）与 Note（When to load、One-liner、Context/Decision、Tags）不变的前提下，按类型约定用法：

- **偏好**：scene + principles（1～2 项）+ choice + 可选 evidence。Note 的 When to load = 该偏好被触发的场景；One-liner = 「在 X 下优先/避免 Y」。
- **决策经验**：强调 evidence（用户原文）；Context/Decision 完整填 Decision、Alternatives（principles 中非 choice）、Counter-signals。One-liner = 结论句。
- **领域知识**：scene = 何时用到该知识；choice = 核心事实或规则；evidence = 出处或可验证表述。Note 的 Pointers 指向文档/代码位置。
- **产品/业务知识**：与决策类似；scene 偏需求/验收/边界。Tags 可加 `#product` / `#acceptance` 便于检索。
- **行业/组织经验**：与偏好/原则类似；apply 常为 `team`，写入 share。
- **启发式**：scene = 触发条件；choice = 规则句；principles = [该规则, 不按该规则]。One-liner = 「在 X 下先 Y」或「遇到 A 则 B」。
- **模式**：由 pattern-catalog 与 patternHint 覆盖；When to load 可沿用 pattern-catalog 的表述。
- **反例与约束**：choice 或 evidence 表禁止；Note 的 One-liner 或 Counter-signals 写「在 [scene] 下避免 X」；When to load = 容易误用的场景。
- **排障与根因**：scene = 现象/错误类型；choice = 根因或排查顺序；evidence = 现象或步骤。Note 的 Pointers = 日志/配置/文档位置。

---

## 参考

- 可沉淀情形与用户信号示例： [references/execution-and-triggers.md](execution-and-triggers.md) 步骤 3
- 升维按类型评分指引： [references/elevation-rules.md](elevation-rules.md)
- 模式靠拢： [references/pattern-catalog.md](pattern-catalog.md)
- Note 结构： `.cursor/skills/memory-write/references/memory-note-template.md`
