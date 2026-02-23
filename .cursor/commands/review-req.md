---
name: review-req
description: 审查 req 文档（可选，可多次执行）
args:
  - name: taskId
    required: false
    description: 任务编号（如 001），省略时自动查找最新编号的任务
---

# /review-req - 审查 req 文档

## 命令用途

对 req 文档展开 review，用于辅助提升 req 文档的质量。该步骤可省略，也可以多次执行，完全取决于使用者。

**定位**：这是一个质量提升工具，不是强制环节。用户可以在任意时候使用此命令审查 req 文档，发现潜在问题并提出改进建议。

## 前置要求

- req 文档已存在：`.cursor/.lingxi/tasks/<taskId>.req.*.md`

## 使用方式

```
/review-req [taskId]
```

- **指定 taskId**：审查指定任务的 req 文档
- **省略 taskId**：自动查找最新编号的任务

**示例**：

```
/review-req 001
```

命令会自动查找 `.cursor/.lingxi/tasks/001.req.*.md` 文件。

## 产物

**不产出文件**，仅输出审查结果和建议到对话中。

有产物时在回复末尾给出下一步建议（格式与逻辑见 review-req-executor Skill）。

## 执行逻辑

本命令将执行逻辑委托给 `review-req-executor` Skill。详细执行流程请参考 `review-req-executor` Skill 文档（`.cursor/skills/review-req-executor/SKILL.md`）。审查维度与边界详见该 Skill。
