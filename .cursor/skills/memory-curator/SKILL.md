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
- **replace（取代）**：conflict == true，且用户明确选择新结论\n+ - 行为：如果文件路径相同（same filePath），直接用 `write` 操作覆盖；如果文件路径不同，先删除旧文件再创建新文件\n+ - 索引：旧条目移除，新条目记录 `Supersedes`
- **veto（否决）**：conflict == true 但无法判断更优、且用户未给决定性变量\n+ - 行为：不写入（避免污染），提示用户补充“决定性变量/适用边界”，或让用户明确选择保留哪一个\n+ - 输出：只输出下一步选项（最小高信号）
- **new（新增）**：与 TopK 近邻均不构成 merge/replace\n+ - 行为：新建记忆文件与索引条目

## 用户门控（必须）

以下动作必须让用户确认后才执行：

- 删除旧记忆文件（merge / replace 场景）
- replace 场景下的“结论取舍”

展示格式（示例）：

**MERGE 场景**：

```markdown
## 治理方案（待确认）

- **MERGE**：`memory/notes/MEM-xxx.md` + 新候选 → 保留新候选，删除 `memory/notes/MEM-xxx.md`
  - 理由：同场景同结论，新候选信息更完整

请选择：

- ✅ **A) 确认**：执行合并操作
- ❌ **B) 取消**：不执行任何操作
- ➕ **C) 改为新增**：不合并，创建新记忆文件
- 👀 **D) 查看对比**：查看新旧内容的详细对比

（回复 A/B/C/D 即可，也支持完整文字如"确认"/"取消"）
```

**REPLACE 场景**：

```markdown
## 治理方案（待确认）

- **REPLACE**：`memory/notes/MEM-xxx.md`（旧结论）→ 替换为新记忆（新结论）
  - 理由：同场景但结论不同，存在冲突

请选择：

- ✅ **A) 确认**：执行替换操作（删除旧记忆，创建新记忆）
- ❌ **B) 取消**：不执行任何操作
- ➕ **C) 改为新增**：不替换，创建新记忆文件
- 👀 **D) 查看对比**：查看新旧内容的详细对比

（回复 A/B/C/D 即可，也支持完整文字如"确认"/"取消"）
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

### 快速参考

**脚本路径**：`.cursor/skills/memory-storage/scripts/memory-storage.js`

**命令格式**（推荐使用 stdin，避免临时文件）：

```bash
echo '<json>' | node .cursor/skills/memory-storage/scripts/memory-storage.js write
echo '<json>' | node .cursor/skills/memory-storage/scripts/memory-storage.js delete
```

**最小 JSON 示例**（write 操作）：

```json
{
  "operation": "write",
  "note": {
    "id": "MEM-xxx",
    "filePath": "memory/notes/MEM-xxx.md",
    "content": "..."
  },
  "indexEntry": {
    "id": "MEM-xxx",
    "kind": "decision",
    "title": "...",
    "whenToLoad": ["..."],
    "status": "active",
    "strength": "validated",
    "scope": "medium",
    "supersedes": null,
    "file": "memory/notes/MEM-xxx.md"
  }
}
```

**关键约束**：

- ❌ 禁止直接写文件：必须通过脚本写入
- ❌ 禁止创建临时文件：使用 stdin 传递 JSON（避免 UI 展示临时文件）
- ❌ 禁止冗余输出：成功时完全静默
- ✅ 使用 `run_terminal_cmd` 通过管道传递 JSON 到脚本

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

3. **通过 stdin 调用 write 操作**（避免创建临时文件）
   - 使用 `run_terminal_cmd` 通过管道传递 JSON
   - 命令格式：`echo '<json-string>' | node .cursor/skills/memory-storage/scripts/memory-storage.js write`
   - 注意：JSON 字符串需要正确转义（使用单引号包裹，内部双引号需转义，或使用 JSON.stringify 生成）

4. **检查返回码**（仅检查一次）
   - 返回码 0：成功，静默（不输出任何内容）
   - 返回码非 0：失败，输出错误信息 + 解决方案

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

5. **通过 stdin 调用 write 操作**（同 create 流程的步骤 3-4）

### replace 操作流程

**场景**：用户明确选择用新记忆替换旧记忆（conflict == true 且用户确认替换）

1. **判断文件路径**
   - 如果新记忆的 `filePath` 与旧记忆相同（same filePath，通常是 same ID）：
     - **优化方案**：直接用 `write` 操作覆盖现有文件（更高效，单次操作，避免先删后建的额外开销）
     - 构建 JSON 参数时，`indexEntry.supersedes` 设置为旧记忆的 ID
     - `write` 操作会自动更新索引：移除旧条目，添加新条目（包含 `Supersedes` 字段）
   - 如果新记忆的 `filePath` 与旧记忆不同（不同 ID）：
     - 先删除旧文件（调用 `delete` 操作，传入旧文件的 `noteId` 和 `filePath`）
     - 再创建新文件（调用 `write` 操作，传入新文件的 `note` 和 `indexEntry`）
     - `indexEntry.supersedes` 设置为旧记忆的 ID
     - `delete` 操作会从索引中移除旧条目，`write` 操作会添加新条目（包含 `Supersedes` 字段）

2. **构建 JSON 参数**（同 create/update 流程）
   - 注意：`indexEntry.supersedes` 必须设置为被替换的旧记忆 ID

3. **执行操作**
   - **路径相同**：直接调用 `write` 操作（覆盖现有文件，单次操作更高效）
   - **路径不同**：先调用 `delete` 操作，再调用 `write` 操作

4. **检查返回码**（同 create 流程的步骤 4）

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

3. **通过 stdin 调用 delete 操作**（避免创建临时文件）
   - 使用 `run_terminal_cmd` 通过管道传递 JSON
   - 命令格式：`echo '<json-string>' | node .cursor/skills/memory-storage/scripts/memory-storage.js delete`

4. **检查返回码**（同 create 流程的步骤 4）

### 禁止事项（避免流程混乱）

- ❌ **禁止直接写文件**：不要使用 `write` 工具直接创建 `memory/notes/*.md` 文件
- ❌ **禁止创建临时文件**：必须使用 stdin 传递 JSON，不要创建临时 JSON 文件（避免 UI 展示）
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
- **replace 成功**：完全静默（不输出任何内容）
- **delete 成功**：完全静默（不输出任何内容）
- **操作失败**：输出错误信息 + 解决方案（脚本的 stderr 输出）

### 治理阶段

- **create 场景**（无相关近邻）：静默执行，成功后不输出
- **update 场景**（找到相关近邻）：
  - merge 模式：如果不需要用户确认，静默执行；如果需要确认，输出摘要等待确认（使用 A/B/C/D 格式）
  - replace 模式：必须输出摘要等待用户确认（使用 A/B/C/D 格式）
- **delete 场景**：必须输出摘要等待用户确认（使用 A/B/C/D 格式）
- **skip 场景**：只输出下一步选项（最小高信号，使用 A/B/C/D 格式）

### 用户确认格式要求

所有需要用户确认的场景必须使用 **A/B/C/D 快捷选择格式**：

```markdown
请选择：

- ✅ **A) 确认**：执行操作
- ❌ **B) 取消**：不执行任何操作
- ➕ **C) 改为新增**：不替换/合并，创建新记忆文件（如适用）
- 👀 **D) 查看对比**：查看新旧内容的详细对比（如适用）

（回复 A/B/C/D 即可，也支持完整文字如"确认"/"取消"）
```

**解析规则**：

- 用户回复 `A`、`确认`、`yes`、`y` 等 → 执行确认操作
- 用户回复 `B`、`取消`、`no`、`n` 等 → 取消操作
- 用户回复 `C`、`改为新增`、`新增` 等 → 改为新增操作（如适用）
- 用户回复 `D`、`查看对比`、`对比` 等 → 展示详细对比（如适用）

### 禁止的输出

- ❌ 不要输出"正在写入记忆..."、"构建记忆内容并写入..."等过程性描述
- ❌ 不要输出"提取记忆并委托给 memory-curator..."等委托过程描述（委托应静默进行）
- ❌ 不要输出"查看 memory-storage 脚本的使用方式..."等内部实现细节
- ❌ 不要输出"验证写入结果..."、"检查文件是否存在..."等中间步骤
- ❌ 不要输出"记忆已写入"、"记忆已更新"、"记忆已删除"（成功时静默）
- ❌ 不要输出中间步骤的工具调用信息（如"[2 tools called]"等）
- ❌ 不要输出临时文件的创建和清理过程
