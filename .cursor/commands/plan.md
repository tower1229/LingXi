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

## 产物

- `.cursor/.lingxi/requirements/001.plan.<标题>.md`（任务规划文档）
- `.cursor/.lingxi/requirements/001.testcase.<标题>.md`（测试用例文档）

**输出规则（静默成功原则）**：

- 文件写入成功：静默，不输出确认信息
- 文件写入失败：输出错误信息

## 执行逻辑

本命令将执行逻辑委托给 `plan-executor` Skill。详细执行流程请参考 `plan-executor` Skill 文档（`.cursor/skills/plan-executor/SKILL.md`）。

## 记忆捕获

记忆写入由 **lingxi-memory** 子代理在独立上下文中执行；主对话在需要时通过**显式调用**（`/lingxi-memory mode=auto input=...` 或自然语言「使用 lingxi-memory 子代理将可沉淀内容写入记忆库」）交给子代理，本命令不包含捕获与写入逻辑。

**激活机制**：

- 任务完成或关键决策出现时，主 Agent 可使用**显式调用**：`/lingxi-memory mode=auto input=<本轮要点>` 或自然语言「使用 lingxi-memory 子代理将可沉淀内容写入记忆库」
- 候选在会话中展示，用户可选择沉淀

**触发场景**：当发生任务调整、依赖变更、技术选型、测试策略变更等情况时，会识别并捕获记忆候选；用户拒绝、纠正、排除（如不要/别用/改成…）时也识别并传入记忆候选。

Subagent 定义见 `.cursor/agents/lingxi-memory.md`。
