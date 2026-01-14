---
name: archive
description: 归档阶段。当用户明确确认任务完成（Status = completed）时激活，负责归档 REQ 三件套和更新索引。
---

# Archive

## Outputs (must write)

- 更新：`.workflow/requirements/INDEX.md`（Status = completed, Current Phase = archive）
- 归档：将 REQ 三件套从 `in-progress/` 移动到 `completed/`

**输出规则（静默成功原则）**：
- 文件归档成功：静默，不输出确认信息（如"已归档 REQ-xxx"）
- 文件归档失败：输出错误信息
- 索引更新成功：静默，不输出确认信息

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

### 3) 可推进判据检查（review → archive）

在阶段切换前，必须检查可推进判据。参考 `docs/02-design/gate-protocol.md` 中的 `review → archive` 检查清单：

- review 文件已写入
- Blockers/High 已处理
- 审查结论明确
- 用户明确确认任务完成

**检查逻辑**：
- 判据满足时：内部检查，不输出检查清单，直接进入下一阶段
- 判据不满足时：输出完整检查清单，展示未满足项，提供选项（强制推进 / 回退 / 继续本阶段）

## 禁止

- 不在未确认任务完成时执行归档
- 不负责经验沉淀（经验沉淀在各阶段通过 EXP-CANDIDATE + subagent 完成）
- 不输出 experience 文件
