---
name: about-lingxi
description: 当需要了解灵犀的背景知识、架构设计、核心机制，需要对 workflow 进行调优、需要了解 workflow 各组件的设计原则（commands/skills/hooks）、需要判断应该使用哪种机制实现功能、或需要对方案进行长期收益/代价评估时自动激活。提供灵犀的核心价值指引、架构概览、关键机制、设计原则、评价准则和调优指导，帮助 agent 快速理解灵犀并做出正确的设计决策。
---

# About LingXi

## 定位

帮助 agent 快速了解灵犀（LingXi）的背景、架构与核心机制；在对 workflow 做改动、调优或方案评估时，提供价值对齐、架构合理性与工程实践评估依据。

## 何时使用

- 快速了解灵犀是什么、如何工作
- 设计新功能或改动（含组件选择 Command/Skill/Hook）
- 架构调优、价值判定、技术边界检查、工程实践评估
- 综合质量评估（价值 + 架构 + 工程实践）

**使用方式**：按场景按需加载 `references/` 下对应文档；快速了解时加载 core-values、architecture、memory-system 并输出摘要；设计改动/调优时加载评价准则、组件指南、工程实践等，做价值对齐与文档同步检查后输出评估与改进建议。

## References 定位

**详细流程、背景知识结构、输出格式与注意事项均在 `references/` 目录。** 需要深度调优、设计决策或完整检查清单时再按需读取；日常使用以本短说明为准，避免首屏信息过载。

- 核心价值与架构：`references/core-values.md`、`references/architecture.md`、`references/memory-system.md`
- 设计原则与评价：`references/design-principles.md`、`references/evaluation-criteria.md`
- 组件与工程实践：`references/component-guides.md`、`references/engineering-practices.md`、`references/optimization-checklist.md`
- 工具与外部规范：`references/cursor-agent-tools.md`、`references/cursor-learn-courses-summary.md`；外部 URL 见 references 内说明
