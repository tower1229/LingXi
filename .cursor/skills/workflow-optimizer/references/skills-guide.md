# Skills 技术指南

## 概述

基于 Agent Skills 官方规范和 Cursor 文档的 Skills 功能用法和最佳实践。

## 设计目标（官方定义）

- 可移植、受版本控制的包，用于**教会 Agent 如何执行特定领域的任务**
- Agent 会根据上下文决定何时使用（基于 description 匹配）
- 扩展 AI Agent 的专业能力和专业知识

## 能力边界（官方定义）

### 技术特性

- **平台要求**：需要 **Cursor Nightly** 版本，Agent Skills 功能在 Nightly 渠道可用
- **自动发现**：从 `.cursor/skills/` 或 `~/.cursor/skills/` 加载
- **Agent 自动匹配**：根据 description 判断何时使用
- **手动调用**：在对话中输入 `/` 搜索技能名称

### 适用场景（官方建议）

- ✅ **特定领域的知识和工作流**
- ✅ **阶段 Playbook**
- ✅ **专业知识**：需要特定领域的知识和工作流
- ❌ **不适合**：需要独立上下文窗口的长时间任务（应用 Subagents）

### 限制（官方定义）

- 需要明确的 description 以便 Agent 匹配
- 不应过长（保持精炼）
- 与主 Agent 共享上下文窗口
- 需要 Nightly 版本支持

## 目录结构（官方规范）

```
skill-name/
├── SKILL.md          # 必需：主技能文件
├── references/       # 可选：参考文档
│   ├── guide-1.md
│   └── guide-2.md
├── scripts/          # 可选：可执行脚本
│   └── script.sh
└── assets/           # 可选：静态资源
    └── template.md
```

## SKILL.md 格式（官方规范）

**Frontmatter**（必需）：

```yaml
---
name: skill-name
description: 此 Skill 的用途描述，用于 Agent 自动匹配。当...时激活。
---
```

**Body**（必需）：

- 工作流程
- 执行步骤
- 原则和约束
- 使用场景
- 注意事项

### description 字段（重要）

**重要性**：description 是 Agent 自动匹配的关键。

**写法**：

- 明确激活条件："当...时激活"
- 描述用途和场景
- 避免过于宽泛或过于狭窄

## 选择指南（基于能力边界）

### Skill vs Command

**选择 Skill**：

- 需要详细的工作流指导
- 需要专业知识和工作流
- 需要 Agent 自动匹配激活

**选择 Command**：

- 单一用途、可重复的操作
- 需要简单的用户入口

### Skill vs Rule

**选择 Skill**：

- 需要详细的工作流指导
- 需要 Agent 自动匹配

**选择 Rule**：

- 需要系统级约束（持久化、可重用）
- 需要作用于提示级别
- 需要 Always Apply（全局硬约束）

### Skill vs Subagent

**选择 Skill**：

- 不需要独立上下文窗口
- 可以一次性完成
- 不需要并行执行
- 与主 Agent 共享上下文效率更高

**选择 Subagent**：

- 需要独立上下文窗口
- 长时间的研究类任务
- 需要并行运行多个工作流
- 需要静默处理，不干扰主对话

**性能考虑**：

- **Skill**：共享上下文，无额外开销
- **Subagent**：独立上下文，启动开销和 Token 消耗更高（并行运行 5 个子代理 ≈ 单个 agent 约 5 倍的 tokens）

### Skill vs Hook

**选择 Skill**：

- 需要 AI 推理和判断
- 需要专业知识和工作流
- 需要用户交互

**选择 Hook**：

- 纯脚本执行（无需 AI 推理）
- 自动化、门控、审计
- 低开销（脚本执行快速）

## 最佳实践（官方建议）

1. **渐进式披露（Progressive Disclosure）**：SKILL.md 保持精炼，详细内容放在 `references/` 目录，按需加载
2. **description 编写**：明确激活条件和用途，便于 Agent 自动匹配
3. **保持精炼**：SKILL.md 应该精炼（建议 < 500 行），详细内容放入 references/

## 参考

- Agent Skills 官方规范：`https://agentskills.io/`
- Cursor Skills 官方文档：`https://cursor.com/cn/docs/context/skills`
- Cursor 能力分析：`docs/05-development/research/cursor-capabilities-analysis.md`
