---
name: plan
description: 生成任务规划（产出：001.plan.<标题>.md + 001.testcase.<标题>.md）
args:
  - name: taskId
    required: false
    description: 任务编号（如 001），省略时自动查找最新编号的任务
---

# /plan - 任务规划

## 命令用途

基于 req 文档中的需求做进一步的任务规划，通过澄清细节问题，规划具体的执行步骤等，辅助提高任务执行质量。

**定位**：该步骤可跳过，仅复杂任务建议在 build 之前执行规划。取决于使用者对任务复杂度以及 agent 的执行能力的判断。

## 使用方式

```
/plan [taskId]
```

- **指定 taskId**：基于指定任务的 req 文档生成规划
- **省略 taskId**：自动查找最新编号的任务

**示例**：

```
/plan 001
```

命令会自动查找 `.cursor/.lingxi/tasks/001.req.*.md` 文件。

## 产物

- `.cursor/.lingxi/tasks/001.plan.<标题>.md`（任务规划文档）
- `.cursor/.lingxi/tasks/001.testcase.<标题>.md`（测试用例文档）

有产物时在回复末尾给出下一步建议（格式与逻辑见 plan-executor Skill）。

## 执行逻辑

本命令将执行逻辑委托给 `plan-executor` Skill。详细执行流程请参考 `plan-executor` Skill 文档（`.cursor/skills/plan-executor/SKILL.md`）。
