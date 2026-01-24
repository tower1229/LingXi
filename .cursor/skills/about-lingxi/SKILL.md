---
name: about-lingxi
description: 当需要了解灵犀的背景知识、架构设计、核心机制，需要对 workflow 进行调优、需要了解 workflow 各组件的设计原则（commands/skills/hooks）、需要判断应该使用哪种机制实现功能、或需要对方案进行长期收益/代价评估时自动激活。提供灵犀的核心价值指引、架构概览、关键机制、设计原则、评价准则和调优指导，帮助 agent 快速理解灵犀并做出正确的设计决策。
---

# About LingXi

## 定位

此 Skill 帮助 agent 快速了解灵犀（LingXi）的背景知识、架构设计和核心机制。当需要对灵犀 workflow 做出改动、进行调优、或评估方案时，提供完整的评价准则、调优流程和设计指导。

**功能覆盖**：
- 快速了解灵犀的背景知识和架构
- 对 workflow 进行调优和价值判定
- 组件选择决策（Commands/Skills/Hooks）
- 架构调优和性能优化
- 工程实践评估和质量检查

## 使用场景

### 场景 1：快速了解灵犀

**触发条件**：
- Agent 需要了解灵犀是什么、如何工作
- 新接触灵犀项目，需要快速建立认知
- 需要理解灵犀的架构和机制

**流程**：
1. 加载核心价值指引（`references/core-values.md`）
2. 加载架构概览（`references/architecture.md`）
3. 加载关键机制说明（`references/memory-system.md`）
4. 输出灵犀的核心信息摘要

### 场景 2：设计新功能或改动

**触发条件**：
- 需要对灵犀添加新功能
- 需要修改现有机制
- 需要选择使用哪种组件（Command/Skill/Hook）

**流程**：
1. 理解改动需求（目标、涉及组件、实现方式）
2. 加载相关背景知识（核心价值、架构、设计原则）
3. 加载评价准则（`references/evaluation-criteria.md`）
4. 加载组件指南（`references/component-guides.md`）
5. 进行价值对齐分析（是否符合核心价值）
6. 进行架构合理性分析（是否符合设计原则）
7. **文档同步检查**：判断改动是否影响灵犀的架构、组件、工作流或机制，如果是，提醒需要同步更新 `about-lingxi` 中的相关文档（`SKILL.md` 或 `references/` 目录下的对应文档）
8. 输出评估结果和改进建议

### 场景 3：组件选择决策

**触发条件**：
- 需要选择使用 Command、Skill 还是 Hook
- 不确定应该用哪种机制实现功能

**流程**：
1. 理解功能需求（单一操作 vs 工作流 vs 自动化）
2. 加载组件指南（`references/component-guides.md`）
3. 根据官方能力边界和灵犀的设计原则判断
4. 检查是否符合核心价值指引（Why 和 How）
5. 输出推荐方案及理由

### 场景 4：架构调优

**触发条件**：
- 需要优化某个阶段的执行效率
- 需要分析性能瓶颈和优化空间

**流程**：
1. 理解当前架构（涉及哪些组件）
2. 加载相关指南（技术能力边界、工程实践准则）
3. 分析性能瓶颈和优化空间
4. 基于核心价值指引评估长期收益
5. 输出优化建议和检查清单

### 场景 5：价值判定

**触发条件**：
- 需要判断方案是否符合灵犀的长期规划
- 需要评估方案与核心价值的一致性

**流程**：
1. 加载核心价值指引（Why 和 How）
2. 分析方案与核心价值的一致性
3. 输出价值判定结果

### 场景 6：技术边界检查

**触发条件**：
- 需要检查改动是否符合 Cursor 的技术能力边界

**流程**：
1. 理解改动内容（涉及哪些组件）
2. 加载相关指南（官方能力边界）
3. 检查是否符合官方定义的适用场景和限制
4. 输出技术边界检查结果

### 场景 7：工程实践评估

**触发条件**：
- 需要评估设计是否符合工程实践准则

**流程**：
1. 理解设计方案（涉及哪些组件和机制）
2. 加载工程实践准则（`references/engineering-practices.md`）
3. 应用相关准则进行检查（SSoT、SoC、DRY、KISS 等）
4. 使用质量评估框架评估（可维护性、可扩展性等）
5. 识别权衡和取舍
6. 输出工程实践评估结果和改进建议

### 场景 8：综合质量评估

**触发条件**：
- 需要全面评估调优方案的质量

**流程**：
1. 理解调优方案（目标、涉及组件、实现方式）
2. 加载所有相关指南（价值指引、技术边界、工程实践）
3. 进行价值对齐分析（Why 和 How）
4. 进行架构取舍分析（技术能力边界、组件选择）
5. 进行工程实践评估（核心原则、设计模式、质量维度）
6. 综合权衡分析
7. 输出全面的质量评估报告和改进建议

## 背景知识结构

### 1. 核心价值指引

**文件**：`references/core-values.md`

**内容**：
- Why（远景）：为创造者打造 AI 时代的专属法宝
- How（路径）：心有灵犀、AI Native、称心如意
- What（实现）：可伸缩工作流、质量资产化、知识整合、人工门控、上下文运营、开箱即用
- 价值判定标准

**何时加载**：所有场景都需要，这是所有设计决策的终极目标

### 2. 架构概览

**文件**：`references/architecture.md`

**内容**：
- Commands（命令入口）
- Skills（执行逻辑）
- 经验沉淀机制
- Hooks
- 目录结构

**何时加载**：场景 1、场景 2（涉及架构改动时）

### 3. 记忆系统机制

**文件**：`references/memory-system.md`

**内容**：
- 记忆捕获流程（memory-capture）
- 记忆治理与写入（memory-curator）
- 每轮检索与最小注入（memory-retrieve + Always Apply Rule）
- 统一索引格式（INDEX.md + notes/ 扁平结构）

**何时加载**：场景 1、场景 2（涉及记忆系统改动时）

### 4. 设计原则

**文件**：`references/design-principles.md`

**内容**：
- AI Native 设计原则
- 心有灵犀的实现方式
- 称心如意的体验要求
- 静默成功原则
- 上下文组织原则

**何时加载**：场景 2（设计新功能或改动时）

### 5. 评价准则

**文件**：`references/evaluation-criteria.md`

**内容**：
- 价值对齐检查（心有灵犀、AI Native、称心如意）
- 架构合理性检查（组件选择、职责分离）
- 工程实践检查（SSoT、SoC、DRY、KISS 等）
- 质量维度评估

**何时加载**：场景 2（需要对改动进行评估时）

### 6. 组件指南

**文件**：`references/component-guides.md`

**内容**：
- Commands 指南（能力边界、适用场景）
- Skills 指南（能力边界、适用场景）
- Hooks 指南（能力边界、适用场景）
- Subagents 指南（能力边界、适用场景）
- Rules 指南（能力边界、适用场景，仅作参考）
- 选择决策矩阵

**何时加载**：场景 2、场景 3（需要选择组件时）

### 7. 工程实践准则

**文件**：`references/engineering-practices.md`

**内容**：
- 核心原则（SSoT、SoC、DRY、KISS、YAGNI、Fail Fast 等）
- 设计模式与最佳实践（分层架构、约定优于配置、渐进式增强等）
- 质量评估框架（可维护性、可扩展性、可测试性等维度）
- 权衡考虑和评估流程

**何时加载**：场景 2、场景 7、场景 8（需要工程实践评估时）

### 8. 调优检查清单

**文件**：`references/optimization-checklist.md`

**内容**：
- 价值对齐检查（基于 Why 和 How）
- 技术能力边界检查（基于官方定义）
- 工程实践准则检查（核心原则、设计模式、质量评估框架）

**何时加载**：场景 2、场景 4、场景 8（需要调优检查时）

## 工作流程

### 快速了解流程

1. **识别需求**：判断是快速了解还是设计改动
2. **按需加载**：根据需求加载相关 reference 文件
3. **输出摘要**：提供灵犀的核心信息摘要

### 设计改动/调优流程

1. **理解需求**：明确调优目标、涉及组件、实现方式
   - **调优目标**：性能优化、功能扩展、架构调整还是体验改进？
   - **问题域**：涉及哪个/哪些组件（Commands、Skills、Rules、Hooks）？

2. **加载背景知识**：根据调优需求，按需加载相关指南
   - 核心价值指引（Why 和 How）
   - 技术能力边界（Commands、Skills、Rules、Hooks 指南）
   - 工程实践准则（核心原则、设计模式、质量评估框架）

3. **价值对齐分析**：基于核心价值指引（Why 和 How），分析调优方案的价值对齐
   - 心有灵犀：是否有助于经验沉淀和复用？
   - AI Native：是否尊重 AI 作为能力源泉？是否过度约束 AI？
   - 称心如意：是否降低认知负担？是否提供友好体验？

4. **架构取舍分析**：基于技术能力边界，分析调优方案的架构合理性
   - 组件选择：是否符合官方定义的适用场景？
   - 性能权衡：评估性能、可维护性、可复用性等维度

5. **工程实践评估**：基于公认的工程实践准则，评估调优方案的工程设计质量
   - 核心原则检查（SSoT、SoC、DRY、KISS、YAGNI 等）
   - 设计模式与最佳实践检查
   - 质量维度评估（可维护性、可扩展性、可测试性等）

6. **文档同步检查**：判断改动是否影响灵犀的架构、组件、工作流或机制
   - 如果改动涉及 Commands、Skills、Rules、Hooks 的增减或职责变更，需要同步更新 `references/architecture.md` 和 `references/component-guides.md`
   - 如果改动涉及记忆系统机制，需要同步更新 `references/memory-system.md`
   - 如果改动涉及设计原则或评价准则，需要同步更新 `references/design-principles.md` 或 `references/evaluation-criteria.md`
   - 如果改动涉及核心价值或实现方式，需要同步更新 `references/core-values.md`
   - 如果改动涉及工作流程或使用场景，需要同步更新 `SKILL.md` 中的相关场景描述
   - 提醒用户需要同步更新相关文档，确保 `about-lingxi` 始终反映灵犀的最新状态

7. **调优建议输出**：基于分析，输出
   - 价值对齐评估
   - 架构合理性评估
   - 工程实践评估
   - 文档同步提醒（如适用）
   - 改进建议：优化方向、潜在风险、具体改进措施
   - 检查清单：参考 `references/optimization-checklist.md`

## 输出格式

### 快速了解输出

```
## 灵犀核心信息

### 核心价值
- Why：为创造者打造 AI 时代的专属法宝
- How：心有灵犀（持久化记忆，让 AI 按你的方式做事）、AI Native（尊重 AI 能力，预留进化空间）、称心如意（降低认知负担，提供友好体验）
- What：可伸缩工作流、质量资产化、知识整合、人工门控、上下文运营、开箱即用

### 架构概览
[简要说明 Commands、Skills、经验系统等]

### 关键机制
[简要说明经验沉淀、经验匹配等]

详细内容请参考 references/ 目录下的相关文档。
```

### 设计改动评估输出

```
## 改动评估

### 价值对齐
- ✅/⚠️/❌ 心有灵犀：[评估结果]
- ✅/⚠️/❌ AI Native：[评估结果]
- ✅/⚠️/❌ 称心如意：[评估结果]

### 架构合理性
- ✅/⚠️/❌ 组件选择：[评估结果]
- ✅/⚠️/❌ 职责分离：[评估结果]

### 工程实践
- ✅/⚠️/❌ [核心原则检查结果]

### 改进建议
[具体改进措施]
```

## 注意事项

1. **基于官方定义**：组件选择基于 Cursor 官方文档明确的能力边界
2. **价值对齐优先**：所有设计决策都应首先考虑是否符合核心价值指引（Why 和 How）
3. **工程实践指导**：使用公认的工程实践准则评估设计方案质量
4. **权衡分析**：识别可能的权衡和取舍，根据项目阶段和实际需求做出合理决策
5. **按需加载**：根据调优需求按需加载相关指南，避免不必要的上下文占用
6. **AI Native 原则**：充分利用大模型的自然语言理解能力，避免硬编码规则
7. **静默成功**：遵循"没有消息就是好消息"的原则，减少冗余输出
8. **渐进式披露**：SKILL.md 保持精炼，详细内容放在 references/ 目录
9. **文档同步责任**：当对灵犀 workflow 做出改动时（新增/修改 Commands、Skills、Rules、Hooks，调整架构、工作流或机制），需要同步更新 `about-lingxi` 中的相关文档，确保文档始终反映灵犀的最新状态。根据改动内容，判断需要更新哪些文档：
   - 架构变更 → `references/architecture.md`
   - 组件变更 → `references/architecture.md` 和 `references/component-guides.md`
   - 记忆系统变更 → `references/memory-system.md`
   - 设计原则变更 → `references/design-principles.md`
   - 评价准则变更 → `references/evaluation-criteria.md`
   - 核心价值变更 → `references/core-values.md`
   - 工作流程变更 → `SKILL.md` 中的相关场景描述

## 参考资料

### 核心文档
- `README.md`：核心价值指引（Why 和 How）
- `docs/design/architecture.md`：核心组件架构
- `docs/prd/lingxi-2.0-refactor.md`：2.0 重构方案

### Reference 文件
- `references/core-values.md`：核心价值指引（Why 和 How）
- `references/architecture.md`：架构概览
- `references/memory-system.md`：记忆系统机制
- `references/design-principles.md`：设计原则
- `references/evaluation-criteria.md`：评价准则
- `references/component-guides.md`：组件指南（Commands、Skills、Rules、Hooks，Subagents 作为技术参考）
- `references/engineering-practices.md`：工程实践准则（核心原则、设计模式、质量评估框架）
- `references/optimization-checklist.md`：调优检查清单（价值对齐、技术边界、工程实践）

### 外部参考

以下外部文档提供 Cursor 官方能力边界与 Agent Skills 规范的实时信息。当需要了解最新细节、验证能力边界或确认官方定义时，可通过这些 URL 获取实时文档内容。**注意**：主要信息应优先参考本 skill 内 `references/` 目录下的文档；外部参考仅作补充与验证来源。

**Cursor 官方文档**（能力边界与适用场景）：
- Commands: https://cursor.com/docs/context/commands
- Skills: https://cursor.com/docs/context/skills
- Hooks: https://cursor.com/docs/context/hooks
- Subagents: https://cursor.com/docs/context/subagents
- Rules: https://cursor.com/docs/context/rules

**Agent Skills 官方规范**（Skills 设计规范）：
- 主页与概述: https://agentskills.io
- 完整规范: https://agentskills.io/specification

**使用建议**：
- 当 `references/component-guides.md` 不足以判断能力边界时，可访问上述 URL 获取官方最新定义
- 当需验证 Skills 设计是否符合官方规范时，可参考 Agent Skills 规范文档
- 模型可通过 `mcp_web_fetch` 等工具直接获取这些文档的实时内容
