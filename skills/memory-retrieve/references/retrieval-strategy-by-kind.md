# 按类型的检索策略说明（当前未实现逻辑）

**说明**：当前 memory-retrieve 实现仍为**统一双路径、并集、top 0–2**；本文档描述按记忆内容类型（Note Kind / 内容类型）差异化检索策略，供后续按 Kind 或 Tags 做权重/过滤时的参考，**首阶段不做代码改动**。内容类型定义见 taste-recognition 的 `references/content-types.md`。

---

## 按类型的策略约定

| 类型 / Kind | 目标 | 策略要点 |
|-------------|------|----------|
| **偏好 / 启发式 / 反例** (principle, heuristic) | 高精度，避免误用错误偏好 | When to load 与 query 情境匹配要求高；adopt 谨慎，有疑则 ask。 |
| **决策经验** (decision) | 参考类似决策 | 语义权重略高；命中可提示「参考 [MEM-xxx] 的取舍」。 |
| **领域 / 产品 / 排障** (tech, reference, business) | 高召回，不漏关键事实 | 关键词路径权重要足（术语、错误码、API 名）；top 数可优先给此类。 |
| **行业/团队** (reference, principle, apply=team) | 跨项目一致 | share 已参与检索；若 query 带「公司/团队/我们」可未来考虑提高 share 权重。 |
| **模式** (pattern) | 设计/实现讨论时召回 | When to load 与 pattern 名参与关键词与语义。 |

---

## 当前实现（不变）

- 双路径（语义 + 关键词）并集加权合并，取 top 0–2。
- 不按 Kind 调权重、不改变 top 数逻辑。
- 检索依赖 Title、When to load 及 note 正文；INDEX 的 Kind 可用于治理与展示，当前不参与检索排序。

---

## 参考

- 内容类型与 Kind 映射：`plugin/skills/taste-recognition/references/content-types.md`
- 记忆系统机制：`plugin/skills/about-lingxi/references/memory-system.md`
