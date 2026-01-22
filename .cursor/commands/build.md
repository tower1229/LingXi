---
name: build
description: 执行构建（双模式：Plan-driven 或 Agent-driven）
args:
  - name: taskId
    required: true
    description: 任务编号（如 001）
---

# /build - 执行构建

## 命令用途

用于按 req 文档实现功能，支持两种执行模式：

- **Plan-driven 模式**：有 plan 文档时，按计划结构化执行（推荐）
- **Agent-driven 模式**：无 plan 文档时，Agent 基于 req 自行决策执行

**定位**：该步骤虽然理论上不可跳过，但是创造者可以选择不调用 build 命令而自行基于 req 文档和可选的 plan 文档进行开发工作，因此从流程上将该步骤仍然可以跳过。

## 使用方式

```
/build <taskId>
```

**示例**：

```
/build 001
```

## 依赖的 Agent Skills

以下 Skills 会自动激活：

- `build-executor`：执行代码实现、测试编写和执行
- `memory-index`：自动匹配历史记忆提醒
- `experience-capture`：统一经验捕获（通过 Cursor Skill 自动匹配机制激活）
- `service-loader`：如适用，生成服务上下文

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

## 经验捕获

经验捕获由 `experience-capture` Skill 统一处理。

**激活机制**：
- 通过 Cursor 的 Skill 自动匹配机制自动激活
- 如果自动激活失败，经验捕获会静默跳过，可通过 `/remember` 命令手动沉淀经验

**触发场景**：当发生实现纠正、方案切换、根因定位、测试修复等情况时，会自动捕获经验候选。

详细触发场景和激活机制请参考 `experience-capture` Skill 文档。

