---
name: memory-curator
description: 负责记忆库治理与写入：对新候选做语义近邻治理（合并优先、冲突否决），写入 memory/notes 并更新 memory/INDEX.md。
---

# Memory Curator

## 职责范围

- 对新记忆候选（MEM-CANDIDATE）做治理决策：**merge / replace / new / veto**
- 执行写入：生成或更新 `.cursor/.lingxi/memory/notes/*.md`
- 更新索引：`.cursor/.lingxi/memory/INDEX.md`（SSoT）

## 输入来源

- 用户选择的候选编号（来自 `memory-capture` 的候选列表），或用户通过 `/remember <文本>` 直接提供的记忆表达
- 当前对话上下文（用于补齐候选内容与指针）

## 治理核心：语义近邻 TopK（合并优先）

### 1) 找近邻（TopK）

- 搜索范围：`.cursor/.lingxi/memory/notes/`
- 使用 Cursor 语义搜索，构建概念化查询：描述“这条新记忆在解决什么决策/风险/约束”，避免只写结论
- 取 Top 5 作为候选近邻

### 2) 概念级评估（LLM）

对每个近邻，评估：

- **问题/场景概念是否一致**（same_scenario）
- **结论是否一致**（same_conclusion）
- **是否存在冲突**（conflict：同场景结论矛盾）
- **哪一条信息更完整**（completeness）

### 3) 决策矩阵

- **merge（合并，优先）**：same_scenario && same_conclusion\n+  - 行为：把信息合并到“更完整的版本”（通常是新版本），删除被合并的旧文件\n+  - 索引：旧条目移除，新条目保留并更新 `Supersedes`（可选）
- **replace（取代）**：conflict == true，且用户明确选择新结论\n+  - 行为：删除被取代的旧文件，保留新版本\n+  - 索引：旧条目移除，新条目记录 `Supersedes`
- **veto（否决）**：conflict == true 但无法判断更优、且用户未给决定性变量\n+  - 行为：不写入（避免污染），提示用户补充“决定性变量/适用边界”，或让用户明确选择保留哪一个\n+  - 输出：只输出下一步选项（最小高信号）
- **new（新增）**：与 TopK 近邻均不构成 merge/replace\n+  - 行为：新建记忆文件与索引条目

## 用户门控（必须）

以下动作必须让用户确认后才执行：

- 删除旧记忆文件（merge / replace 场景）
- replace 场景下的“结论取舍”

展示格式（示例）：

```markdown
## 治理方案（待确认）

- **MERGE**：`memory/notes/MEM-xxx.md` + 新候选 → 保留新候选，删除 `memory/notes/MEM-xxx.md`
  - 理由：同场景同结论，新候选信息更完整

请回复：`确认` / `取消` / `改为新增` / `查看对比`
```

## 写入格式（notes 文件）

写入到 `memory/notes/MEM-<stable-id>.md`，推荐使用模板：`memory/references/memory-note-template.md`。

最低要求（必须包含）：

- Meta（Id/Kind/Status/Strength/Scope/Audience/Portability/Source；Tags 可选）
- When to load（1-3 条）
- One-liner（1 句）
- Context / Decision（decision + signals）

## 索引更新（INDEX.md）

更新 `memory/INDEX.md` 的一行条目，字段：

- Id / Kind / Title / When to load / Status / Strength / Scope / Supersedes / File

推荐：写入后运行索引校验与更新脚本：

- `node scripts/validate-memory-index.js --update`

（若脚本不可用，至少保证表格字段与文件指针一致。）
## 输出规则（静默成功 + 最小高信号）

- 无治理变更：静默
- 有治理变更：只输出摘要
- 写入成功：静默
- 写入失败：输出错误 + 解决方案
