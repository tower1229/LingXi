---
name: plan
description: 生成任务规划（产出：001.plan.<标题>.md + 001.testcase.<标题>.md）
args:
  - name: taskId
    required: true
    description: 任务编号（如 001）
---

# /plan - 任务规划

## 命令用途

基于 req 文档中的需求做进一步的任务规划，通过澄清细节问题，规划具体的执行步骤等，辅助提高任务执行质量。

**定位**：该步骤可跳过，仅复杂任务建议在 build 之前执行规划。取决于使用者对任务复杂度以及 agent 的执行能力的判断。

## 使用方式

```
/plan <taskId>
```

**示例**：

```
/plan 001
```

命令会自动查找 `.cursor/.lingxi/requirements/001.req.*.md` 文件。

## 依赖的 Agent Skills

以下 Skills 会自动激活：

- `plan-executor`：执行任务规划、测试设计和文档生成
- `memory-retrieve`：每轮回答前检索并最小注入（由 Always Apply Rule 强保证触发）
- `memory-capture`：统一记忆捕获（尽力而为触发）

## 产物

- `.cursor/.lingxi/requirements/001.plan.<标题>.md`（任务规划文档）
- `.cursor/.lingxi/requirements/001.testcase.<标题>.md`（测试用例文档）

**输出规则（静默成功原则）**：

- 文件写入成功：静默，不输出确认信息
- 文件写入失败：输出错误信息

## 执行逻辑

本命令将执行逻辑委托给 `plan-executor` Skill，包括：

1. 理解 req 文档内容并生成 plan 所需内容
2. 代码库分析（复杂需求）
3. 服务上下文补齐（推荐）
4. 澄清性问题（复杂需求）
5. 外部知识放大（推荐）
6. 任务拆解
7. 测试设计
8. 测试框架检测与安装
9. 文档生成（plan + testcase）

详细执行流程请参考 `plan-executor` Skill 文档（`.cursor/skills/plan-executor/SKILL.md`）。

## 记忆捕获

记忆捕获由 `memory-capture` Skill 统一处理。

**激活机制**：
- 任务完成或关键决策出现时，尽力触发 `memory-capture`
- `memory-capture` 扫描对话上下文，识别记忆信号并生成候选
- 候选在会话中展示，用户可选择沉淀

**触发场景**：当发生任务调整、依赖变更、技术选型、测试策略变更等情况时，会识别并捕获记忆候选。

详细触发场景和激活机制请参考 `memory-capture` Skill 文档。

