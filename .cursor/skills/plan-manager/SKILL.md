---
name: plan-manager
description: 此 Skill 把 REQ.plan.md 当作执行账本。当 work/review/archive 阶段推进时，或每完成一个"最小步"后要回写执行账本时激活，确保状态摘要/任务勾选/复利候选必须回写，保证可交接与可复现验证。
---

# Plan Manager

## Instructions

### 状态摘要（Status Summary）

每次推进都更新：

- 当前阶段：work / review / archive
- 进度：X/Y
- 当前任务：一句话
- 阻塞项：无/具体阻塞
- 上次更新：当天日期
- **测试状态**（可选，仅在测试执行后更新）：单元测试 X passed / Y total，集成测试 X passed / Y total

### 复利候选（Compounding Candidates）

每条候选必须包含：

- When to load / Symptom / Root cause / Fix / How to verify / Pointers
