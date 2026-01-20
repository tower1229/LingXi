---
name: experience-curator
description: 此 Skill 是经验成长循环核心，支持方案模式（生成治理方案）和执行模式（执行治理）。在 experience-depositor 中调用，方案模式用于生成治理方案供用户确认，执行模式用于执行治理动作。不应由用户直接调用。
---

# Experience Curator

## 模式说明

此 Skill 支持两种模式：

- **方案模式**：生成治理方案（建议的合并/取代动作），不执行，供用户确认
- **执行模式**：执行治理动作，更新 INDEX，输出变更报告

## Inputs

**方案模式**：
- 新增经验的 Tag 列表（本轮沉淀的经验）
- 新增经验的 Level（team/project）
- 对应的 INDEX.md（`team/INDEX.md` 或 `project/INDEX.md`）

**执行模式**：
- 新增经验的 Tag 列表（本轮沉淀的经验）
- 新增经验的 Level（team/project）
- 对应的 INDEX.md（`team/INDEX.md` 或 `project/INDEX.md`）
- 用户确认的治理方案（从方案模式输出）

## Outputs

**方案模式**：
- 治理方案（输出到对话，不执行）

**执行模式**（must write）：
- 更新后的 `INDEX.md`（`team/INDEX.md` 或 `project/INDEX.md`，根据 Level 确定）
- 变更报告（输出到对话）

注：`INDEX.md.bak`（执行前备份）会在治理完成后自动删除

---

## Instructions

### 0) 确定索引路径

根据新增经验的 Level，确定对应的 INDEX.md 路径：
- Level = team → `team/INDEX.md`
- Level = project → `project/INDEX.md`

### 0.5) 备份索引（回滚准备）

在执行任何治理动作前，必须先备份：

```bash
cp .cursor/.lingxi/context/experience/{level}/INDEX.md .cursor/.lingxi/context/experience/{level}/INDEX.md.bak
```

注：备份文件会在治理完成后（步骤 6）自动删除

### 1) 读取索引与新经验

- 读取对应的 `INDEX.md`（根据 Level 确定）中所有 `Status = active` 的经验
- 识别本轮新增的经验（从对话上下文获取）
- 读取本轮新增经验文件内容，确保包含并可提取以下结构化字段：
  - `Decision Shape`（Decision being made / Alternatives rejected / Discriminating signal）
  - `Judgment Capsule`（I used to think / Now I believe / decisive variable）
  - `Surface signal` / `Hidden risk`（来自 INDEX；若缺失则提示在后续补齐）

### 2) 合并/取代判断（AI Native）

对每条新经验，评估与现有 `active` 经验的关系，综合考虑以下信号：

**强相似信号**（通常需要合并/取代）：

- Tag 完全相同 → 明确表示同一主题的升级版本
- Decision being made 高度相似 → 可能是同一判断单元的完善或补充
- Trigger 关键词大量重叠 → 可能是重复内容或同主题的不同视角
- Title 语义高度相似 → 可能是新版本覆盖旧版本

**判断策略**：
根据相似程度、信息完整度、判断结构质量，智能决定：

- **合并**：多条经验讲同一件事，保留信息量最大的版本
- **取代**：新经验是旧经验的明确升级，旧版本已过时
- **保持独立**：虽有相似但视角不同，各有价值

**决策依据**：

- 优先保留 Decision Shape 和 Judgment Capsule 更完整的版本
- 优先保留 Scope 更广、Strength 更高的版本
- 当不确定时，倾向于保持独立而非强制合并

### 3) 模式分支

**如果是方案模式**：
- 输出治理方案（建议的合并/取代动作、理由、影响），不执行
- 返回，等待用户确认

**如果是执行模式**：
- 继续执行步骤 4（自动执行治理动作）

### 4) 自动执行治理动作（仅执行模式）

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

### 5) 输出变更报告（静默成功原则，仅执行模式）

**无变更时**：

- 完全静默，不输出任何内容

**有变更时**：

- 仅输出变更摘要，格式：
  ```
  治理：合并 EXP-001→EXP-003，deprecated 1 条（回滚：cp INDEX.md.bak INDEX.md）
  ```
- 详细信息已在文件中，无需重复输出完整报告

### 6) 清理备份文件（必须执行，仅执行模式）

治理流程结束后，必须删除备份文件：

```bash
rm .cursor/.lingxi/context/experience/{level}/INDEX.md.bak
```

其中 `{level}` 根据新增经验的 Level 确定（team 或 project）

**执行时机**：

- 在步骤 4（变更报告）完成后
- 无论有无变更，都必须删除备份
- 删除操作静默执行，不输出任何信息

**原因**：

- 备份仅用于治理过程中的回滚保护
- 治理成功后备份无用，避免留下垃圾文件
- 下次执行时会重新创建新的备份

---

## 禁止

- 删除任何经验文件（只做 `deprecated` 标记）
- 在没有备份的情况下修改 INDEX
