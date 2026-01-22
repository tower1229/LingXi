# Rules 技术指南

> **注意**：本文档描述 Cursor 官方的 Rules 功能。**灵犀不使用 Cursor Rules 机制**，所有质量资产统一通过 Experience 系统（团队级标准/经验和项目级经验）管理。本文档仅作为技术参考，用于了解 Cursor Rules 的能力边界。

## 概述

基于 Cursor 官方文档的 Rules 功能用法和最佳实践。

## 设计目标（官方定义）

- 提供**系统级指令**，在提示级别提供持久、可重用的上下文
- 将提示词、脚本等内容打包，便于在团队内管理和共享工作流
- 支持从对话中生成规则（`/Generate Cursor Rules` 命令）

## 能力边界（官方定义）

### 存储位置

1. **Project Rules**（`.cursor/rules/`）
   - 存储在项目目录中，版本控制
   - 作用于当前代码库

2. **User Rules**（Cursor 设置）
   - 在 Cursor 设置中全局定义
   - 跨项目应用

3. **AGENTS.md**（项目根目录）
   - 作为 `.cursor/rules/` 的简化替代方案

### 应用类型（官方定义）

1. **Always Apply**（始终应用）
   - 应用于每个聊天会话
   - **必须极精炼**（< 50 行，总计 < 150 行）

2. **Apply Intelligently**（智能应用）
   - Agent 根据描述判断相关时应用

3. **Apply to Specific Files**（文件匹配）
   - 文件匹配指定模式时应用（globs）

4. **Apply Manually**（手动应用）
   - 在对话中被 @ 提及时应用

### 限制（官方定义）

- 应控制在 500 行以内
- 应聚焦、可操作、范围明确
- Always Apply 规则必须极精炼（< 50 行，总计 < 150 行）
- Project Rules 可以分层组织，支持嵌套规则

### 适用场景（官方建议）

- ✅ **沉淀与代码库相关的领域知识**
- ✅ **自动化项目特定的工作流或模板**
- ✅ **统一风格或架构决策**
- ❌ **不适合**：单一用途的简单任务（应用 Commands）

## 选择指南（基于能力边界）

### Rule vs Skill

**选择 Rule**：

- 需要系统级约束（持久化、可重用）
- 需要作用于提示级别
- 需要 Always Apply（全局硬约束）
- 需要沉淀领域知识

**选择 Skill**：

- 需要详细的工作流指导
- 需要专业知识和工作流
- 需要 Agent 自动匹配激活

### Rule vs Command

**选择 Rule**：

- 需要系统级约束
- 需要持久化、可重用

**选择 Command**：

- 需要用户触发的工作流
- 单一用途的操作

## 最佳实践（官方建议）

1. **精炼聚焦**：规则应该精炼、聚焦、可操作
2. **Always Apply 限制**：必须极精炼（< 50 行）
3. **使用指针**：指向详细文档，而不是复制大段内容

## 参考

- Cursor Rules 官方文档：`https://cursor.com/cn/docs/context/rules`
- Cursor 能力分析：`docs/05-development/research/cursor-capabilities-analysis.md`
