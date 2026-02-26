---
name: build
description: 执行构建（双模式：Plan-driven 或 Req-driven）
args:
  - name: taskId
    required: false
    description: 任务编号（如 001），省略时自动查找最新编号的任务
---

# /build - 执行构建

## 命令用途

用于按 req 文档实现功能，支持两种执行模式：

- **Plan-driven 模式**：有 plan 文档时，按计划结构化执行（推荐）
- **Req-driven 模式**：无 plan 文档时（跳过 /plan 环节），Agent 基于 req 自行决策执行

**定位**：该步骤虽然理论上不可跳过，但是创造者可以选择不调用 build 命令而自行基于 req 文档和可选的 plan 文档进行开发工作，因此从流程上将该步骤仍然可以跳过。

## 使用方式

```
/build [taskId]
```

- **指定 taskId**：构建指定任务
- **省略 taskId**：自动查找最新编号的任务

**示例**：

```
/build 001
```

## 产物

无直接产物（代码和测试脚本写入项目代码库）

有产物时在回复末尾给出下一步建议（格式与逻辑见 build-executor Skill）。

## 执行逻辑

本命令将执行逻辑委托给 `build-executor` Skill。详细执行流程请参考 `build-executor` Skill 文档（`.cursor/skills/build-executor/SKILL.md`）。
