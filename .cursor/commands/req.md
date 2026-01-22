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

**任务编号自动生成**：命令会自动扫描 `.cursor/.lingxi/requirements/` 目录，提取所有 `*.req.*.md` 文件的编号，取最大编号+1，从 001 开始。

**标题自动生成**：从需求描述中提取核心关键词作为标题，最多 10 个中文字符或 20 个英文字符，特殊字符自动替换为下划线。

## 依赖的 Agent Skills

以下 Skills 会自动激活：

- `req-executor`：执行需求分析、提纯、放大和文档生成
- `memory-index`：自动匹配历史记忆提醒
- `experience-capture`：统一经验捕获（由 stop hook 触发）
- `service-loader`：如适用，生成服务上下文

## 产物

- `.cursor/.lingxi/requirements/001.req.<标题>.md`（任务文档）

**输出规则（静默成功原则）**：

- 文件写入成功：静默，不输出确认信息
- 文件写入失败：输出错误信息

## 执行逻辑

本命令将执行逻辑委托给 `req-executor` Skill，包括：

1. 项目上下文分析
2. 任务编号和标题生成
3. 需求提纯（5W1H、隐含意图挖掘、用户确认）
4. 类型识别与复杂度评估
5. 需求放大（外部调研、方案对比、最佳实践融入）
6. 记忆融入（通过 memory-index）
7. 模板选择
8. 文档生成

详细执行流程请参考 `req-executor` Skill 文档（`.cursor/skills/req-executor/SKILL.md`）。

## 经验捕获

经验捕获由 `experience-capture` Skill 统一处理，无需在命令中显式调用。

**激活机制**：
- 任务完成时，由 stop hook 引导调用 `experience-capture` skill
- `experience-capture` 扫描整个对话历史，识别经验信号并生成候选
- 候选在会话中展示，用户可选择沉淀

**触发场景**：当发生以下情况时，`experience-capture` 会识别并捕获经验候选：

- 需求固化、范围调整、优先级变更
- 目标纠正、方案选择、约束添加
- 边界明确、验收调整、风险确认

详细触发场景和激活机制请参考 `experience-capture` Skill 文档。

