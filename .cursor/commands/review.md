---
name: review
description: 审查交付（产出：001.review.<标题>.md，不存档）
args:
  - name: taskId
    required: false
    description: 任务编号（如 001），省略时自动查找最新编号的任务
---

# /review - 审查交付

## 命令用途

Review 是工作流的关键质量保证环节，通过多维度审查确保交付物符合要求。

## 使用方式

```
/review [taskId]
```

- **指定 taskId**：审查指定任务的交付
- **省略 taskId**：自动查找最新编号的任务

**示例**：

```
/review 001
```

## 依赖的 Agent Skills

以下 Skills 会自动激活：

- `review-executor`：执行多维度审查和交付质量保证

以下 Reviewer Skills 会根据语义分析结果选择性启用（由 review-executor 显式调用）：

- `reviewer-doc-consistency`：文档一致性审查（由 review-executor 显式调用，始终启用）
- `reviewer-security`：安全审查（由 review-executor 显式调用，基于需求/实现语义判断启用）
- `reviewer-performance`：性能审查（由 review-executor 显式调用，基于需求/实现语义判断启用）
- `reviewer-e2e`：端到端测试审查（由 review-executor 显式调用，基于需求/实现语义判断启用）

## 产物

- `.cursor/.lingxi/tasks/<taskId>.review.<标题>.md`（审查总结报告，**不存档**）

有产物时在回复末尾给出下一步建议（格式与逻辑见 review-executor Skill）。

## 执行逻辑

本命令将执行逻辑委托给 `review-executor` Skill。详细执行流程请参考 `review-executor` Skill 文档（`.cursor/skills/review-executor/SKILL.md`）。
