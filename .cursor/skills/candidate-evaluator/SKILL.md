---
name: candidate-evaluator
description: 统一候选评估机制，评估 EXP-CANDIDATE 的质量和分类决策。在 experience-collector 和 experience-depositor 中调用，执行结构完整性、判断结构质量、可复用性和沉淀载体适配性评估。
---

# Candidate Evaluator

## Inputs

- EXP-CANDIDATE JSON 对象
- 评估阶段（`stage1` 自动评估 或 `stage2` 详细评估）

## Outputs

评估结果 JSON，包含各维度评估结果、推荐载体、理由等。

## Instructions

### 评估阶段

根据调用方指定，执行不同阶段的评估：

- **阶段 1（自动评估）**：在 experience-collector 中调用，初步过滤明显不通过的候选
- **阶段 2（详细评估）**：在 experience-depositor 中调用，对用户选择的候选进行详细评估

### 1. 结构完整性评估（Structural Integrity）

评估候选是否包含完整的判断结构。

**评估项**：

- ✅ 包含 `decision` 字段（判断了什么）
- ✅ 包含 `alternatives` 字段（拒绝了什么，至少 1 个）
- ✅ 包含 `signal` 字段（判断依据）
- ✅ 包含 `solution` 字段（解决方案）
- ✅ 包含 `verify` 字段（验证方式）

**分类标准**：

- **通过**：满足所有评估项，或至少包含关键字段（decision/alternatives/signal）→ 继续评估
- **不通过**：缺少关键字段（decision/alternatives/signal）→ 过滤，记录理由

**输出**：

```json
{
  "structuralIntegrity": {
    "passed": true,
    "missingFields": [],
    "reason": ""
  }
}
```

**理由模板**：

- 通过：结构完整，包含必要的判断结构字段
- 不通过：缺少判断结构（缺少 decision/alternatives/signal），无法抽象为可复用的判断资产

### 2. 判断结构质量评估（Decision Shape Quality）

评估候选是否包含"如何判断"的结构，而非"做了什么"的步骤。

**评估项**：

- ✅ 能明确回答"Decision being made"（当时在判断什么）
- ✅ 能明确回答"Alternatives rejected"（拒绝了哪些备选方案，至少 1 个）
- ✅ 能明确回答"Discriminating signal"（靠什么可观测信号做出分叉）

**分类标准**：

- **通过**：能抽象出判断结构（有明确的决策点、备选方案、判断依据）→ 继续评估
- **不通过**：只是步骤描述，无法抽象出判断结构 → 过滤，记录理由

**输出**：

```json
{
  "decisionShapeQuality": {
    "passed": true,
    "reason": ""
  }
}
```

**理由模板**：

- 通过：包含明确的判断结构（决策点/备选方案/判断依据）
- 不通过：只是步骤复现，无法抽象为判断结构

### 3. 可复用性评估（Reusability）

评估候选是否能在不同场景下复用。包含三个维度：

#### 3.1 时间维度（长期价值）

**评估问题**：这条信息在未来（无论是同一项目的后续工作，还是其他项目）还能帮我提前做出正确判断吗？

**评估标准**：

**跨项目长期价值**（broad scope）：
- ✅ 能抽象出通用判断模式
- ✅ 不依赖特定项目/技术栈版本
- ✅ 包含可迁移的判断依据（signal）

**项目内长期价值**（narrow/medium scope）：
- ✅ 能在同一项目的后续工作中复用
- ✅ 包含项目特定的判断依据和约束（如架构决策、技术栈选择、团队约定等）
- ✅ 即使在项目特定环境下，也能形成可复用的判断模式

**评分说明**：
- 如果满足跨项目标准 → 高分（0.8-1.0），适合 broad scope
- 如果满足项目内标准 → 中等分（0.6-0.8），适合 narrow/medium scope，仍应进入 experience（项目级长期资产）
- 如果只是临时记录 → 低分（< 0.5），适合 session/worklog

**评分**：0.0 - 1.0（基于满足标准的程度）

#### 3.2 空间维度（跨项目价值）

**评估问题**：这条判断是否只适用于当前项目的特定约束？

**评估标准**：

- ✅ 判断依据（signal）具有通用性
- ✅ 解决方案（solution）可适用于类似场景
- ✅ 不依赖项目特定的配置/路径

**评分**：0.0 - 1.0（基于满足标准的程度）

#### 3.3 抽象层次

**评估问题**：这条候选能否抽象为更高层次的原则？

**评估标准**：

- ✅ 能从具体案例中抽象出判断原则
- ✅ 能适用于一类问题，而非单个问题
- ✅ 包含边界条件（什么情况下不适用）

**评分**：0.0 - 1.0（基于满足标准的程度）

#### 总体可复用性

根据三个维度的评分，计算总体可复用性：

- **高可复用性**（平均分 ≥ 0.8，且所有维度 ≥ 0.7）：适合 experience（长期资产），Scope = broad（跨项目通用）
- **中等可复用性**（平均分 0.6-0.8，或时间维度 ≥ 0.6）：适合 experience（项目级长期资产），Scope = narrow/medium（项目特定或同类问题）
  - **注意**：即使是项目特定的经验，只要能在项目内长期复用，就应该进入 experience，标记为适当的 Scope
- **低可复用性**（平均分 < 0.6，且时间维度 < 0.6）：适合 session/worklog（临时记录），或过滤

**重要**：项目级经验如果能在同一项目的未来复用，即使不能跨项目，也应当被积累到 experience 库中，通过 Scope 字段区分适用范围。

**输出**：

```json
{
  "reusability": {
    "temporalDimension": {
      "passed": true,
      "score": 0.9,
      "reason": "能抽象出通用判断模式，不依赖特定项目版本"
    },
    "spatialDimension": {
      "passed": true,
      "score": 0.8,
      "reason": "判断依据具有通用性，可适用于类似场景"
    },
    "abstractionLevel": {
      "passed": true,
      "score": 0.85,
      "reason": "能从具体案例抽象出判断原则，适用于一类问题"
    },
    "overall": "high",
    "confidence": 0.85
  }
}
```

**理由模板**：

- 高：具有长期价值，能跨项目复用，适合进入 experience（Scope = broad）
- 中：具有项目内长期价值，适合进入 experience（Scope = narrow/medium），即使在项目特定环境下也能形成可复用的判断模式
- 低：过于具体/临时，无复用价值，适合保留为临时记录

### 4. 沉淀载体适配性评估（Deposition Target Fitness）

评估候选最适合沉淀到哪个载体。

**载体类型与评估信号**：

| 载体                            | 适用场景                    | 评估信号                        |
| ------------------------------- | --------------------------- | ------------------------------- |
| **experience**（经验库）        | 长期判断资产，需要提醒/指针 | ✅ 高可复用性 + ✅ 判断结构完整 |
| **rules**（规则库）             | 可自动判定且高频的约束      | ✅ 可自动检查 + ✅ 高频出现     |
| **skills**（流程能力）          | 可复用的流程或重复步骤      | ✅ 流程性质 + ✅ 多次重复       |
| **services**（服务上下文）      | 服务边界/配置规范/考古知识  | ✅ 服务特定 + ✅ 长期有效       |
| **session/worklog**（项目记录） | 项目特定的临时记录          | ✅ 低可复用性 + ✅ 项目特定     |

**评估逻辑**：

1. 如果可复用性 = 高，且判断结构完整 → 推荐 **experience**（Scope = broad）
2. 如果可复用性 = 中（时间维度 ≥ 0.6），且判断结构完整 → 推荐 **experience**（Scope = narrow/medium）
   - **项目级经验**：即使不能跨项目，只要能在项目内长期复用，就应进入 experience
3. 如果可自动检查且高频 → 推荐 **rules**
4. 如果是流程性质且多次重复 → 推荐 **skills**
5. 如果是服务特定且长期有效 → 推荐 **services**
6. 如果可复用性 = 低（时间维度 < 0.6）→ 推荐 **session/worklog**（临时记录）

**输出**：

```json
{
  "depositionTarget": {
    "recommended": ["experience"],
    "alternatives": ["session"],
    "reason": "高可复用性且判断结构完整，适合作为长期判断资产",
    "expectedBenefit": "下次遇到类似判断场景时，可提前参考经验，避免重复犯错"
  }
}
```

### 5. 综合评估结果

**阶段 1（自动评估）**：

- 如果结构完整性或判断结构质量不通过 → 标记为过滤，记录 `filterReason`
- 如果通过但边界模糊 → 标记 `requiresHumanJudgment: true`
- 记录初步评估结果和推荐载体

**阶段 2（详细评估）**：

- 对所有维度进行详细评估
- 提供完整的评估结果和推荐载体
- 用于用户选择和确认

**最终输出格式**：

```json
{
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
```

## 使用场景

### 场景 1：experience-collector 自动评估（阶段 1）

- **时机**：检测到 EXP-CANDIDATE 时自动调用
- **目的**：初步过滤明显不通过的候选，避免暂存无价值的候选
- **特点**：静默处理，只过滤明显不通过的候选，边界模糊的候选仍暂存

### 场景 2：experience-depositor 详细评估（阶段 2）

- **时机**：用户选择候选后，或展示候选前
- **目的**：对候选进行详细评估，提供充分的判断依据和推荐载体
- **特点**：详细的二次评估，用户可查看评估结果和调整推荐载体

## 注意事项

1. **保护品味**：边界模糊的候选不应强制过滤，应标记为需要人工判断
2. **可解释性**：每个评估结果都必须提供明确理由，支持人工复核
3. **评估一致性**：同一候选在不同阶段的评估结果应保持一致（阶段 2 是阶段 1 的细化）
4. **载体推荐**：推荐载体应基于评估结果，但最终决定权在用户
