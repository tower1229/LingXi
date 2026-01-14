# cursor-workflow 文档系统

> 面向维护者的完整技术文档，从设计理念到实现细节的全面覆盖。

## 文档导航

本文档系统采用分层架构，从顶层概念到具体实现，帮助维护者深入理解项目的方方面面。

### 📚 顶层概念层（01-concepts/）

理解项目的设计理念、架构设计和核心原则：

- **[设计理念与核心价值](01-concepts/philosophy.md)**：为什么需要项目级成长能力、Context Engineering、Compounding Engineering 等核心理念
- **[架构概览](01-concepts/architecture-overview.md)**：分层架构、组件职责、数据流、控制流
- **[核心原则与约束](01-concepts/key-principles.md)**：Single Entrypoint、Human Gates、Confirm-only Knowledge Capture 等核心约束

### 🎨 设计层（02-design/）

深入理解各子系统的设计决策：

- **[工作流生命周期设计](02-design/workflow-lifecycle.md)**：阶段定义、状态机设计、推进协议、产物模型
- **[知识沉淀机制设计](02-design/knowledge-compounding.md)**：即时捕获、成长过滤器、沉淀分流、Decision Shape 与 Judgment Capsule
- **[经验治理机制设计](02-design/experience-governance.md)**：合并/取代规则、谱系管理、自动治理流程、质量准则提炼
- **[数据模型定义](02-design/data-models.md)**：Requirements Index、Experience Index、Plan 账本、Quality Standards
- **[关键设计决策记录](02-design/decision-log.md)**：为什么选择 Skills-first、为什么移除 after-agent-response hook 等

### 🔧 实现层（03-implementation/）

了解各组件的具体实现细节：

#### Commands
- **[flow 命令实现](03-implementation/commands/flow-command.md)**：输入解析、状态机路由、沉淀确认、质量准则采纳
- **[remember 命令实现](03-implementation/commands/remember-command.md)**：对话历史提取、成长过滤器、冲突检测

#### Skills
- **[阶段 Skills](03-implementation/skills/stage-skills/)**：req、plan、audit、work、review、archive 各阶段的实现细节
- **[底座 Skills](03-implementation/skills/foundation-skills/)**：index-manager、plan-manager、experience-index、experience-curator、experience-depositor
- **[工具 Skills](03-implementation/skills/utility-skills/)**：service-loader、context-engineering、rules-creator

#### Subagents
- **[experience-collector](03-implementation/subagents/experience-collector.md)**：EXP-CANDIDATE 解析、成长过滤器、暂存机制
- **[experience-depositor](03-implementation/subagents/experience-depositor.md)**：候选展示、冲突检测、经验写入、curator 触发

#### Hooks
- **[Hook 系统架构](03-implementation/hooks/hook-system.md)**：注册机制、执行时机、与主流程的交互
- **[各 Hook 实现细节](03-implementation/hooks/individual-hooks.md)**：before-submit-prompt、stop、audit-after-shell-execution

#### Rules
- **[规则系统设计](03-implementation/rules/rule-system.md)**：Rule 类型、Scope 定义、索引机制、创建流程

### 🛠️ 维护层（04-maintenance/）

扩展和维护指南：

- **[扩展指南](04-maintenance/extension-guide.md)**：如何新增阶段、Skill、Rule、Hook
- **[故障排查](04-maintenance/troubleshooting.md)**：常见问题、调试技巧、恢复机制
- **[最佳实践](04-maintenance/best-practices.md)**：经验编写、Skill 设计、Rule 设计、上下文管理
- **[迁移指南](04-maintenance/migration-guide.md)**：版本升级、数据迁移、配置迁移

### 📋 开发管理（05-development/）

项目开发过程中的任务、调查和分析文档：

- **[开发管理说明](05-development/README.md)**：目录结构和使用指南
- **[调查备忘](05-development/research/)**：技术调研、架构评估、问题分析文档
  - [远景纲领：保护创造者的判断力、品味与责任感](05-development/research/vision-analysis.md)（项目长期纲领）
  - [Cursor 底层能力分析与架构评估](05-development/research/cursor-capabilities-analysis.md)
- **[开发任务](05-development/tasks/)**：具体的开发任务和 issue（待补充）

## 快速开始

### 新维护者入门路径

1. **理解核心理念**：阅读 [设计理念](01-concepts/philosophy.md) 和 [架构概览](01-concepts/architecture-overview.md)
2. **掌握核心原则**：阅读 [核心原则与约束](01-concepts/key-principles.md)
3. **理解工作流**：阅读 [工作流生命周期设计](02-design/workflow-lifecycle.md)
4. **深入机制**：阅读 [知识沉淀机制](02-design/knowledge-compounding.md) 和 [经验治理机制](02-design/experience-governance.md)
5. **查看实现**：根据需要查看 [实现层文档](03-implementation/)

### 按需查找

- **想了解某个阶段如何工作**：查看 [工作流生命周期设计](02-design/workflow-lifecycle.md) 和对应的 [阶段 Skills](03-implementation/skills/stage-skills/)
- **想了解经验如何沉淀**：查看 [知识沉淀机制设计](02-design/knowledge-compounding.md) 和 [experience-depositor 实现](03-implementation/subagents/experience-depositor.md)
- **想了解经验如何治理**：查看 [经验治理机制设计](02-design/experience-governance.md) 和 [experience-curator 实现](03-implementation/skills/foundation-skills/experience-curator.md)
- **想扩展系统**：查看 [扩展指南](04-maintenance/extension-guide.md)
- **遇到问题**：查看 [故障排查](04-maintenance/troubleshooting.md)

## 文档维护

- 文档与代码同步更新
- 重大设计变更需更新 `02-design/decision-log.md`
- 新增组件需补充对应文档
- 文档使用 Markdown 格式，架构图使用 Mermaid

## 相关资源

- **项目 README**：[../README.md](../README.md)
- **设计文档**：[cursor-workflow-design.md](cursor-workflow-design.md)（原始设计文档，逐步迁移到本文档系统）
- **源码位置**：
  - Commands: `.cursor/commands/`
  - Skills: `.cursor/skills/`
  - Subagents: `.cursor/agents/`
  - Hooks: `.cursor/hooks/`
  - Rules: `.cursor/rules/`
