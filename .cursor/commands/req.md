---
name: req
description: 创建任务文档（产出：001.req.<标题>.md）
args:
  - name: description
    required: true
    description: 需求描述
---

# /req - 创建任务文档

**用途**：创建任务文档（需求提纯与放大 + 核心技术方案/技术决策），作为工作流起点。

**用法**：`/req <需求描述>`

**产物**：`.cursor/.lingxi/tasks/001.req.<标题>.md`。有产物时在回复末尾给出下一步建议（格式见 req-executor Skill）。

**委托**：执行逻辑委托给 `req-executor` Skill（`.cursor/skills/req-executor/SKILL.md`）。
