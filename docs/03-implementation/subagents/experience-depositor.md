# experience-depositor 实现

## 概述

`experience-depositor` 是前台子代理，负责将已暂存的经验候选正式写入经验库。

## 源码位置

`.cursor/agents/experience-depositor.md`

## 配置

```yaml
---
name: experience-depositor
description: 将已暂存的经验候选正式写入经验库。当用户通过 /remember ... 命令提取新经验时激活，或当用户直接输入编号选择候选经验（如 1,3）时激活。
model: inherit
is_background: false
---
```

### 关键配置

- **model: inherit**：继承主代理模型
- **is_background: false**：前台运行，需要用户交互

## 触发时机

- 用户通过 `/remember ...` 命令提取新经验
- 用户直接输入编号选择候选经验（如 `1,3` 或 `1 3`）

## 流程

### 1. 读取暂存

加载 `.workflow/context/session/pending-compounding-candidates.json`（若无则提示为空）。

### 2. 统一评估（阶段 2）

调用 `candidate-evaluator` Skill 对暂存的候选执行详细评估：

- 对阶段 1 的评估结果进行细化
- 详细评估可复用性（时间维度、空间维度、抽象层次）
- 详细评估沉淀载体适配性（推荐最适合的载体）

**输出**：完整的评估结果，包括各维度评估结果、推荐载体、理由、预期收益等。

### 3. 展示候选

按 stage/时间排序，展示候选及评估结果：

- 候选基本信息（trigger/decision/signal/solution/verify/pointers）
- 评估结果（各维度评估结果、推荐载体、理由、预期收益）

请求用户选择写入项（支持全选/部分/放弃）。

### 4. 用户选择

用户选择要沉淀的候选（支持编号选择，如 `1,3`）。

### 5. 冲突检测

读取 `.workflow/context/experience/INDEX.md`，对选择的候选检查：

- **触发条件相同/相似，且解决方案矛盾** → 冲突：旧经验标记 deprecated，新经验记录替代关系
- **触发条件相近且解决方案相同/相似** → 重复：默认合并（或请求用户确认合并策略）

### 6. 调用 curator 方案模式

如果检测到需要治理（合并/取代），调用 `experience-curator` 的**方案模式**：

- 生成治理方案（建议的合并/取代动作，不执行）
- 评估新经验与现有经验的关系，智能判断合并/取代/保持独立
- 输出治理方案（动作/理由/影响），供用户确认

### 7. 展示治理方案

向用户展示治理方案，请求用户确认或调整。

### 8. 用户确认治理方案

等待用户确认或调整治理方案。

### 9. 调用 curator 执行模式

用户确认后，调用 `experience-curator` 的**执行模式**：

- 备份 INDEX → `INDEX.md.bak`
- 执行治理动作（合并/取代/保持独立）
- 建立 `Replaces/ReplacedBy` 追溯关系，更新 INDEX（Scope/Strength 取更优值）
- 输出变更报告（动作/理由/影响/回滚命令）

### 10. 写入

根据用户选择的存储目标和推荐载体，写入对应位置：

- **如果选择 experience**：按模板写入 `.workflow/context/experience/<tag>-<title>.md`，更新 INDEX
- **如果选择 rules**：调用 `rules-creator` skill，创建或更新 `.cursor/rules/qs-{type}-{scope}/RULE.md`
- **如果选择其他载体**：按对应载体的写入规范执行

**经验模板必须包含**：

- 触发条件（When to load）
- 问题现象（Symptom）
- 根因（Root cause）
- 解决方案（Fix）
- 校验方式（How to verify）
- 关联指针（Pointers）
- **Decision Shape**（必须）
- **Judgment Capsule**（必须）

**索引写入要求**：

- `Trigger (when to load)`：用于工程检索（关键词/场景）
- `Surface signal`：表层信号（让我应该警觉的味道）
- `Hidden risk`：隐含风险（真正会炸的点）

**注意**：治理已在步骤 9 执行，此处只需写入文件即可。

### 11. 清理

从暂存中移除已处理项；未写入项保留。

## 关键改进

1. **评估前置**：评估在展示候选之前执行，避免用户选择后再被过滤
2. **治理方案确认**：治理方案在写入前展示并确认，用户可预览和调整治理动作
3. **统一评估机制**：使用 `candidate-evaluator` Skill 统一评估，替代分散的成长过滤器和沉淀分流逻辑

## 约束

- **必须征得用户确认后才写入 experience**
- **经验必须包含 Decision Shape 与 Judgment Capsule**（若缺失需补齐后再写入）
- **输出结构化、简洁，避免冗长叙述**

## 参考

- [知识沉淀机制：确认沉淀流程](../02-design/knowledge-compounding.md#确认沉淀流程)
- [候选评估机制设计](../02-design/candidate-evaluation.md)
- [candidate-evaluator Skill](../../.cursor/skills/candidate-evaluator/SKILL.md)
- [经验治理机制设计](../02-design/experience-governance.md)
- [experience-collector 实现](./experience-collector.md)
