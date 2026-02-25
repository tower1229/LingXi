---
name: req
description: 创建任务文档（产出：001.req.<标题>.md）
args:
  - name: description
    required: true
    description: 需求描述
---

# /req - 创建任务文档

## 命令用途

创建一个完整的"任务文档"，这是整个流程的核心。高质量的 req 文档是保证任务最终效果的前提。Req 必须超越普通 PRD 文档的范畴，除了需求提纯和放大之外，还必须定好核心技术方案或技术决策。这不是一份传统意义上产品经理向技术团队提出的需求说明，而是一个顶尖创造者脑海中迸发的集设计灵感、产品构思、实现途径于一体的任务文档。

## 使用方式

```
/req <需求描述>
```

**任务编号自动生成**：通过脚本 `next-task-id.mjs` 获取下一个编号（001～999），由 req-executor 调用。

**标题自动生成**：从需求描述中提取核心关键词作为标题，最多 10 个中文字符或 20 个英文字符，特殊字符自动替换为下划线。

## 产物

- `.cursor/.lingxi/tasks/001.req.<标题>.md`（任务文档）

有产物时在回复末尾给出下一步建议（格式与逻辑见 req-executor Skill）。

## 执行逻辑

本命令将执行逻辑委托给 `req-executor` Skill。详细执行流程请参考 `req-executor` Skill 文档（`.cursor/skills/req-executor/SKILL.md`）。

## 记忆

记忆写入与沉淀约定由 sessionStart 注入，不在此重复；子代理定义见 `.cursor/agents/lingxi-memory.md`。
