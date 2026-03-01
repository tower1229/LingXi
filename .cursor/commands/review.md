---
name: review
description: 审查交付（产出：001.review.<标题>.md，不存档）
args:
  - name: taskId
    required: false
    description: 任务编号（如 001），省略时自动查找最新编号的任务
---

# /review - 审查交付

**用途**：对任务交付做多维度审查（文档一致性、安全、性能、E2E 等），保证交付质量。

**用法**：`/review [taskId]`。省略 taskId 时使用最新任务。

**产物**：`.cursor/.lingxi/tasks/<taskId>.review.<标题>.md`（审查报告，不存档）。有产物时在回复末尾给出下一步建议（格式见 review-executor Skill）。

**委托**：执行逻辑委托给 `review-executor` Skill（`.cursor/skills/review-executor/SKILL.md`）；各 reviewer Skill 由 review-executor 按需调用。
