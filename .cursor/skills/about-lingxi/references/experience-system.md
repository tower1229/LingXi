# 经验系统机制

## 概述

经验系统是灵犀实现"心有灵犀"的核心能力，通过自动捕获、评估、沉淀、治理和匹配，让 AI 具备项目级记忆。

## 核心流程

### 1. 经验捕获（experience-capture）

**触发时机**：在执行 `/req`、`/plan 001`、`/build 001`、`/review 001`、`/init` 等命令时自动激活

**检测策略**：对话历史优先 + 文件验证补充
- L1（主要来源）：从对话历史检测当前阶段和任务编号
- L2（辅助来源）：通过文件存在性验证任务状态
- L3（兜底）：对话历史缺失时要求用户明确指定

**捕获流程**：
1. 扫描用户输入，识别经验信号（判断、取舍、边界、约束等）
2. 生成 EXP-CANDIDATE JSON 格式
3. 调用 `candidate-evaluator` 执行阶段 1 评估
4. 评估通过后写入 `pending-compounding-candidates.json` 暂存

**EXP-CANDIDATE 格式**：
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
  "level": "team/project",
  "type": "standard/knowledge"
}
```

### 2. 经验评估（candidate-evaluator）

**阶段 1 评估**（experience-capture 中执行）：
- 知识可获得性过滤：高可获得性且代码库有示例 → 降低优先级或跳过
- 经验类型判断：standard（强约束、执行底线）或 knowledge（复杂判断、认知触发）
- Level 判断：team（团队级）或 project（项目级）

**阶段 2 评估**（experience-depositor 中执行）：
- 结构完整性检查
- 判断结构质量评估
- 可复用性评估
- 沉淀载体适配性评估

### 3. 经验沉淀（experience-depositor）

**触发时机**：用户执行 `/remember` 命令或直接输入编号选择候选经验

**沉淀流程**：
1. 读取 `pending-compounding-candidates.json` 暂存候选
2. 调用 `candidate-evaluator` 执行阶段 2 详细评估
3. 展示候选及评估结果
4. 用户选择要沉淀的候选
5. 调用 `experience-curator` 进行冲突检测和治理
6. 用户选择存储目标（团队级标准/经验或项目级经验）
7. 写入对应位置

**沉淀分流**：
- 团队级标准（`team/standards/`）：强约束、执行底线
- 团队级经验（`team/knowledge/`）：复杂判断、认知触发
- 项目级经验（`project/`）：项目特定、长期复用

### 4. 经验治理（experience-curator）

**触发时机**：在 experience-depositor 沉淀经验后自动触发

**治理模式**：
- **方案模式**：生成治理方案（建议的合并/取代动作），不执行，供用户确认
- **执行模式**：执行治理动作，更新 INDEX，输出变更报告

**治理动作**：
- 合并：检测到相似经验，建议合并
- 取代：检测到冲突经验，建议取代
- 质量准则建议：识别可沉淀为质量准则的经验

### 5. 经验索引和匹配（experience-index）

**触发时机**：在执行 `/req`、`/plan 001`、`/build 001`、`/review 001` 等命令时自动激活

**匹配流程**：
1. 从命令参数推断任务编号和阶段
2. 读取对应的 req 文件作为匹配上下文
3. 根据命令决定读取哪些索引：
   - `/init` → 只读取 `team/INDEX.md`
   - `/req`、`/plan`、`/build`、`/review` → 读取 `team/INDEX.md` + `project/INDEX.md`
4. 先读取索引（INDEX.md），只匹配 Status = `active` 的经验
5. LLM 语义匹配：基于 Trigger、阶段、风险、信号进行匹配
6. 按需加载细节：仅在需要详细内容时，才加载对应的经验文件

**匹配优先级**：
1. 命令匹配（最高优先级）：根据当前命令决定匹配范围
2. 文件匹配（中等优先级）：如果当前有打开文件，匹配文件相关的标准和经验
3. 语义匹配（最低优先级）：Trigger 匹配、Surface signal 匹配、Hidden risk 匹配

**输出规则**（遵循静默成功原则）：
- 无匹配时：完全静默，不输出任何内容
- 有匹配时：仅输出关键信息（风险级别 + 指针），省略冗长的结构化格式

## 经验存储结构

```
.cursor/.lingxi/context/experience/
├── team/                  # 团队级标准和经验
│   ├── INDEX.md          # 经验索引（SSoT）
│   ├── standards/        # 团队级标准（强约束、执行底线）
│   │   └── EXP-*.md
│   └── knowledge/        # 团队级经验（复杂判断、认知触发）
│       └── EXP-*.md
└── project/              # 项目级经验
    ├── INDEX.md          # 经验索引（SSoT）
    └── EXP-*.md
```

## 经验文档格式

经验文档必须包含以下字段：

- **Decision Shape**（判断结构）：
  - Decision being made：正在做的决策
  - Alternatives rejected：被拒绝的备选方案
  - Discriminating signal：区分信号

- **Judgment Capsule**（认知蒸馏）：
  - I used to think：过去的想法
  - Now I believe：现在的信念
  - Because the decisive variable is：决定性变量

- **Trigger**：触发条件（何时应用此经验）
- **Surface signal**：表面信号（熟悉的风险味道）
- **Hidden risk**：隐藏风险（真正会出问题的点）

## 关键原则

1. **人工门控**：经验沉淀必须用户确认，禁止未确认写入经验库
2. **SSoT**：INDEX.md 是经验的单一事实来源，其他文件引用而非复制
3. **静默成功**：无匹配时完全静默，有匹配时仅输出关键信息
4. **分层加载**：先索引与概要，按需加载细节，避免 context rot

## 参考

- **经验捕获**：`.cursor/skills/experience-capture/SKILL.md`
- **经验索引**：`.cursor/skills/experience-index/SKILL.md`
- **经验沉淀**：`.cursor/skills/experience-depositor/SKILL.md`
- **经验治理**：`.cursor/skills/experience-curator/SKILL.md`
- **候选评估**：`.cursor/skills/candidate-evaluator/SKILL.md`
