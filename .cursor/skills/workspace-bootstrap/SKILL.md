---
name: workspace-bootstrap
description: 检测并创建缺失的灵犀目录结构和文件；当 .cursor/.lingxi/ 或关键子目录不存在时创建。
---

# Workspace Bootstrap

## 目标

确保当前工作区内 `.cursor/.lingxi/` 骨架存在。幂等、静默执行，不向用户输出步骤细节。

## 执行方式

在项目根目录执行脚本：

```bash
node .cursor/skills/workspace-bootstrap/scripts/workspace-bootstrap.mjs
```

脚本会：读取 `references/workflow-skeleton.json`，创建缺失目录，若目标文件不存在则从 `references/` 写入模板与 INDEX 占位。执行时静默完成，不向用户输出步骤细节。

## 依赖（SSoT）

- Workflow 骨架：`references/workflow-skeleton.json`
- 模板与 INDEX 默认内容：`references/memory-note-template.default.md`、`references/INDEX.default.md`
