---
name: Documentation System AI Native Refactoring
overview: 基于AI native作为核心原则之一，对文档系统进行完整重构，包括结构重组、内容规划、编写规范制定和现有文档改写，确保文档系统充分体现AI native设计原则。
todos:
  - id: upgrade-core-principles
    content: 升级核心原则文档，将AI native作为第7条核心原则
    status: pending
  - id: create-ai-native-guide
    content: 创建AI native设计指南文档（docs/01-concepts/ai-native-design.md）
    status: pending
  - id: refactor-experience-governance
    content: 改写experience-governance.md，移除硬编码规则
    status: pending
  - id: refactor-gate-protocol
    content: 改写gate-protocol.md，改为质量评估指导
    status: pending
  - id: refactor-flow-command
    content: 改写flow-command.md，移除if-else伪代码
    status: pending
  - id: refactor-workflow-lifecycle
    content: 改写workflow-lifecycle.md，移除硬编码优先级
    status: pending
  - id: reorganize-design-dir
    content: 重组docs/02-design/目录结构
    status: pending
  - id: create-doc-guide
    content: 创建文档编写规范文档（docs/04-maintenance/documentation-guide.md）
    status: pending
  - id: update-navigation
    content: 更新文档导航（00-README.md和README.md）
    status: pending
isProject: false
---

# 文档系统 AI Native 重构方案

## 目标

将 AI native 原则作为核心原则之一，重构整个文档系统，确保：

1. 文档结构清晰体现 AI native 原则的地位
2. 文档内容遵循 AI native 编写规范
3. 移除所有违反 AI native 原则的硬编码规则描述
4. 建立文档编写规范，指导未来文档创作

## 一、文档结构重构

### 1.1 核心原则文档升级

**文件**：`docs/01-concepts/key-principles.md`

**改动**：

- 将 AI native 原则提升为核心原则之一，与 Single Entrypoint、Human Gates 等并列
- 新增第 7 条核心原则：**AI Native Design（AI 原生设计）**

**新增内容结构**：

```markdown
### 7. AI Native Design（AI 原生设计）

**原则**：充分利用大模型的自然语言理解能力，避免硬编码规则匹配。

**为什么**：

- **灵活性**：大模型能理解多种表达方式，无需枚举所有场景
- **可维护性**：自然语言描述比硬编码规则更易维护
- **适应性**：能处理未预见的场景，而非依赖规则覆盖

**实现**：

- **自然语言描述**：用清晰的自然语言描述处理策略和期望行为
- **智能判断**：让大模型根据上下文和意图自动选择合适的处理方式
- **避免硬编码**：避免关键词列表、正则表达式、复杂的 if-else 逻辑
- **示例驱动**：用示例场景说明期望行为，而非枚举所有规则

**禁止**：

- 不允许硬编码关键词列表和模式匹配规则
- 不允许使用数值阈值（如"≥ 60%"）作为判断标准
- 不允许机械的优先级排序（如"优先级 1-2-3"）

**参考**：

- [AI Native 设计原则](../../.workflow/context/experience/ai-native-design.md)
- [各 Skills 实现](../03-implementation/skills/)
```

### 1.2 新增 AI Native 设计指南文档

**文件**：`docs/01-concepts/ai-native-design.md`（新建）

**内容**：

- 从`.workflow/context/experience/ai-native-design.md`迁移并扩展
- 增加更多设计示例和反模式
- 增加文档编写中的应用指南

### 1.3 设计文档目录重组

**当前结构**：`docs/02-design/`（扁平结构）

**新结构**：

```
docs/02-design/
├── core-mechanisms/          # 核心机制设计
│   ├── workflow-lifecycle.md
│   ├── knowledge-compounding.md
│   ├── experience-governance.md
│   └── gate-protocol.md
├── data-models/              # 数据模型
│   └── data-models.md
├── design-patterns/          # 设计模式
│   ├── trade-off-record.md
│   ├── semantics-capsule.md
│   └── decision-log.md
└── optimizations/            # 优化记录
    ├── workflow-optimization-silent-success.md
    ├── workflow-optimization-review.md
    └── noise-filter.md
```

**理由**：更清晰的组织结构，便于查找和维护

## 二、内容规划重构

### 2.1 需要改写的文档清单

#### 高优先级（违反 AI native 原则）

1. **docs/02-design/experience-governance.md**

   - 问题：包含硬编码优先级规则和数值阈值（≥ 60%）
   - 改动：改为 AI native 的自然语言描述
   - 参考：已完成的`.cursor/skills/experience-curator/SKILL.md`改进

2. **docs/02-design/gate-protocol.md**

   - 问题：包含程序化的检查清单和数值阈值（≥ 3）
   - 改动：改为质量评估指导，而非机械检查清单
   - 参考：已完成的`.cursor/skills/flow-router/references/gate-protocol.md`改进

3. **docs/03-implementation/commands/flow-command.md**

   - 问题：包含 if-else 式的解析逻辑伪代码
   - 改动：改为自然语言描述意图识别策略

4. **docs/03-implementation/skills/foundation-skills/experience-curator.md**

   - 问题：包含硬编码优先级规则
   - 改动：与 SKILL.md 保持一致，改为 AI native 描述

#### 中优先级（需要补充 AI native 说明）

5. **docs/01-concepts/philosophy.md**

   - 改动：在"Skills-first 设计"章节后新增"AI Native 设计"章节

6. **docs/01-concepts/architecture-overview.md**

   - 改动：在架构说明中强调 AI native 原则的应用

7. **docs/02-design/workflow-lifecycle.md**

   - 问题：包含"状态来源优先级"的硬编码描述
   - 改动：改为灵活的综合判断描述

#### 低优先级（需要微调）

8. **docs/02-design/data-models.md**

   - 问题：包含"优先级"描述（如`broad > medium > narrow`）
   - 改动：改为"通常优先级"或"推荐顺序"的表述

9. **docs/04-maintenance/extension-guide.md**

   - 改动：新增"如何设计 AI native 的 Skill/Command"章节

### 2.2 需要新增的文档

1. **docs/01-concepts/ai-native-design.md**（新建）

   - AI native 设计原则详解
   - 设计示例和反模式
   - 文档编写中的应用

2. **docs/04-maintenance/documentation-guide.md**（新建）

   - 文档编写规范
   - AI native 文档编写指南
   - 文档维护流程

## 三、文档编写规范制定

### 3.1 AI Native 文档编写原则

#### 原则 1：自然语言优先

**✅ 正确示例**：

```markdown
评估新经验与现有经验的关系，综合考虑以下信号：

- Tag 完全相同 → 明确表示同一主题的升级版本
- Decision being made 高度相似 → 可能是同一判断单元的完善
- Trigger 关键词大量重叠 → 可能是重复内容
```

**❌ 错误示例**：

```markdown
按以下优先级判断：

1. Tag 相同 → 必定合并
2. Decision 相同 → 候选合并
3. Trigger 重叠 ≥60% → 候选合并
```

#### 原则 2：避免硬编码规则

**✅ 正确示例**：

```markdown
综合判断当前阶段的完成质量：

- 核心产物是否完整
- 关键信息是否齐全
- 质量是否达标

整体达标时静默推进，发现问题时展示具体缺陷。
```

**❌ 错误示例**：

```markdown
检查以下判据：

1. 文件已写入 → 检查文件存在性
2. 内容完整 → 检查必需字段
3. 所有判据满足 → IF true THEN 推进 ELSE 展示清单
```

#### 原则 3：示例驱动而非规则枚举

**✅ 正确示例**：

```markdown
**示例场景**：

- 场景 1：Tag 相同的新旧经验 → 通常需要合并
- 场景 2：Decision 相似但视角不同 → 可能保持独立
- 场景 3：Trigger 有部分重叠 → 根据信息完整度判断
```

**❌ 错误示例**：

```markdown
**规则列表**：

- 规则 1：Tag 相同 → 合并
- 规则 2：Decision 相同 → 合并
- 规则 3：Trigger 重叠 ≥60% → 合并
```

#### 原则 4：描述策略而非步骤

**✅ 正确示例**：

```markdown
根据用户输入的自然语言意图，自动选择合适的处理方式：

- 如果输入是直接经验表达，从输入中提取并结构化
- 如果输入指向历史对话，从对话历史中提取
- 如果输入是混合的，分别处理各部分
```

**❌ 错误示例**：

```markdown
解析逻辑：
if (包含"刚才") {
历史提取模式
} else if (包含直接经验) {
直接提取模式
} else {
提示词定位模式
}
```

### 3.2 文档结构规范

#### 标准文档结构

```markdown
# 文档标题

## 概述

（1-2 段，说明文档目的和范围）

## 设计原则（如适用）

（列出遵循的核心原则，包括 AI native）

## 核心概念

（关键概念的自然语言描述）

## 设计策略（AI Native）

（用自然语言描述处理策略，而非硬编码规则）

## 示例场景

（用示例说明期望行为）

## 实现要点

（关键实现细节，避免程序化描述）

## 参考

（相关文档和资源）
```

### 3.3 术语和表达规范

#### 推荐表达

| 旧表达 | 新表达（AI Native） |

| ------------------------ | ------------------------------- |

| 按优先级 1-2-3 检查 | 综合考虑多个信息源，优先采用... |

| 如果 X≥Y 则 Z | 当 X 达到 Y 程度时，通常需要 Z |

| 规则 1：... 规则 2：... | 考虑以下信号：... |

| 必须检查所有判据 | 评估整体质量，关注... |

| IF condition THEN action | 根据实际情况，灵活判断... |

## 四、实施计划

### 阶段 1：核心原则升级（1-2 天）

1. 更新`docs/01-concepts/key-principles.md`，新增 AI native 原则
2. 创建`docs/01-concepts/ai-native-design.md`
3. 更新`docs/01-concepts/philosophy.md`，补充 AI native 章节

### 阶段 2：设计文档改写（2-3 天）

1. 改写`docs/02-design/experience-governance.md`
2. 改写`docs/02-design/gate-protocol.md`
3. 改写`docs/02-design/workflow-lifecycle.md`
4. 重组`docs/02-design/`目录结构

### 阶段 3：实现文档改写（2-3 天）

1. 改写`docs/03-implementation/commands/flow-command.md`
2. 改写`docs/03-implementation/skills/foundation-skills/experience-curator.md`
3. 检查其他实现文档，微调表达

### 阶段 4：规范文档创建（1 天）

1. 创建`docs/04-maintenance/documentation-guide.md`
2. 更新`docs/04-maintenance/extension-guide.md`，新增 AI native 设计章节

### 阶段 5：文档导航更新（0.5 天）

1. 更新`docs/00-README.md`，反映新结构
2. 更新`README.md`，补充 AI native 原则说明

## 五、验证标准

### 5.1 内容验证

- [ ] 所有文档不再包含硬编码优先级规则
- [ ] 所有文档不再包含数值阈值判断（如 ≥60%、≥3）
- [ ] 所有文档不再包含 if-else 式的程序化逻辑
- [ ] AI native 原则在所有相关文档中都有体现

### 5.2 结构验证

- [ ] 文档结构清晰，易于查找
- [ ] 核心原则文档包含 AI native
- [ ] 设计文档遵循 AI native 编写规范

### 5.3 一致性验证

- [ ] 文档描述与代码实现（Skills）保持一致
- [ ] 文档之间相互引用正确
- [ ] 术语使用统一

## 六、风险与对策

### 风险 1：文档改写可能遗漏某些细节

**对策**：

- 建立检查清单，逐项验证
- 对比改写前后的关键信息，确保不丢失

### 风险 2：改写后的文档可能不够具体

**对策**：

- 保留必要的技术细节
- 用示例补充说明
- 提供参考实现链接

### 风险 3：文档结构重组可能影响现有链接

**对策**：

- 更新所有内部链接
- 在 README 中提供迁移指南
- 保留旧路径的临时重定向说明（如需要）

## 七、后续维护

### 7.1 文档审查机制

- 新增文档必须遵循 AI native 编写规范
- 定期审查现有文档，确保符合规范
- 在 PR 审查中检查文档是否符合 AI native 原则

### 7.2 文档更新流程

1. 代码改动时，同步更新相关文档
2. 设计变更时，更新设计文档和决策记录
3. 新增功能时，遵循文档编写规范

### 7.3 文档质量保证

- 文档编写规范作为必须遵循的标准
- 定期 review 文档质量
- 收集反馈，持续改进规范
