# experience-collector 实现

## 概述

`experience-collector` 是后台子代理，负责在阶段执行过程中即时出现的 EXP-CANDIDATE 输出后，静默处理并暂存候选，避免干扰主对话。

## 源码位置

`.cursor/agents/experience-collector.md`

## 配置

```yaml
---
name: experience-collector
description: 在阶段执行过程中即时出现 EXP-CANDIDATE 时自动调用，静默处理并暂存候选，避免干扰主对话。Use proactively when detecting EXP-CANDIDATE comments in agent responses.
model: fast
is_background: true
---
```

### 关键配置

- **model: fast**：使用快速模型，减少延迟
- **is_background: true**：后台运行，不干扰主对话

## 职责

1. **解析候选**：从最新消息中读取 `<!-- EXP-CANDIDATE {...} -->` JSON，保留原字段（stage/trigger/decision/...）
2. **统一评估**：调用 `candidate-evaluator` Skill 执行阶段 1 评估（自动评估），包括结构完整性、判断结构质量、可复用性和沉淀载体适配性评估
3. **根据评估结果决定是否暂存**：不通过的候选过滤，通过的候选暂存并记录评估结果
4. **最小上下文包**：合并调用方提供的高信号上下文（REQ id/title/一行描述、stage、行为/验收摘要、关键决策、指针列表），与候选 JSON 和评估结果一起存入暂存区
5. **暂存**：写入或合并到 `.workflow/context/session/pending-compounding-candidates.json`，避免重复，保留时间戳、来源 stage 和评估结果
6. **不写入经验，不触发 curator，不向用户提问**；仅在必要时简短确认已接收

## 处理流程

### 1. 解析 EXP-CANDIDATE

从最新消息中提取 HTML 注释包裹的 JSON：

```html
<!-- EXP-CANDIDATE
{
  "stage": "work",
  "trigger": "...",
  "decision": "...",
  ...
}
-->
```

解析 JSON，保留所有原字段。

### 2. 统一评估（阶段 1）

调用 `candidate-evaluator` Skill 执行自动评估：

1. **结构完整性评估**：检查必要字段（decision/alternatives/signal/solution/verify）
2. **判断结构质量评估**：评估是否包含"如何判断"的结构，而非"做了什么"的步骤
3. **可复用性评估**（初步）：评估时间维度、空间维度、抽象层次
4. **沉淀载体适配性评估**（初步）：推荐最适合的载体

**评估结果处理**：
- 如果结构完整性或判断结构质量不通过 → 过滤，记录 `filterReason`，不暂存
- 如果通过但边界模糊（`requiresHumanJudgment: true`）→ 暂存，标记需要人工判断
- 如果通过 → 暂存，记录评估结果（`evaluation` 字段）

**特点**：
- 静默处理，只过滤明显不通过的候选
- 边界模糊的候选仍暂存，由用户最终判断（保护品味）

### 3. 最小上下文包

合并以下高信号上下文：

- REQ id/title/一行描述
- stage（来源阶段）
- 行为/验收摘要
- 关键决策
- 指针列表

与候选 JSON 一起存入暂存区。

### 4. 暂存

写入或合并到 `.workflow/context/session/pending-compounding-candidates.json`：

- **避免重复**：检查是否已存在相同候选
- **保留时间戳**：记录捕获时间
- **保留来源 stage**：记录来源阶段（使用 `sourceStage` 字段）
- **保留评估结果**：记录阶段 1 的评估结果（`evaluation` 字段）

### 5. 输出

- **静默或一行确认**：不要展开长说明
- **不写入经验**：只暂存，等待用户确认
- **不触发 curator**：只收集，不治理
- **不向用户提问**：静默处理

## 暂存文件格式

`.workflow/context/session/pending-compounding-candidates.json`：

```json
{
  "asked": false,
  "candidates": [
    {
      "stage": "work",
      "trigger": "当发现 root cause 并更换方案",
      "decision": "实现/修复/接口/边界的取舍",
      "alternatives": ["原方案A（放弃，因为...）"],
      "signal": "判断依据/风险信号/失败证据",
      "solution": "新的实现/修复方案",
      "verify": "测试/验证步骤与结果期望",
      "pointers": ["path/to/file"],
      "notes": "可选补充",
      "timestamp": "2026-01-12T10:00:00Z",
      "sourceStage": "work",
      "source": {
        "req": "REQ-001",
        "stage": "work"
      },
      "evaluation": {
        "structuralIntegrity": { "passed": true, "missingFields": [], "reason": "" },
        "decisionShapeQuality": { "passed": true, "reason": "" },
        "reusability": {
          "temporalDimension": { "passed": true, "score": 0.9, "reason": "" },
          "spatialDimension": { "passed": true, "score": 0.8, "reason": "" },
          "abstractionLevel": { "passed": true, "score": 0.85, "reason": "" },
          "overall": "high",
          "confidence": 0.85
        },
        "depositionTarget": {
          "recommended": ["experience"],
          "alternatives": ["session"],
          "reason": "",
          "expectedBenefit": ""
        },
        "requiresHumanJudgment": false,
        "filterReason": ""
      }
    }
  ]
}
```

**字段说明**：
- `sourceStage`：候选来源阶段（统一使用此字段标识来源，而非 `source.stage`）
- `evaluation`：阶段 1 的评估结果，包含各维度评估结果、推荐载体、理由等

## 触发机制

- **自动触发**：当检测到 EXP-CANDIDATE 注释时自动调用
- **后台运行**：不干扰主对话
- **静默处理**：用户无感知

## 参考

- [知识沉淀机制：即时捕获](../02-design/knowledge-compounding.md#即时捕获机制)
- [候选评估机制设计](../02-design/candidate-evaluation.md)
- [candidate-evaluator Skill](../../.cursor/skills/candidate-evaluator/SKILL.md)
- [experience-depositor 实现](./experience-depositor.md)
