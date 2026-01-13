# experience-curator 实现

## 概述

`experience-curator` 是经验成长循环核心，在 experience-depositor 成功写入新经验后自动激活，执行合并/取代治理，输出变更报告与质量准则建议。

## 源码位置

`.cursor/skills/experience-curator/SKILL.md`

## 输入

- 新增经验的 Tag 列表（本轮沉淀的经验）
- `.workflow/context/experience/INDEX.md`（当前经验索引）

## 输出

- 更新后的 `INDEX.md`（合并/取代后的索引）
- `INDEX.md.bak`（执行前备份，用于回滚）
- 变更报告（输出到对话）
- 质量准则建议（输出到对话，等待用户采纳）

## 处理流程

### 0. 备份索引

在执行任何治理动作前，必须先备份：

```bash
cp .workflow/context/experience/INDEX.md .workflow/context/experience/INDEX.md.bak
```

### 1. 读取索引与新经验

- 读取 `INDEX.md` 中所有 `Status = active` 的经验
- 识别本轮新增的经验（从对话上下文获取）
- 读取本轮新增经验文件内容，确保包含并可提取：
  - `Decision Shape`（Decision being made / Alternatives rejected / Discriminating signal）
  - `Judgment Capsule`（I used to think / Now I believe / decisive variable）
  - `Surface signal` / `Hidden risk`（来自 INDEX；若缺失则提示在后续补齐）

### 2. 合并/取代判断

对每条新经验，遍历现有 `active` 经验，按优先级判断：

| 优先级 | 条件 | 动作 |
|--------|------|------|
| 1 | **Tag 相同** | 必定合并/取代（新覆盖旧） |
| 2 | **Decision being made 相同/高度相似** | 候选合并/取代（同一判断单元的升级/补全） |
| 3 | **Trigger 关键词重叠 ≥ 60%** | 候选合并（同主题重复） |
| 4 | **Title 语义高度相似** | 候选取代（新经验是旧经验升级版） |

**关键词重叠计算**：
```
overlap = |keywords(new) ∩ keywords(old)| / |keywords(old)|
```

### 3. 自动执行治理动作

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

### 4. 输出变更报告

执行完成后，必须输出结构化变更报告（动作/理由/影响/回滚方式）

### 5. 输出质量准则建议

基于本轮沉淀的经验，提炼 1-3 条"质量准则建议"（优先从 Judgment Capsule 抽象，而不是复述案例）。

每条建议必须指定 Type（always/fs/i/m）和 Scope，目标规则格式：`qs-{type}-{scope}`。

## 禁止

- 删除任何经验文件（只做 `deprecated` 标记）
- 自动写入质量准则建议（必须等用户 `/flow 采纳质量准则`）
- 在没有备份的情况下修改 INDEX

## 参考

- [经验治理机制设计](../02-design/experience-governance.md)
- [experience-curator Skill](../../../../.cursor/skills/experience-curator/SKILL.md)
