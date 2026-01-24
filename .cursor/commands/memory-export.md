---
name: memory-export
description: 导出团队级记忆到 memory-pack（跨项目复用）
args:
  - name: packPath
    required: true
    description: 团队 memory-pack 仓库根目录路径（本地路径）
  - name: options
    required: false
    description: 可选参数（如：--min-strength validated --tags api,deploy --dry-run）
---

# /memory-export - 导出团队级记忆到 memory-pack

## 命令用途

把当前项目的“团队级可跨项目复用”记忆导出到独立的 **memory-pack Git 仓库**，便于跨项目分发与复用。

## 使用方式

```bash
/memory-export <packPath> [options]
```

示例：

```bash
/memory-export ../team-memory-pack --min-strength validated
/memory-export ../team-memory-pack --tags ops,deploy
/memory-export ../team-memory-pack --dry-run
```

## 默认筛选规则

- `Audience=team`
- `Portability=cross-project`
- `Strength >= validated`
- `Status=active`

## 委托给 Skills 的说明

本命令将执行逻辑委托给 `memory-exporter` Skill（`.cursor/skills/memory-exporter/SKILL.md`），包括：

- 解析筛选参数
- 从 `.cursor/.lingxi/memory/notes/` 中筛选记忆
- 写入 pack：`<packPath>/memory/notes/*.md`
- 生成/更新 pack 的 `memory/INDEX.md`
- 输出导出报告（仅高信号）

