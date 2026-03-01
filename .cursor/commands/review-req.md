---
name: review-req
description: 审查 req 文档（可选，可多次执行）
args:
  - name: taskId
    required: false
    description: 任务编号（如 001），省略时自动查找最新编号的任务
---

# /review-req - 审查 req 文档

**用途**：对 req 文档做审查，辅助提升质量；可选、可多次执行。

**用法**：`/review-req [taskId]`。省略 taskId 时使用最新任务。前置：对应 `.cursor/.lingxi/tasks/<taskId>.req.*.md` 已存在。

**产物**：不产出文件，仅输出审查结果与建议到对话。有产物时在回复末尾给出下一步建议（格式见 review-req-executor Skill）。

**委托**：执行逻辑委托给 `review-req-executor` Skill（`.cursor/skills/review-req-executor/SKILL.md`）。
