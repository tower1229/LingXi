---
name: plan
description: 基于 Requirement 生成可执行计划（任务拆解+验证方式+交付物），落盘 REQ.plan.md 并更新 INDEX。
---

# Plan

## When to Use

- req 完成且用户确认进入 plan

## Outputs (must write)

- `.workflow/requirements/in-progress/REQ-xxx.plan.md`
- `.workflow/requirements/INDEX.md`

## Instructions

### 0) Experience Index（强制）

先调用 skill `experience-index`。

### 1) 读取输入

- `.workflow/requirements/in-progress/REQ-xxx.md`

### 1.1) （可选但推荐）补齐服务上下文

如果该需求涉及存量系统/多服务协作，先调用 skill `service-loader`：

- 生成/更新 `.workflow/context/tech/services/<service>.md`
- 只写“概要 + 指针 + 常见坑”，避免长文档膨胀

### 2) plan 模板（必须可勾选、可复现验证）

```markdown
# <REQ-xxx> Plan

## 目标回放（1-3 行）

## 状态摘要（Status Summary）
- **当前阶段**：plan
- **进度**：0/X
- **当前任务**：无
- **阻塞项**：无
- **上次更新**：{DATE}

## 交付物（Deliverables）
- [ ] 代码变更：...
- [ ] 验证记录：...

## 任务清单（Tasks）
- [ ] ...

## 验证方式（Validation）
- [ ] 自动化测试/脚本/手工步骤（必须可复现）

## 执行记录（Worklog）
- YYYY-MM-DD: ...

## 复利候选（Compounding Candidates）
- [ ] （候选）...
```

### 3) 更新索引（SSoT）

调用 skill `index-manager`：

- Status：`planned`
- Current Phase：`plan`
- Links：补充 plan 路径

