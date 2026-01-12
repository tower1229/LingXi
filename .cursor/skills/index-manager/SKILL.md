---
name: index-manager
description: 维护 .workflow/requirements/INDEX.md 为 SSoT：创建/计划/审查/完成时更新状态与链接，Fail Fast 检查缺失/漂移。
---

# Index Manager

## When to Use

- 任何 REQ 产物变更（创建/计划/审查/完成）后
- 进入 `/flow REQ-xxx` 时做一次 Fail Fast：索引与文件一致性检查

## Instructions

把 `.workflow/requirements/INDEX.md` 作为单一事实来源（SSoT），每行至少包含：

| ID | Title | Status | Current Phase | Next Action | Blockers | Links |

Fail Fast 规则：

- `in-progress/` 或 `completed/` 里存在 `REQ-xxx` 文件但索引缺行：必须补齐
- 索引有 `REQ-xxx` 但文件不存在：必须指出并修复（创建缺失文件或修正索引）

