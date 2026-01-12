---
name: audit
description: 审查 Requirement 的可执行性与风险（输出到对话，不落盘），支持多次循环，产出明确的推进判据与待澄清项。
---

# Audit

## When to Use

- `/flow REQ-xxx` 在进入 plan 前反复审查

## Outputs

- 审查报告：仅输出到对话（不保存文档）

## Instructions

### 0) Experience Index（强制）

先调用 skill `experience-index`，输出与该需求相关的历史坑/风险提醒。

### 1) 审查维度

- 技术风险（可行性初判、依赖风险、架构影响）
- 业务风险（目标是否清晰、边界是否明确、异常与降级是否覆盖）
- 执行风险（信息完整性、可测试性、时间/协作风险）

### 2) 阻塞项处理（Fail Fast）

若发现 Blockers，必须提示用户选择：

- 立即回到 req 补齐（推荐）
- 或继续输出审查报告但标注“不可进入 plan”

### 3) 输出结构（建议）

```text
# Requirement 审查报告：<REQ-xxx>

## 1. 执行风险总结
- 技术风险：高/中/低（原因）
- 业务风险：高/中/低（原因）
- 执行风险：高/中/低（原因）

## 2. 需求完整性分析
- Blockers（必须补齐）
- High / Medium / Low（建议项）

## 3. 总体评估
- 可执行性评分：1-5
- 是否可以开始 plan：是/否（给出判据）

## 4. 下一步建议（人工闸门）
A) 再 audit 一次
B) 回到 req 补齐
C) 进入 plan（需你确认）
```

