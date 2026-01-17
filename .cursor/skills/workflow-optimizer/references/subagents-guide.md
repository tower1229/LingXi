# Subagents 技术指南

## 概述

基于 Cursor 官方文档的 Subagents 功能用法和最佳实践。

## 设计目标（官方定义）

- 专门 AI 助手，可以**委派任务**
- 每个子代理都有**独立的上下文窗口**
- 可以**并行执行**工作

## 能力边界（官方定义）

### 技术特性

- **目录结构**：
  - 子代理定义存储在 `.cursor/agents/` 或 `.cursor/subagents/` 目录中
  - 每个子代理是一个 Markdown 文件，包含 YAML frontmatter 配置
- **独立上下文**：每个子代理有独立的上下文窗口
- **并行执行**：多个子代理可以并行运行
- **自动匹配**：Agent 根据 description 字段自动匹配调用

### 配置格式（官方定义）

```markdown
---
name: subagent-name
description: 子代理的用途描述，用于 Agent 自动匹配
model: fast | inherit | <model-id>
is_background: true | false
---

# 子代理的详细指令和职责说明
```

### 配置字段（官方定义）

- **`name`**：子代理的唯一标识符
- **`description`**：子代理的用途描述，Agent 会根据此描述判断何时调用
- **`model`**：
  - `fast`：使用快速模型，适合简单任务
  - `inherit`：继承主 Agent 的模型
  - 或指定具体的模型 ID
- **`is_background`**：
  - `true`：后台模式，立即返回，不阻塞主对话
  - `false`：前台模式，阻塞直到完成，立即返回结果

### 适用场景（官方建议）

- ✅ **长时间的研究类任务**（隔离上下文）
- ✅ **需要并行运行多个工作流**
- ✅ **任务在多个步骤中需要专业领域知识**
- ✅ **对工作结果进行独立验证**
- ✅ **需要静默处理，不干扰主对话的任务**

### 不适合的场景（官方建议）

- ❌ **单一用途的简单任务**（应用 Commands 或 Skills）
- ❌ **可以一次性完成的任务**（应用 Skills）

### 限制（官方定义）

- **启动开销**：每个子代理需要单独收集自己的上下文
- **Token 消耗**：多个上下文同时运行，消耗更高
- **延迟**：对于简单任务可能比主代理更慢
- **并行运行 5 个子代理 ≈ 单个 agent 约 5 倍的 tokens**

### 状态说明（官方）

- **开发状态**：截至 2025 年 12 月，Subagents 功能仍在开发中
- **可用性**：功能可能已在部分版本中可用，但完整功能和官方文档仍在完善中
- **注意事项**：某些版本的 Cursor IDE 可能会自动移除 YAML frontmatter，可能影响自定义子代理的功能

## 选择指南（基于能力边界）

### Subagent vs Skill

**选择 Subagent**：

- 需要独立上下文窗口
- 长时间的研究类任务
- 需要并行运行多个工作流
- 需要静默处理，不干扰主对话

**选择 Skill**：

- 不需要独立上下文窗口
- 可以一次性完成
- 不需要并行执行
- 与主 Agent 共享上下文效率更高

**性能考虑**：

- **Skill**：共享上下文，无额外开销
- **Subagent**：独立上下文，启动开销和 Token 消耗更高（并行运行 5 个子代理 ≈ 单个 agent 约 5 倍的 tokens）

### Subagent vs Hook

**选择 Subagent**：

- 需要 AI 推理和判断
- 需要独立上下文窗口
- 需要长时间运行的任务

**选择 Hook**：

- 纯脚本执行（无需 AI 推理）
- 需要拦截或观察 agent 行为
- 需要自动化（如格式化、归档）

### Subagent vs Command

**选择 Subagent**：

- 需要 AI 推理和判断
- 需要独立上下文窗口
- 需要长时间运行的任务

**选择 Command**：

- 简单、可重复的操作
- 不需要独立上下文窗口

## 最佳实践（官方建议）

1. **上下文隔离**：需要独立上下文时使用 Subagent，而不是 Skill
2. **后台 vs 前台**：根据任务特性选择后台或前台模式
3. **模型选择**：根据任务复杂度选择合适的模型
4. **性能权衡**：权衡独立上下文的收益和开销

## 参考

- Cursor Subagents 官方文档：`https://cursor.com/cn/docs/context/subagents`
- Cursor 能力分析：`docs/05-development/research/cursor-capabilities-analysis.md`
