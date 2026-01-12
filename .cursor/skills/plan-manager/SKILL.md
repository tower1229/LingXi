---
name: plan-manager
description: 把 REQ.plan.md 当作执行账本：状态摘要/任务勾选/Worklog/复利候选必须回写，确保可交接与可复现验证。
---

# Plan Manager

## When to Use

- work/review/compound 阶段推进时
- 每完成一个“最小步”后要回写执行账本时

## Instructions

### 状态摘要（Status Summary）

每次推进都更新：

- 当前阶段：work / review / compound
- 进度：X/Y
- 当前任务：一句话
- 阻塞项：无/具体阻塞
- 上次更新：当天日期

### Worklog（必须可复现）

每个可交付最小步追加一条：

- 做了什么（文件/模块指针）
- 关键决策（为什么）
- 验证方式（测试/脚本/手工步骤）
- 结果（PASS/FAIL + 原因）

### 复利候选（Compounding Candidates）

每条候选必须包含：

- When to load / Symptom / Root cause / Fix / How to verify / Pointers

