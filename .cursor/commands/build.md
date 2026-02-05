---
name: build
description: 执行构建（双模式：Plan-driven 或 Agent-driven）
args:
  - name: taskId
    required: false
    description: 任务编号（如 001），省略时自动查找最新编号的任务
---

# /build - 执行构建

## 命令用途

用于按 req 文档实现功能，支持两种执行模式：

- **Plan-driven 模式**：有 plan 文档时，按计划结构化执行（推荐）
- **Agent-driven 模式**：无 plan 文档时，Agent 基于 req 自行决策执行

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

**输出规则（静默成功原则）**：

- 代码实现成功：静默，不输出确认信息
- 测试通过：静默，不输出测试结果
- 测试失败：输出失败详情和修复建议

## 执行逻辑

本命令将执行逻辑委托给 `build-executor` Skill，包括：

1. 模式检测（Plan-driven / Agent-driven）
2. Plan-driven 模式执行逻辑（有 plan 时）
3. Agent-driven 模式执行逻辑（无 plan 时）
4. 代码实现
5. 测试脚本编写
6. 测试执行（循环修复直到全部通过）
7. 文档同步

详细执行流程请参考 `build-executor` Skill 文档（`.cursor/skills/build-executor/SKILL.md`）。

## 记忆捕获

记忆写入由 **lingxi-memory** 子代理在独立上下文中执行；主对话在需要时通过**显式调用**（`/lingxi-memory mode=auto input=...` 或自然语言「使用 lingxi-memory 子代理将可沉淀内容写入记忆库」）交给子代理，本命令不包含捕获与写入逻辑。

**激活机制**：

- 任务完成或关键决策出现时，主 Agent 可使用**显式调用**：`/lingxi-memory mode=auto input=<本轮要点>` 或自然语言「使用 lingxi-memory 子代理将可沉淀内容写入记忆库」
- 候选在会话中展示，用户可选择沉淀

**触发场景**：当发生实现纠正、方案切换、根因定位、测试修复等情况时，会识别并捕获记忆候选；用户拒绝、纠正、排除（如不要/别用/改成…）时也识别并传入记忆候选。

Subagent 定义见 `.cursor/agents/lingxi-memory.md`。
