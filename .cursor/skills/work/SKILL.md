---
name: work
description: 按 Plan 执行实现并持续验证：回写 plan 的任务勾选与 Worklog，必要时写 checkpoint，阶段推进需人工确认。
---

# Work

## When to Use

- plan 生成完成且用户确认开始 work

## Outputs (must write)

- 更新：`.workflow/requirements/in-progress/REQ-xxx.plan.md`（任务勾选 + Worklog + Status Summary）
- 按需新增：`.workflow/context/session/<REQ-xxx>-checkpoint-*.md`

## Instructions

### 0) Experience Index（强制）

进入代码编写前先调用 skill `experience-index`。

### 1) 状态恢复

- 优先读取 plan 的 Status Summary
- 若存在 checkpoint，加载最新一个继续

### 2) 边做边验证（Fail Fast）

- 每完成一个“最小步”，立即记录验证方式与结果（PASS/FAIL）
- 核心逻辑优先即时验证，避免最后才发现基础模块有问题

### 3) 回写规范（必须）

plan.md 中必须持续更新：

- Status Summary（阶段/进度/当前任务/阻塞项/上次更新）
- Worklog（做了什么 + 为什么 + 如何验证 + 结果 + 指针）
- Compounding Candidates（可沉淀点）

