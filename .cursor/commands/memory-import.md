---
name: memory-import
description: 从 memory-pack 导入团队级记忆到本项目（跨项目复用）
args:
  - name: packPath
    required: true
    description: 团队 memory-pack 仓库根目录路径（本地路径）
  - name: options
    required: false
    description: 可选参数（如：--strategy replaceTeam --dry-run / --apply）
---

# /memory-import - 从 memory-pack 导入团队级记忆

## 命令用途

将团队维护的 **memory-pack**（独立 Git 仓库）导入到当前项目的 `.cursor/.lingxi/memory/notes/`，让检索注入立即生效。

## 使用方式

```bash
/memory-import <packPath> [options]
```

示例：

```bash
/memory-import ../team-memory-pack
/memory-import ../team-memory-pack --strategy replaceTeam
/memory-import ../team-memory-pack --apply
```

## 默认行为（稳定优先）

- 默认 **dry-run**：先生成导入报告，不写文件。
- 只有在你明确要求 `--apply`（或在对话中确认）后才会实际写入与更新索引。

## 委托给 Skills 的说明

本命令将执行逻辑委托给 `memory-importer` Skill（`.cursor/skills/memory-importer/SKILL.md`），包括：

- 解析 pack 路径与策略
- 生成导入报告（新增/跳过/冲突/建议覆盖）
-（可选）在用户确认后执行写入
- 更新项目 `.cursor/.lingxi/memory/INDEX.md`

