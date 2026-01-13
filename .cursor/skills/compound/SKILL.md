---
name: compound
description: 围绕 REQ 做复利沉淀：从 plan/review 提取候选，冲突检测，写 experience 与索引；写入必须用户确认。
---

# Compound

## When to Use

- review 完成且用户确认进入 compound
- 或 `/flow 沉淀 ...` 需要落盘候选经验时

## Outputs (must write)

- `.workflow/context/experience/<tag>-<title>.md`
- `.workflow/context/experience/INDEX.md`
- 更新：`.workflow/requirements/INDEX.md`
- 按需：`.workflow/context/tech/services/<service-or-module>.md`

## Instructions

### 0) 先检查重复（强制）

执行前，`experience-index` 会自动匹配历史经验，避免重复沉淀同类经验。

### 1) 提取候选（优先顺序）

1. plan 的 Compounding Candidates
2. plan Worklog（返工/排查/关键决策/验证）
3. review 的复利候选

### 2) 写入必须确认

未收到用户明确确认前，不得写入 `.workflow/context/experience/`。

### 3) 冲突检测与落盘

遵循 `experience-depositor` 的指引进行冲突检测：

- 冲突 → deprecated 旧经验并记录替代关系
- 重复 → 合并或提示用户选择

> 提醒：沉淀不应只局限于“写经验文档”。对高频可自动判定的问题，优先沉淀为 hook/lint/CI；对重复流程，优先沉淀为 skill（或扩展现有 skill）；对“考古信息”，优先补齐 `.workflow/context/tech/services/` / `.workflow/context/business/`。

### 4) 索引推进

遵循 `index-manager` 的指引更新索引：

- 完成沉淀后可推进 Status = `completed`，Current Phase = `compound`

完成归档（建议自动化/强一致）：

- 当索引被推进到 `completed` 后，将该 REQ 的三件套（`.md/.plan.md/.review.md`）从 `requirements/in-progress/` 归档移动到 `requirements/completed/`
- 同步更新 `.workflow/requirements/INDEX.md` 的 `Links` 指向 `completed/`

