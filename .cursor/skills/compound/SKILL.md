---
name: compound
description: 此 Skill 围绕 REQ 做复利沉淀。当 review 完成且用户确认进入 compound，或 /flow 沉淀 ... 需要落盘候选经验时激活，从 plan/review 提取候选，冲突检测，写 experience 与索引（写入必须用户确认）。
---

# Compound

## Outputs (must write)

- `.workflow/context/experience/<tag>-<title>.md`
- `.workflow/context/experience/INDEX.md`
- 更新：`.workflow/requirements/INDEX.md`
- 按需：`.workflow/context/tech/services/<service-or-module>.md`

## Instructions

### 0) 入口与重复检查（强制）

- 执行前，`experience-index` 自动匹配历史经验，避免重复沉淀。
- 支持入口：review 结束后、用户 `/flow 沉淀 ...`、或阶段结束提示。

### 1) 提取候选（按优先顺序）

1. `.workflow/context/session/pending-compounding-candidates.json`（由 EXP-CANDIDATE + subagent 收集）
2. 如无暂存，再回溯 plan 的 Compounding Candidates / Worklog / review 复利候选

### 2) 写入必须确认（人工闸门）

未收到用户明确确认前，不得写入 `.workflow/context/experience/`。确认后调用 `experience-depositor` 执行落盘。

### 3) 冲突检测与落盘（委托 depositor + curator）

调用 `experience-depositor` 执行：

- 冲突 → deprecated 旧经验并记录替代关系
- 重复 → 合并或提示用户选择

> 提醒：沉淀不应只局限于“写经验文档”。对高频可自动判定的问题，优先沉淀为 hook/lint/CI；对重复流程，优先沉淀为 skill（或扩展现有 skill）；对“考古信息”，优先补齐 `.workflow/context/tech/services/` / `.workflow/context/business/`。

### 4) 索引推进

遵循 `index-manager` 的指引更新索引：

- 完成沉淀后可推进 Status = `completed`，Current Phase = `compound`

完成归档（建议自动化/强一致）：

- 当索引被推进到 `completed` 后，将该 REQ 的三件套（`.md/.plan.md/.review.md`）从 `requirements/in-progress/` 归档移动到 `requirements/completed/`
- 同步更新 `.workflow/requirements/INDEX.md` 的 `Links` 指向 `completed/`

> 轻量化：如果仅需落盘候选而不进入完整 compound，会话可直接 `/flow 沉淀` 触发 `experience-depositor`，compound 负责归档与索引推进。

