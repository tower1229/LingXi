---
name: archive
description: 归档阶段。当用户明确确认任务完成（Status = completed）时激活，负责归档 REQ 三件套和更新索引。
---

# Archive

## Outputs (must write)

- 更新：`.workflow/requirements/INDEX.md`（Status = completed, Current Phase = archive）
- 归档：将 REQ 三件套从 `in-progress/` 移动到 `completed/`

## Instructions

### 0) 触发条件（强制）

- 只在用户明确确认任务完成后执行
- 检查条件：
  - `Status = completed`（在 INDEX 中）
  - Review 阶段无 Blockers
  - 用户明确确认"任务完成"

### 1) 归档操作

遵循 `index-manager` 的指引：

- 将 REQ 三件套（`.md/.plan.md/.review.md`）从 `requirements/in-progress/` 移动到 `requirements/completed/`
- 同步更新 `.workflow/requirements/INDEX.md` 的 `Links` 指向 `completed/`
- 更新索引：Status = `completed`，Current Phase = `archive`

### 2) 索引更新

更新 `.workflow/requirements/INDEX.md`：

- Status：`completed`
- Current Phase：`archive`
- Next Action：`已完成`
- Links：修正为 `completed/` 路径

## 禁止

- 不在未确认任务完成时执行归档
- 不负责经验沉淀（经验沉淀在各阶段通过 EXP-CANDIDATE + subagent 完成）
- 不输出 experience 文件
