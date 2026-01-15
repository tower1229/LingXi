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

### 3) 阶段完成输出

归档完成后输出：`✅ archive 完成 | 任务已归档`

### 4) 入口判据检查（review → archive，进入前执行）

进入 archive 前，检查以下判据：

| 判据 | 验证方式 |
|------|---------|
| review 文件已写入 | `REQ-xxx.review.md` 存在且非空 |
| Blockers/High 已处理 | Blockers 必须处理，High 可处理或明确拒绝 |
| 审查结论明确 | 包含明确结论（通过/需修复/拒绝） |
| 用户明确确认任务完成 | 用户已确认 |

**检查逻辑**：满足 → 静默进入执行归档；不满足 → 输出检查清单，提供选项

## 禁止

- 不在未确认任务完成时执行归档
- 不负责经验沉淀（经验沉淀在各阶段通过 EXP-CANDIDATE + subagent 完成）
- 不输出 experience 文件
