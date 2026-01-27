---
name: memory-curator
description: 负责记忆库治理与写入：对新候选做语义近邻治理（create/update/delete），写入 memory/notes 并更新 memory/INDEX.md。
---

# Memory Curator

## 职责范围

- 对新记忆候选（MEM-CANDIDATE）做治理决策：**create / update / delete**
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

- **merge（合并，优先）**：same_scenario && same_conclusion\n+ - 行为：把信息合并到“更完整的版本”（通常是新版本），删除被合并的旧文件\n+ - 索引：旧条目移除，新条目保留并更新 `Supersedes`（可选）
- **replace（取代）**：conflict == true，且用户明确选择新结论\n+ - 行为：删除被取代的旧文件，保留新版本\n+ - 索引：旧条目移除，新条目记录 `Supersedes`
- **veto（否决）**：conflict == true 但无法判断更优、且用户未给决定性变量\n+ - 行为：不写入（避免污染），提示用户补充“决定性变量/适用边界”，或让用户明确选择保留哪一个\n+ - 输出：只输出下一步选项（最小高信号）
- **new（新增）**：与 TopK 近邻均不构成 merge/replace\n+ - 行为：新建记忆文件与索引条目

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

默认写入到项目记忆库：

- `memory/notes/MEM-<stable-id>.md`

当用户明确选择“共享/跨项目复用”时，允许写入到 share 目录（硬约定，通常为 git submodule）：

- `memory/notes/share/MEM-<stable-id>.md`（或 share 内部子目录）

推荐使用模板：`memory/references/memory-note-template.md`。

写入 share 的前置条件（Fail Fast）：

- `.cursor/.lingxi/memory/notes/share/` 必须存在且可写（通常已添加为 git submodule）
- 若目录不存在或不可写：输出明确错误与解决方案（先添加 submodule / 检查权限），不要写入到错误位置

最低要求（必须包含）：

- Meta（Id/Kind/Status/Strength/Scope/Audience/Portability/Source；Tags 可选）
- When to load（1-3 条）
- One-liner（1 句）
- Context / Decision（decision + signals）

## 写入实现

**强制要求**：必须通过 `memory-storage` 脚本写入，禁止直接操作文件系统。

### 基本操作说明

所有操作都通过 `memory-storage` 脚本实现：

- **create**：通过 `write` 操作实现，但必须先检查文件不存在
- **update**：通过 `write` 操作实现，但必须先检查文件存在，读取旧内容用于合并
- **delete**：通过 `delete` 操作实现

### create 操作流程

1. **检查文件是否存在**
   - 如果文件已存在，报错（不允许覆盖）
   - 如果文件不存在，继续

2. **构建 JSON 参数**（包含 `note` 和 `indexEntry`）
   - `note.id`：记忆 ID（如 `MEM-82870553`）
   - `note.filePath`：相对路径（如 `memory/notes/MEM-82870553.md`）
   - `note.content`：完整的 markdown 内容
   - `indexEntry`：索引条目（id, kind, title, whenToLoad, status, strength, scope, supersedes, file）

3. **创建临时 JSON 文件**（使用系统临时目录）
   - 使用 `os.tmpdir()` 或 `/tmp` 创建临时文件
   - 文件名使用唯一标识（如 `memory-write-${timestamp}.json`）
   - 写入 JSON 内容

4. **调用 write 操作**
   ```bash
   node .cursor/skills/memory-storage/scripts/memory-storage.js write --file <temp-json-file>
   ```

5. **检查返回码**（仅检查一次）
   - 返回码 0：成功，静默（不输出任何内容）
   - 返回码非 0：失败，输出错误信息 + 解决方案

6. **清理临时文件**（无论成功失败都要清理）
   - 删除临时 JSON 文件

### update 操作流程

1. **检查文件是否存在**
   - 如果文件不存在，报错（不允许创建）
   - 如果文件存在，继续

2. **读取旧文件内容**
   - 读取目标文件的完整内容

3. **根据模式处理内容**
   - **merge 模式**：使用 LLM 将新内容合并到旧内容中，生成最终内容
   - **replace 模式**：用新内容完全替换旧内容

4. **构建 JSON 参数**（包含 `note` 和 `indexEntry`）
   - `note.id`：记忆 ID（保持不变）
   - `note.filePath`：相对路径（保持不变）
   - `note.content`：处理后的最终 markdown 内容
   - `indexEntry`：索引条目（更新相关字段）

5. **创建临时 JSON 文件并调用 write 操作**（同 create 流程的步骤 3-6）

### delete 操作流程

1. **检查文件是否存在**
   - 如果文件不存在，报错
   - 如果文件存在，继续

2. **构建 JSON 参数**
   ```json
   {
     "operation": "delete",
     "noteId": "MEM-xxx",
     "filePath": "memory/notes/MEM-xxx.md"
   }
   ```

3. **创建临时 JSON 文件**（使用系统临时目录）

4. **调用 delete 操作**
   ```bash
   node .cursor/skills/memory-storage/scripts/memory-storage.js delete --file <temp-json-file>
   ```

5. **检查返回码和清理临时文件**（同 create 流程）

### 禁止事项（避免流程混乱）

- ❌ **禁止直接写文件**：不要使用 `write` 工具直接创建 `memory/notes/*.md` 文件
- ❌ **禁止先写后删**：不要先写文件再删除改用脚本
- ❌ **禁止多次验证**：脚本已处理事务性操作，不需要额外检查文件是否存在、内容是否正确
- ❌ **禁止冗余输出**：成功时完全静默，不要输出"记忆已写入"、"验证写入结果"等中间步骤
- ❌ **禁止多次调用**：一次写入只调用一次脚本，不要多次调用验证

### 错误处理

- 脚本失败时，错误信息会输出到 stderr，直接展示给用户
- 不要尝试手动恢复或修复，脚本已实现自动回滚
- 只在脚本返回非 0 时输出错误信息

`memory-storage.js` 的 `write` 操作原子性地写入记忆文件并更新索引，失败时自动回滚。

## 索引更新（INDEX.md）

索引更新包含在 `memory-storage.js` 的 `write` 和 `delete` 操作中，事务性操作确保记忆文件与索引保持一致。

## 输出规则（静默成功 + 最小高信号）

### 操作阶段

- **create 成功**：完全静默（不输出任何内容）
- **update 成功**：完全静默（不输出任何内容）
- **delete 成功**：完全静默（不输出任何内容）
- **操作失败**：输出错误信息 + 解决方案（脚本的 stderr 输出）

### 治理阶段

- **create 场景**（无相关近邻）：静默执行，成功后不输出
- **update 场景**（找到相关近邻）：
  - merge 模式：如果不需要用户确认，静默执行；如果需要确认，输出摘要等待确认
  - replace 模式：必须输出摘要等待用户确认
- **delete 场景**：必须输出摘要等待用户确认
- **skip 场景**：只输出下一步选项（最小高信号）

### 禁止的输出

- ❌ 不要输出"正在写入记忆..."
- ❌ 不要输出"验证写入结果..."
- ❌ 不要输出"检查文件是否存在..."
- ❌ 不要输出"记忆已写入"（成功时静默）
- ❌ 不要输出"记忆已更新"（成功时静默）
- ❌ 不要输出"记忆已删除"（成功时静默）
- ❌ 不要输出中间步骤的工具调用信息
