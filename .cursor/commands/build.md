---
name: build
description: 执行构建（双模式：Plan-driven 或 Req-driven）
args:
  - name: taskId
    required: false
    description: 任务编号（如 001），省略时自动查找最新编号的任务
---

# /build - 执行构建

**用途**：按 task（及可选 plan）实现功能。Plan-driven：有 plan 时按计划执行；Req-driven：无 plan 时由 Agent 基于 task 自行决策。

**用法**：`/build [taskId]`。省略 taskId 时使用最新任务。

**产物**：代码与测试写入项目库；无独立产物文件。有产物时在回复末尾给出下一步建议（格式见 build-executor Skill）。

**委托**：执行逻辑委托给 `build-executor` Skill（`.cursor/skills/build-executor/SKILL.md`）。
