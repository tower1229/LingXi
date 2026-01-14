---
name: experience-curator
description: 此 Skill 是经验成长循环核心，在 experience-depositor 成功写入新经验后自动激活，执行合并/取代治理，输出变更报告与质量准则建议。不应由用户直接调用。
---

# Experience Curator

## Inputs

- 新增经验的 Tag 列表（本轮沉淀的经验）
- `.workflow/context/experience/INDEX.md`（当前经验索引）

## Outputs (must write)

- 更新后的 `INDEX.md`（合并/取代后的索引）
- `INDEX.md.bak`（执行前备份，用于回滚）
- 变更报告（输出到对话）
- 质量准则建议（输出到对话，等待用户采纳）

---

## Instructions

### 0) 备份索引（回滚准备）

在执行任何治理动作前，必须先备份：

```bash
cp .workflow/context/experience/INDEX.md .workflow/context/experience/INDEX.md.bak
```

### 1) 读取索引与新经验

- 读取 `INDEX.md` 中所有 `Status = active` 的经验
- 识别本轮新增的经验（从对话上下文获取）
- 读取本轮新增经验文件内容，确保包含并可提取以下结构化字段：
  - `Decision Shape`（Decision being made / Alternatives rejected / Discriminating signal）
  - `Judgment Capsule`（I used to think / Now I believe / decisive variable）
  - `Surface signal` / `Hidden risk`（来自 INDEX；若缺失则提示在后续补齐）

### 2) 合并/取代判断

对每条新经验，遍历现有 `active` 经验，按以下优先级判断：

**判断规则**（从高到低）：

| 优先级 | 条件 | 动作 |
|---|---|---|
| 1 | **Tag 相同** | 必定合并/取代（新覆盖旧） |
| 2 | **Decision being made 相同/高度相似** | 候选合并/取代（同一判断单元的升级/补全） |
| 3 | **Trigger 关键词重叠 ≥ 60%** | 候选合并（同主题重复） |
| 4 | **Title 语义高度相似** | 候选取代（新经验是旧经验升级版） |

**关键词重叠计算**：
```
overlap = |keywords(new) ∩ keywords(old)| / |keywords(old)|
```

### 3) 自动执行治理动作

**合并**（多条 → 1 条）：

1. 保留新经验作为"主经验"
2. 旧经验 `Status` 改为 `deprecated`
3. 旧经验 `ReplacedBy` 填入新经验 Tag
4. 新经验 `Replaces` 追加旧经验 Tag（逗号分隔）
5. 新经验 `Scope` 取更 broad 的值（narrow < medium < broad）
6. 新经验 `Strength` 取更高的值（hypothesis < validated < enforced）

**取代**（新覆盖旧）：

1. 旧经验 `Status` 改为 `deprecated`
2. 旧经验 `ReplacedBy` 填入新经验 Tag
3. 新经验 `Replaces` 追加旧经验 Tag

### 4) 输出变更报告

执行完成后，必须输出结构化变更报告：

```markdown
## 成长循环：治理报告

### 执行动作
| 类型 | 新经验 | 旧经验 | 理由 |
|---|---|---|---|
| 合并 | EXP-003 | EXP-001 | Trigger 关键词重叠 75%，主题高度相似 |
| 取代 | EXP-004 | EXP-002 | 新经验是旧经验的升级版（更完整/更准确） |

### 影响范围
- INDEX 变更行数：2
- deprecated 经验数：2
- 涉及文件：EXP-001.md, EXP-002.md（状态变更，内容未删除）

### 回滚方式
如需撤销本次治理，执行：
\`\`\`bash
cp .workflow/context/experience/INDEX.md.bak .workflow/context/experience/INDEX.md
\`\`\`
```

### 5) 输出质量准则建议（人工闸门）

基于本轮沉淀的经验，提炼 1-3 条"质量准则建议"（优先从 Judgment Capsule 抽象，而不是复述案例）。

> 类型选择、Scope 选择、模板等操作指南详见 Skill `rules-creator`。
> 规则目录详见 `.cursor/rules/quality-standards-schema.md`。

**输出格式**：

```markdown
## 成长循环：质量准则建议（需人工采纳）

以下建议从近期沉淀中提炼，采纳后将由 `rules-creator` Skill 创建规则。
请使用 `/flow 采纳质量准则 <序号>` 采纳，或 `/flow 忽略质量准则` 跳过。

| # | 建议 | Type | Scope | 目标规则 |
|---|------|------|-------|----------|
| 1 | 涉及用户数据的变更必须有审计日志 | always | security | qs-always-security |
| 2 | 跨服务调用应先检查超时配置 | i | backend | qs-i-backend |
| 3 | 组件必须定义 Props 类型 | fs | frontend | qs-fs-frontend |

建议写法（建议本身应当是"判断结构"）：
- Surface signal：...
- Hidden risk：...
- Decisive variable：...
- Boundary（不适用条件）：...
```

**建议提炼规则**：

- 从新增经验的 `Judgment Capsule` 中抽象可复用的判断标准（I used to think → Now I believe → decisive variable）
- 若 Capsule 缺失/质量差，优先提示"需要补齐 Decision Shape/Capsule"，不要强行输出泛化口号
- 如果某类问题反复出现（Trigger 相似的经验 ≥ 2 条），优先建议升级为自动拦截
- 优先选择已存在的规则（插入），避免创建过多新规则

**触发条件**（参考 `docs/02-design/experience-governance.md`）：

- **合并/取代触发**：当 experience-depositor 成功写入至少 1 条新经验文件后，必须自动触发
- **升级为规则触发**：当经验的 Strength = enforced，或某类问题反复出现（Trigger 相似的经验 ≥ 2 条），或从 Judgment Capsule 可抽象时，输出质量准则建议

**执行稳定性要求**：

- 必须严格按照优先级顺序执行判断（Tag 相同 → Decision 相同 → Trigger 重叠 → Title 相似）
- 必须备份 INDEX 后再执行任何治理动作
- 必须输出统一格式的治理报告（执行动作/影响范围/回滚方式）
- 必须等待用户明确采纳后才写入质量准则（不得自动写入）

---

## 禁止

- 删除任何经验文件（只做 `deprecated` 标记）
- 自动写入质量准则建议（必须等用户 `/flow 采纳质量准则`）
- 在没有备份的情况下修改 INDEX
