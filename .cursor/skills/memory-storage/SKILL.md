---
name: memory-storage
description: 提供记忆库持久化存储能力（原子写入、事务性操作、索引管理）。工具类 Skill，不自动匹配，由其他记忆系统 Skills 通过脚本调用。
---

# Memory Storage

## 职责范围

提供记忆库（`.cursor/.lingxi/memory/`）的持久化存储能力：

- **原子写入**：临时文件 + 重命名，确保文件完整性
- **事务性操作**：记忆文件 + 索引更新，失败自动回滚
- **备份恢复**：关键操作前备份，失败时自动恢复
- **索引管理**：更新、校验 INDEX.md

## 使用方式

由其他 Skills 通过 `run_terminal_cmd` 调用脚本：

- `memory-curator`：写入记忆文件时调用
- `init-executor`：批量写入记忆时调用
- 其他需要操作记忆库的 Skills

## 脚本接口

### memory-storage.js

核心存储脚本，提供原子写入和事务性操作。

**命令格式**：

```bash
# 方式 1：从文件读取（推荐，避免转义问题）
node .cursor/skills/memory-storage/scripts/memory-storage.js <operation> --file <json-file>

# 方式 2：从 stdin 读取（简单 JSON 可用）
echo '<json>' | node .cursor/skills/memory-storage/scripts/memory-storage.js <operation>
```

**操作类型**：

- `write`：写入记忆文件 + 更新索引（事务性）
  - 可以创建新文件（文件不存在时）
  - 可以更新现有文件（文件存在时，会覆盖）
- `delete`：删除记忆文件 + 更新索引（事务性）
- `update-index`：仅更新索引

**接口设计**（JSON 通过 stdin 传递）：

**write 操作**：

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

**delete 操作**：

```json
{
  "operation": "delete",
  "noteId": "MEM-xxx",
  "filePath": "memory/notes/MEM-xxx.md"
}
```

**update-index 操作**：

```json
{
  "operation": "update-index",
  "memoryRoot": ".cursor/.lingxi/memory"
}
```

**错误处理**：

- 返回码：0 = 成功，非 0 = 失败
- 错误信息输出到 stderr
- 成功时静默

## 操作使用指南

### create 操作（新增）

通过 `write` 操作实现，但调用前必须检查文件不存在：

1. 检查目标文件是否存在（`.cursor/.lingxi/memory/notes/MEM-xxx.md`）
2. 如果文件已存在，报错（不允许覆盖，应使用 update）
3. 如果文件不存在，构建 JSON 参数，调用 `write` 操作

### update 操作（修改）

通过 `write` 操作实现，但调用前必须检查文件存在并读取旧内容：

1. 检查目标文件是否存在
2. 如果文件不存在，报错（不允许创建，应使用 create）
3. 如果文件存在：
   - 读取旧文件内容
   - 在调用层面处理合并逻辑（merge 模式）或替换逻辑（replace 模式）
   - 生成最终内容后，构建 JSON 参数，调用 `write` 操作

### delete 操作（删除）

直接调用 `delete` 操作：

1. 检查文件是否存在
2. 如果文件不存在，报错
3. 如果文件存在，构建 JSON 参数，调用 `delete` 操作

### validate-index.js

索引校验脚本，用于手动校验或修复索引。

**命令格式**：

```bash
node .cursor/skills/memory-storage/scripts/validate-index.js --update
node .cursor/skills/memory-storage/scripts/validate-index.js --check
```

**命令**：

- `--update`：更新索引（基于 memory/notes 生成/修复 INDEX.md）
- `--check`：检查冲突（检测索引与文件不一致）

**选项**：

- `--root <memoryRoot>`：指定 memory root（默认: `.cursor/.lingxi/memory`）

## 实现细节

### 原子写入

使用临时文件 + 重命名机制，确保文件写入的原子性：

1. 写入临时文件（`.tmp` 后缀）
2. 原子性重命名到目标文件
3. 失败时清理临时文件

### 事务性操作

写入记忆文件 + 更新索引作为原子事务：

1. 备份现有文件（如果存在）
2. 原子写入记忆文件
3. 更新索引（读取 → 修改 → 原子写入）
4. 成功：清理备份
5. 失败：恢复备份

### 备份机制

关键操作（write/delete）前自动备份：

- 备份文件：原文件路径 + `.backup` 后缀
- 失败时自动恢复备份
- 成功时清理备份文件

## 技术约束

1. **路径要求**：脚本从项目根目录执行，使用相对路径
2. **并发限制**：不支持并发写入
3. **错误恢复**：备份恢复失败时输出详细错误信息
