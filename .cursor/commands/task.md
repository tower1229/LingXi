---
name: task
description: 创建任务文档（产出：001.task.<标题>.md）
args:
  - name: description
    required: true
    description: 需求描述
---

# /task - 创建任务文档

**用途**：创建任务文档（需求提纯与放大 + 核心技术方案/技术决策），作为工作流起点。

**用法**：`/task <需求描述>`

**产物**：`.cursor/.lingxi/tasks/001.task.<标题>.md`。有产物时在回复末尾给出下一步建议（格式见 task-executor Skill）。

**委托**：执行逻辑委托给 `task-executor` Skill（`.cursor/skills/task-executor/SKILL.md`）。
