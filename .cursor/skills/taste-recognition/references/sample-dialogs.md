# 典型对话示例集（九类各 1 条）

按 content-types 九类，每类 1 条示例，用于回归时人工对比或未来自动化/半自动化测试的基准。每条包含：**用户输入**、**预期识别类型**、**是否写入**、**预期 Kind/layer**（可选：预期 scene/choice 或 l1OneLiner）。

---

## 1. 偏好 (Preference)

| 项 | 内容 |
|----|------|
| **用户输入** | 文档里别写 Skill 完整路径，保持短引用就行。 |
| **预期识别类型** | 偏好 |
| **是否写入** | 是（经升维判定通过后） |
| **预期 Kind** | principle 或 heuristic |
| **预期 layer** | L1 |
| **可选 scene/choice** | scene=文档/引用场景；choice=短引用、不写完整路径 |

---

## 2. 决策经验 (Decision)

| 项 | 内容 |
|----|------|
| **用户输入** | 我们选了 React 因为团队熟、生态全，Vue 也考虑过但维护成本我们扛不住。 |
| **预期识别类型** | 决策经验 |
| **是否写入** | 是 |
| **预期 Kind** | decision |
| **预期 layer** | L1 |
| **可选 scene/choice** | scene=技术选型；principles=React/Vue；choice=React；evidence=团队熟、生态、维护成本 |

---

## 3. 领域知识 (Domain)

| 项 | 内容 |
|----|------|
| **用户输入** | 这个项目里 API 版本号放 header 的 X-Api-Version，和主仓约定一致。 |
| **预期识别类型** | 领域知识 |
| **是否写入** | 是 |
| **预期 Kind** | tech 或 reference |
| **可选 scene/choice** | scene=API 调用；choice=X-Api-Version 约定 |

---

## 4. 产品/业务知识 (Product/Business)

| 项 | 内容 |
|----|------|
| **用户输入** | 我们产品里折扣一律按下单时价格算，不跟促销后的价格叠加。 |
| **预期识别类型** | 产品/业务知识 |
| **是否写入** | 是 |
| **预期 Kind** | business 或 reference |
| **可选 scene/choice** | scene=折扣/价格计算；choice=按下单时价格、不跟促销叠加 |

---

## 5. 行业/组织经验 (Industry/Org)

| 项 | 内容 |
|----|------|
| **用户输入** | 我们公司对外接口都要走网关鉴权，不能直连后端。 |
| **预期识别类型** | 行业/组织经验 |
| **是否写入** | 是（apply 倾向 team） |
| **预期 Kind** | reference 或 principle |
| **可选 scene/choice** | scene=对外接口；choice=走网关鉴权；常带「我们公司」 |

---

## 6. 启发式 (Heuristic)

| 项 | 内容 |
|----|------|
| **用户输入** | 遇到超时先看连接池和线程数，一般就这两块。 |
| **预期识别类型** | 启发式 |
| **是否写入** | 是 |
| **预期 Kind** | heuristic |
| **可选 l1OneLiner** | 遇到超时先看连接池和线程数 |

---

## 7. 模式 (Pattern)

| 项 | 内容 |
|----|------|
| **用户输入** | 这里多种算法可插拔，用策略模式换实现就行。 |
| **预期识别类型** | 模式 |
| **是否写入** | 是（经 pattern-catalog 匹配） |
| **预期 Kind** | pattern |
| **可选 patternHint** | 策略模式 |

---

## 8. 反例与约束 (Counter-signals)

| 项 | 内容 |
|----|------|
| **用户输入** | 这种场景下不要用单例，会有状态污染。 |
| **预期识别类型** | 反例与约束 |
| **是否写入** | 是 |
| **预期 Kind** | principle 或 heuristic |
| **可选 One-liner** | 在该场景下避免使用单例（状态污染） |

---

## 9. 排障与根因 (Troubleshooting)

| 项 | 内容 |
|----|------|
| **用户输入** | 上次 build 报「找不到 module」是因为 node_modules 没装全，重新 yarn install 就好了。 |
| **预期识别类型** | 排障与根因 |
| **是否写入** | 是（可复现、可迁移到同类问题） |
| **预期 Kind** | tech 或 reference |
| **可选 scene/choice** | scene=build 报错「找不到 module」；choice=node_modules 未装全；evidence=重新 yarn install |

---

## 参考

- 类型定义与 Kind 映射：[content-types.md](content-types.md)
- 可沉淀情形与信号：[execution-and-triggers.md](execution-and-triggers.md)
- 回归清单引用本示例集：`.lingxi/workspace/regression-checklist-memory.md`
