---
name: experience-capture
description: 此 Skill 由 stop hook 触发，扫描对话历史识别经验信号，生成经验候选并执行评估，在会话中展示候选供用户选择。
---

# Experience Capture

## Instructions

### 1. 触发机制

**核心原则**：只有用户拥有真正的判断力，经验来自用户的判断和确认。

**激活方式**：

- **stop hook 触发**：当任务完成时，stop hook 会引导调用本 Skill
- **手动调用**：用户可以通过 `/remember` 命令手动触发经验捕获

**触发流程**：

1. stop hook 在任务完成时（`status === "completed"`）触发
2. stop hook 输出 followup_message，引导调用 `@experience-capture` skill
3. 本 Skill 被调用后，扫描整个对话历史，识别经验信号

**AI Native 原则**：

- 完全依赖 LLM 的自然语言理解能力，不进行关键词匹配
- 触发场景列表（`references/req-triggers.md` 等）仅作为参考，帮助理解经验类型和结构
- 不限制捕获范围，让 AI 根据语义理解灵活识别经验信号

### 2. 经验信号识别

#### 2.1 扫描对话历史

扫描整个对话历史，识别以下类型的经验信号：

1. **判断和取舍**：技术选型、架构决策、方案选择等
2. **边界和约束**：项目约定、团队规范、业务规则等
3. **问题解决**：bug 修复、性能优化、架构调整等
4. **用户确认 AI 建议**：用户采纳、接受、确认 AI 的建议或风险

**典型经验信号**：

- 技术栈选择理由（为什么选择某个技术栈/框架/库）
- 架构决策（为什么选择某个架构模式/设计模式）
- 开发规范取舍（为什么采用某个开发规范）
- 项目结构决策（为什么采用某个项目结构）
- 常见坑点（开发中常遇到的问题或陷阱）
- 业务规则（业务层面的约束和规则）
- 用户确认的风险或建议

**过滤规则**（在识别时应用）：

- 过滤单纯知识解释（可通过文档获得）
- 过滤临时调试猜测（尚未验证）
- 过滤尚未验证的方案
- 过滤明显一次性代码

#### 2.2 阶段和任务编号检测

**统一检测策略：对话历史优先 + 文件验证补充**

采用分层检测策略，确保检测的准确性和可靠性：

**检测层级**（按优先级顺序）：

| 层级 | 检测方式   | 用途                   | 可靠性             |
| ---- | ---------- | ---------------------- | ------------------ |
| L1   | 对话历史   | 确定当前阶段和任务编号 | 高（唯一权威来源） |
| L2   | 文件存在性 | 验证任务状态、显示进度 | 中（辅助信息）     |
| L3   | 用户确认   | 兜底（历史缺失时）     | 高（用户明确指定） |

**L1：对话历史检测（主要来源）**

1. 检测用户最近输入的命令（`/plan 001`、`/build 001`、`/review 001` 等）
2. 提取命令名（plan/build/review）和参数（001）
3. 命令名直接对应阶段：`/plan` → plan 阶段，`/build` → build 阶段，`/review` → review 阶段
4. 命令参数直接对应任务编号：`001` → 任务编号 001

**特殊命令**：

- `/req <描述>` → 阶段：req，任务编号：自动生成（待写入文件后确定）
- `/review-req 001` → 阶段：review-req，任务编号：001
- `/init` → 阶段：init，任务编号：null

**L2：文件存在性验证（辅助来源）**

用于验证任务状态和显示任务进度，**不用于判断当前阶段**：

```
扫描 .cursor/.lingxi/requirements/ 目录：
- 001.req.*.md 存在 → 任务 001 已创建 req
- 001.plan.*.md 存在 → 任务 001 已创建 plan
- 001.testcase.*.md 存在 → 任务 001 已创建 testcase
```

**L3：用户确认兜底**

当对话历史缺失（如新会话）时：

- **检测失败处理**：
  1. 输出明确的错误提示："无法自动检测当前阶段和任务编号"
  2. 要求用户明确指定：提示用户输入命令格式（如 `/plan 001`）或直接指定任务编号
  3. 提供解决方案：说明如何通过命令参数获取（如 `/build 001`）

### 3. EXP-CANDIDATE 生成

当识别到经验信号时，生成 EXP-CANDIDATE JSON 对象：

**EXP-CANDIDATE JSON 格式**：

```json
{
  "taskId": "001",
  "stage": "plan",
  "trigger": "当任务 T2 依赖从A改为B",
  "decision": "任务/验收/测试策略的取舍",
  "alternatives": ["原方案A（放弃，因为...）"],
  "signal": "判断依据/风险信号",
  "solution": "新的任务拆解/验收/测试策略",
  "verify": "后续如何验证该决策",
  "pointers": ["path/to/plan-file 或相关模块"],
  "reqFile": ".cursor/.lingxi/requirements/001.req.<标题>.md",
  "notes": "可选补充"
}
```

**关键字段**：

- `taskId`：任务编号（001, 002, ...），对于 `/init` 命令设为 `null`
- `stage`：当前阶段（req/plan/build/review/init）
- `reqFile`：关联的 req 文件路径（用于后续匹配和追溯），对于 `/init` 命令设为 `null` 或省略
- `trigger`：触发条件（什么情况下会用到这条经验）
- `decision`：判断内容（当时在判断什么）
- `alternatives`：备选方案（拒绝了哪些方案，至少 1 个）
- `signal`：判断依据（基于什么可观测信号做出分叉）
- `solution`：解决方案（最终采用的方案）
- `verify`：验证方式（如何验证这个决策正确性）

**格式要求**：

- 必须包含所有关键字段（taskId, stage, trigger, decision, solution, verify, reqFile）
- alternatives 字段可选，但如果存在决策取舍，应包含至少一个备选方案
- pointers 字段应指向相关文件或模块，便于追溯

### 4. 评估逻辑（合并自 candidate-evaluator）

对每个生成的 EXP-CANDIDATE，执行以下评估：

#### 4.1 结构完整性评估（Structural Integrity）

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
    "reason": "结构完整，包含必要的判断结构字段"
  }
}
```

#### 4.2 判断结构质量评估（Decision Shape Quality）

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
    "reason": "包含明确的判断结构（决策点/备选方案/判断依据）"
  }
}
```

#### 4.3 可复用性评估（Reusability）

评估候选是否能在不同场景下复用。包含三个维度：

**时间维度（长期价值）**：

评估问题：这条信息在未来（无论是同一项目的后续工作，还是其他项目）还能帮我提前做出正确判断吗？

**评估标准**：

- **跨项目长期价值**（broad scope）：
  - ✅ 能抽象出通用判断模式
  - ✅ 不依赖特定项目/技术栈版本
  - ✅ 包含可迁移的判断依据（signal）
- **项目内长期价值**（narrow/medium scope）：
  - ✅ 能在同一项目的后续工作中复用
  - ✅ 包含项目特定的判断依据和约束（如架构决策、技术栈选择、团队约定等）
  - ✅ 即使在项目特定环境下，也能形成可复用的判断模式

**评分说明**：

- 如果满足跨项目标准 → 高分（0.8-1.0），适合 broad scope
- 如果满足项目内标准 → 中等分（0.6-0.8），适合 narrow/medium scope，仍应进入 experience（项目级长期资产）
- 如果只是临时记录 → 低分（< 0.5），适合 session/worklog

**空间维度（跨项目价值）**：

评估问题：这条判断是否只适用于当前项目的特定约束？

**评估标准**：

- ✅ 判断依据（signal）具有通用性
- ✅ 解决方案（solution）可适用于类似场景
- ✅ 不依赖项目特定的配置/路径

**抽象层次**：

评估问题：这条候选能否抽象为更高层次的原则？

**评估标准**：

- ✅ 能从具体案例中抽象出判断原则
- ✅ 能适用于一类问题，而非单个问题
- ✅ 包含边界条件（什么情况下不适用）

**总体可复用性**：

根据三个维度的评分，计算总体可复用性：

- **高可复用性**（平均分 ≥ 0.8，且所有维度 ≥ 0.7）：适合 experience（长期资产），Scope = broad（跨项目通用）
- **中等可复用性**（平均分 0.6-0.8，或时间维度 ≥ 0.6）：适合 experience（项目级长期资产），Scope = narrow/medium（项目特定或同类问题）
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

#### 4.4 知识可获得性评估（Knowledge Accessibility）

评估问题：这条经验是否可以通过其他方式获得（模型知识库、代码库、文档等）？

**评估流程**：

1. **检查框架官方文档**：
   - 是否是框架官方约定？
   - 评分：是 → 0.0-0.3（高可获得性），否 → 继续评估

2. **检查代码库示例**：
   - 代码库中是否有清晰示例？
   - 评分：是且清晰 → 0.4-0.6（中可获得性），否 → 继续评估

3. **检查团队/项目特定判断**：
   - 是否需要团队/项目特定判断？
   - 评分：是 → 0.7-1.0（低可获得性），否 → 不是经验（过滤）

4. **判断是否需要规则约束**：
   - 如果高可获得性，判断是否需要规则约束
   - 需要规则约束 → 是经验（标准类）
   - 不需要规则约束 → 不是经验（过滤）

**过滤规则**：

- 高可获得性（< 0.4）且不需要规则约束 → 建议过滤
- 高可获得性但需要规则约束 → 是经验（标准类）
- 中/低可获得性 → 是经验

**输出**：

```json
{
  "knowledgeAccessibility": {
    "score": 0.2,
    "level": "high",
    "reason": "这是 Vite 官方约定的环境变量访问方式，模型知识库应包含此信息",
    "sources": [
      {
        "type": "framework_docs",
        "description": "Vite 官方文档明确说明使用 import.meta.env"
      }
    ],
    "isRuleConstraint": false,
    "recommendation": "filter"
  }
}
```

#### 4.5 经验类型判断（Type Judgment）

判断标准：

1. **是否具有强约束力？**
   - 是 → standard（标准）
   - 否 → 继续判断

2. **是否是预设通行方案？**
   - 是 → standard（标准）
   - 否 → 继续判断

3. **是否需要复杂判断？**
   - 是 → knowledge（经验）
   - 否 → standard（标准）

4. **是否需要认知触发？**
   - 是 → knowledge（经验）
   - 否 → standard（标准）

**输出**：

```json
{
  "type": {
    "recommended": "knowledge",
    "reason": "需要复杂判断和认知触发，而非强约束"
  }
}
```

**理由模板**：

- standard：具有强约束力、预设通行方案、可自动检查
- knowledge：需要复杂判断、认知触发、风险匹配

#### 4.6 Level 判断（Level Judgment）

判断标准：

- **team**：技术栈选择、架构模式、团队规范、跨项目通用原则
- **project**：项目特定架构、业务规则、项目约定、项目内复用模式

**输出**：

```json
{
  "level": {
    "recommended": "team",
    "reason": "技术栈选择决策，跨项目通用"
  }
}
```

**理由模板**：

- team：跨项目复用、技术栈选择、架构模式、团队规范
- project：项目特定、业务规则、项目约定、项目内复用

#### 4.7 沉淀载体适配性评估（Deposition Target Fitness）

评估候选最适合沉淀到哪个载体。

**载体类型与评估信号**：

| 载体                            | 适用场景                    | 评估信号                        |
| ------------------------------- | --------------------------- | ------------------------------- |
| **experience**（经验库）        | 长期判断资产，需要提醒/指针 | ✅ 高可复用性 + ✅ 判断结构完整 |
| **skills**（流程能力）          | 可复用的流程或重复步骤      | ✅ 流程性质 + ✅ 多次重复       |
| **services**（服务上下文）      | 服务边界/配置规范/考古知识  | ✅ 服务特定 + ✅ 长期有效       |
| **session/worklog**（项目记录） | 项目特定的临时记录          | ✅ 低可复用性 + ✅ 项目特定     |

**评估逻辑**：

1. 如果可复用性 = 高，且判断结构完整 → 推荐 **experience**（Scope = broad，Level = team）
2. 如果可复用性 = 中（时间维度 ≥ 0.6），且判断结构完整 → 推荐 **experience**（Scope = narrow/medium，Level = project）
3. 如果是流程性质且多次重复 → 推荐 **skills**
4. 如果是服务特定且长期有效 → 推荐 **services**
5. 如果可复用性 = 低（时间维度 < 0.6）→ 推荐 **session/worklog**（临时记录）

**输出**：

```json
{
  "depositionTarget": {
    "recommended": ["experience"],
    "level": "team",
    "type": "knowledge",
    "alternatives": ["session"],
    "reason": "高可复用性且判断结构完整，适合作为长期判断资产",
    "expectedBenefit": "下次遇到类似判断场景时，可提前参考经验，避免重复犯错"
  }
}
```

#### 4.8 综合评估结果

**过滤规则**：

- 如果结构完整性或判断结构质量不通过 → 标记为过滤，记录 `filterReason`
- 如果知识可获得性高且不需要规则约束 → 标记为过滤，记录 `filterReason`
- 如果通过但边界模糊 → 标记 `requiresHumanJudgment: true`

**最终评估结果格式**：

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
  "knowledgeAccessibility": {
    "score": 0.2,
    "level": "high",
    "reason": "",
    "sources": [],
    "isRuleConstraint": false,
    "recommendation": "filter"
  },
  "type": {
    "recommended": "knowledge",
    "reason": ""
  },
  "level": {
    "recommended": "team",
    "reason": ""
  },
  "depositionTarget": {
    "recommended": ["experience"],
    "level": "team",
    "type": "knowledge",
    "alternatives": ["session"],
    "reason": "",
    "expectedBenefit": ""
  },
  "requiresHumanJudgment": false,
  "filterReason": ""
}
```

### 5. 候选展示和用户选择

#### 5.1 过滤明显不通过的候选

在展示前，过滤以下候选：

- 结构完整性不通过（缺少关键字段）
- 判断结构质量不通过（只是步骤描述）
- 知识可获得性高且不需要规则约束（可通过其他方式获得）

**静默过滤**：过滤的候选不展示，不说明过滤原因（保持低打扰）

#### 5.2 在会话中展示候选

对通过评估的候选，在会话中展示：

**展示格式**：

```markdown
## 经验候选列表

### 候选 1：[标题] [团队级/项目级] [标准/经验]
- **触发条件**：什么情况下会用到这条经验
- **判断**：当时的判断是什么
- **备选方案**：考虑了哪些其他方案（如有）
- **判断依据**：基于什么做出这个判断
- **解决方案**：最终采用的方案
- **验证方式**：如何验证这个决策正确性
- **推荐存储**：团队级标准（强约束、执行底线）
- **知识可获得性**：低（0.8）- 团队特定决策

### 候选 2：[标题] [团队级/项目级] [标准/经验]
...

请选择要沉淀的候选（输入编号，如 `1,3` 或 `全部`）：
```

**展示原则**：

- 重点展示经验核心信息，简化评估信息
- 默认隐藏详细评估信息（结构完整性、判断结构质量、可复用性各维度评分等）
- 只保留推荐载体和简要理由（1-2 句话）
- 如果用户需要查看详细评估，可以提供"查看详细评估"选项，但默认不展示

#### 5.3 用户选择

用户可以通过以下方式选择：

- 输入编号：`1,3` 或 `1 3` → 选择第 1 和第 3 个候选
- 输入 `全部` 或 `all` → 选择所有候选
- 输入编号后，将选中的候选传递给 `experience-depositor` skill 进行沉淀

**如果无候选**：

- 静默跳过，不输出任何内容（遵循静默成功原则）

### 6. 质量要求

- 只捕获有价值的经验（有明确的触发条件、决策依据、解决方案）
- 避免捕获过于具体或临时的决策（无法复用的经验）
- 确保经验的通用性（可在类似场景下复用）
- 保护品味：边界模糊的候选不应强制过滤，应标记为需要人工判断
