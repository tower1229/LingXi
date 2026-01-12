---
name: experience-curator
description: 经验成长循环核心：自动执行合并/取代治理，输出变更报告与质量准则建议。每次新经验沉淀后由 experience-depositor 自动调用。
---

# Experience Curator

## When to Use

- 由 `experience-depositor` 在成功写入新经验后**自动调用**
- 不应由用户直接调用

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
- 识别本轮新增的经验（由 `experience-depositor` 传入）

### 2) 合并/取代判断

对每条新经验，遍历现有 `active` 经验，按以下优先级判断：

**判断规则**（从高到低）：

| 优先级 | 条件 | 动作 |
|---|---|---|
| 1 | **Tag 相同** | 必定合并/取代（新覆盖旧） |
| 2 | **Trigger 关键词重叠 ≥ 60%** | 候选合并（同主题重复） |
| 3 | **Title 语义高度相似** | 候选取代（新经验是旧经验升级版） |

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

基于本轮沉淀的经验，提炼 1-3 条"质量准则建议"：

```markdown
## 成长循环：质量准则建议（需人工采纳）

以下建议从近期沉淀中提炼，可升级为 rules/skills/quality-bar。
请使用 `/flow 采纳质量准则 <序号>` 采纳，或 `/flow 忽略质量准则` 跳过。

| # | 建议 | 类型 | 落盘目标 |
|---|---|---|---|
| 1 | 涉及用户数据的变更必须有审计日志 | 红线/规则 | `.cursor/rules/` |
| 2 | 跨服务调用应先检查超时配置 | 检查清单 | `.cursor/skills/` |
| 3 | 数据库 DDL 变更需同步更新 ERD | 流程约束 | `.workflow/context/tech/quality-bar.md` |
```

**建议提炼规则**：

- 从经验的"根因"或"解决方案"中抽象出可复用的判断标准
- 如果某类问题反复出现（Trigger 相似的经验 ≥ 2 条），优先建议升级为自动拦截
- 建议必须标注"类型"和"落盘目标"，方便用户决策

---

## 禁止

- 删除任何经验文件（只做 `deprecated` 标记）
- 自动落盘质量准则建议（必须等用户 `/flow 采纳质量准则`）
- 在没有备份的情况下修改 INDEX
