---
name: plan
description: 生成任务规划（产出：001.plan.<标题>.md + 001.testcase.<标题>.md）
args:
  - name: taskId
    required: false
    description: 任务编号（如 001），省略时自动查找最新编号的任务
---

# /plan - 任务规划

**用途**：基于 req 文档做任务规划与测试设计；可选环节，复杂任务建议在 build 前执行。

**用法**：`/plan [taskId]`。省略 taskId 时使用最新任务。依据 `.cursor/.lingxi/tasks/<taskId>.req.*.md`。

**产物**：`001.plan.<标题>.md`、`001.testcase.<标题>.md`。有产物时在回复末尾给出下一步建议（格式见 plan-executor Skill）。

**委托**：执行逻辑委托给 `plan-executor` Skill（`.cursor/skills/plan-executor/SKILL.md`）。
