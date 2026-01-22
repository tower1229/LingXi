---
name: experience-depositor
description: 此 Skill 将学习成果、约束条件和调试结论沉淀到 .cursor/.lingxi/memory/experience。当用户通过 /remember ... 命令提取新经验时激活，或当用户直接输入编号选择候选经验（如 1,3）时激活，或在 /init 命令初始化项目过程中需要沉淀经验候选时激活。
---

# Experience Depositor

## Inputs（从上下文获取）

1. `.cursor/.lingxi/workspace/pending-compounding-candidates.json`（由 EXP-CANDIDATE + experience-capture 生成）
2. `.cursor/.lingxi/requirements/<taskId>.plan.<标题>.md` 的 Compounding Candidates（如存在）
3. plan Worklog / review 复利候选（必要时）
4. 用户输入（可能是编号选择，如 `1,3` 或 `1 3`）

**注意**：2.0 中 plan 文档位于 `.cursor/.lingxi/requirements/` 统一目录，文件命名格式为 `001.plan.<标题>.md`。

## Instructions

### -1) 解析用户输入（编号选择优先）

**如果用户输入是编号格式**（如 `1,3`、`1 3`、`1,2,3`、`全部`、`all` 等），优先按编号选择候选：

> **注意**：编号选择通常直接输入即可（如 `1,3`），无需 `/remember` 前缀。如果用户使用 `/remember 1,3`，也支持，但直接输入编号更简单。

1. **读取候选列表**：从 `.cursor/.lingxi/workspace/pending-compounding-candidates.json` 读取所有候选
2. **解析编号**：提取用户输入中的数字（支持逗号、空格分隔，如 `1,3`、`1 3`、`1, 2, 3`）
3. **选择候选**：根据编号选择对应的候选（编号从 1 开始，对应数组索引 0）
4. **验证编号**：如果编号超出范围，提示用户并展示候选列表
5. **继续执行**：对选中的候选执行后续沉淀流程（从步骤 0 开始）

**编号选择示例**：

- `1,3` → 选择第 1 和第 3 个候选
- `1 3` → 选择第 1 和第 3 个候选
- `1,2,3` → 选择第 1、2、3 个候选
- `全部` 或 `all` → 选择所有候选

**如果用户输入不是编号格式**，按正常流程处理（从步骤 0 开始）。

### 0) 统一评估（阶段 2）

调用 `candidate-evaluator` Skill 对暂存的候选执行详细评估：

- 对阶段 1 的评估结果进行细化
- 详细评估可复用性（时间维度、空间维度、抽象层次）
- 详细评估沉淀载体适配性（推荐最适合的载体）

**输出**：完整的评估结果，包括各维度评估结果、推荐载体、理由、预期收益等。

**特点**：
- 评估结果用于后续展示和用户选择
- 如果候选在阶段 1 已通过评估，阶段 2 是在此基础上的详细化

### 1) 展示候选

**展示原则**：重点展示经验核心信息，简化评估信息

按 stage/时间排序，展示候选：

**展示格式**（重点展示核心信息，增加 Level 和 Type 展示）：

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
- **知识可获得性**：高（0.2）- Vite 官方约定，但需要规则约束

### 候选 2：[标题] [团队级/项目级] [标准/经验]
...
```

**评估信息处理**：

- **默认隐藏**：结构完整性、判断结构质量、可复用性各维度评分等详细评估信息
- **只保留**：推荐载体和简要理由（1-2 句话）
- **可选展示**：如果用户需要查看详细评估，可以提供"查看详细评估"选项，但默认不展示

### 2) 用户选择

**提供多个选项**（使用选择符号）：

```markdown
## 请选择操作

- **A) 全部确认**：将所有候选存入经验库
- **B) 选择部分**：输入编号选择部分候选（如 `B 1,3` 或 `B 1 3`）
- **C) 调整存储目标**：为部分候选选择不同的存储目标（团队级标准 vs 团队级经验 vs 项目级经验）
- **D) 修改候选信息**：修改候选的部分信息（如 trigger、decision 等）
- **E) 取消**：放弃沉淀

请选择 A、B、C、D 或 E：
```

**选项处理逻辑**：

- **A) 全部确认**：
  - 直接进入步骤 3（冲突检测）

- **B) 选择部分**：
  - 解析用户输入中的编号（如 `B 1,3` → 选择候选 1 和 3）
  - 只对选中的候选执行后续流程
  - 未选中的候选保留在暂存中

- **C) 调整存储目标**：
  - 展示所有候选，让用户为每个候选选择存储目标（团队级标准 vs 团队级经验 vs 项目级经验）
  - 支持批量选择（如"全部选择团队级标准"）
  - 然后进入步骤 8（存储目标选择）

- **D) 修改候选信息**：
  - 让用户选择要修改的候选编号
  - 展示候选的当前信息，让用户修改
  - 更新候选信息后，重新展示候选列表

- **E) 取消**：
  - 终止流程，保留候选在暂存中

### 3) 冲突检测

读取统一索引 `memory/INDEX.md`，根据候选的 Level 和 Type 匹配对应的记忆条目：
- Level = team → 匹配 Experience 表格中 Level = team 的条目
- Level = project → 匹配 Experience 表格中 Level = project 的条目

对选择的候选检查：
- 触发条件相同/相似，且解决方案矛盾 → 冲突：旧经验标记 deprecated，新经验记录替代关系
- 触发条件相近且解决方案相同/相似 → 重复：默认合并（或请求用户确认合并策略）

### 4) 调用 curator 方案模式

如果检测到需要治理（合并/取代），调用 `memory-curator` 的**方案模式**：

- 生成治理方案（建议的合并/取代动作，不执行）
- 评估新经验与现有经验的关系，智能判断合并/取代/保持独立
- 输出治理方案（动作/理由/影响），供用户确认

### 5) 展示治理方案

向用户展示治理方案，请求用户确认或调整：

```markdown
## 治理方案

- **合并 EXP-001→EXP-003**：理由：Trigger 关键词重叠 75%，主题高度相似
- **取代 EXP-002→EXP-004**：理由：新经验是旧经验的升级版（更完整/更准确）

请确认是否执行此治理方案？
```

### 6) 用户确认治理方案

等待用户确认或调整治理方案。

### 7) 调用 curator 执行模式

用户确认后，调用 `memory-curator` 的**执行模式**：

- 备份统一索引 → `memory/INDEX.md.bak`
- 执行治理动作（合并/取代/保持独立）
- 建立 `Replaces/ReplacedBy` 追溯关系，更新统一索引（Scope/Strength 取更优值）
- 输出变更报告（动作/理由/影响/回滚命令）

### 8) 存储目标选择

在决定写入经验文档（长期）之前，需要让用户选择存储目标：

**选项**：
- **A) 存入团队级标准**：写入 `team/standards/`，强约束、执行底线
- **B) 存入团队级经验**：写入 `team/knowledge/`，复杂判断、认知触发
- **C) 存入项目级经验**：写入 `project/`，项目特定、长期复用

**预览输出格式**（在生成经验预览时同时展示）：

```markdown
## 质量资产预览

### 内容摘要

- **标题**：...
- **触发条件**：...
- **核心判断**：...
- **Level**：团队级/项目级
- **Type**：标准/经验

### 存储目标选择

- **A) 存入团队级标准**：写入 team/standards/，强约束、执行底线
- **B) 存入团队级经验**：写入 team/knowledge/，复杂判断、认知触发
- **C) 存入项目级经验**：写入 project/，项目特定、长期复用

请选择 A、B 或 C：
```

**推荐逻辑**：

- 如果评估结果推荐 Level = team，Type = standard → 推荐 A（团队级标准）
- 如果评估结果推荐 Level = team，Type = knowledge → 推荐 B（团队级经验）
- 如果评估结果推荐 Level = project → 推荐 C（项目级经验）

### 9) 写入

根据用户选择的存储目标，写入对应位置：

- **如果选择 A（团队级标准）**：
  - 写入 `.cursor/.lingxi/memory/experience/team/standards/<tag>-<title>.md`
  - **自动更新统一索引**：经验文件写入成功后，自动运行 `node scripts/validate-memory-index.js --update` 更新统一索引
    - 如果更新失败，输出错误信息，但不影响经验文件写入
    - 保持静默成功原则：更新成功时不输出确认信息
  - 触发 `memory-curator` 治理流程

- **如果选择 B（团队级经验）**：
  - 写入 `.cursor/.lingxi/memory/experience/team/knowledge/<tag>-<title>.md`
  - **自动更新统一索引**：经验文件写入成功后，自动运行 `node scripts/validate-memory-index.js --update` 更新统一索引
    - 如果更新失败，输出错误信息，但不影响经验文件写入
    - 保持静默成功原则：更新成功时不输出确认信息
  - 触发 `memory-curator` 治理流程

- **如果选择 C（项目级经验）**：
  - 写入 `.cursor/.lingxi/memory/experience/project/<tag>-<title>.md`
  - **自动更新统一索引**：经验文件写入成功后，自动运行 `node scripts/validate-memory-index.js --update` 更新统一索引
    - 如果更新失败，输出错误信息，但不影响经验文件写入
    - 保持静默成功原则：更新成功时不输出确认信息
  - 触发 `memory-curator` 治理流程

**注意**：治理已在步骤 7 执行，此处只需写入文件即可。

### 10) 清理

从暂存中移除已处理项；未写入项保留。

### 经验模板（必须包含）

#### 标准模板（standard）

适用于团队级标准（强约束、执行底线）：

- 触发条件（When to load）
- 标准内容（执行底线、预设通行方案）
- 判断结构（Decision Shape）
- 认知蒸馏（Judgment Capsule）
- 校验方式（How to verify）
- 关联指针（Pointers）

#### 经验模板（knowledge）

适用于团队级经验和项目级经验（复杂判断、认知触发）：

- 触发条件（When to load）
- 表层信号（Surface signal）
- 隐含风险（Hidden risk）
- 问题现象（Symptom）
- 根因（Root cause）
- 解决方案（Fix）
- 判断结构（Decision Shape）
- 认知蒸馏（Judgment Capsule）
- 校验方式（How to verify）
- 关联指针（Pointers）

#### 强制：把经验主语从【事】换成【判断】

每条经验必须补齐以下两段（哪怕每段只写 3 行）：

- **Decision Shape（判断结构）**
  - Decision being made: 我当时在判断什么
  - Alternatives rejected: 我拒绝了哪些备选方案（至少 1 个）
  - Discriminating signal: 我靠什么可观测信号做出分叉
- **Judgment Capsule（认知蒸馏）**
  - I used to think:
  - Now I believe:
  - Because the decisive variable is:

写入（根据存储目标选择）：

- **如果选择 A（团队级标准）**：
  - `.cursor/.lingxi/memory/experience/team/standards/<tag>-<title>.md`
  - 更新 `memory/INDEX.md`（统一索引）
  - 触发 `memory-curator` 治理流程

- **如果选择 B（团队级经验）**：
  - `.cursor/.lingxi/memory/experience/team/knowledge/<tag>-<title>.md`
  - 更新 `memory/INDEX.md`（统一索引）
  - 触发 `memory-curator` 治理流程

- **如果选择 C（项目级经验）**：
  - `.cursor/.lingxi/memory/experience/project/<tag>-<title>.md`
  - 更新 `memory/INDEX.md`（统一索引）
  - 触发 `memory-curator` 治理流程

索引写入要求（与 INDEX 表头一致）：

- `Type`：经验类型（standard/knowledge）
- `Trigger (when to load)`：用于工程检索（关键词/场景）
- `Surface signal`：表层信号（让我应该警觉的味道）
- `Hidden risk`：隐含风险（真正会炸的点）

**注意**：冲突检测和治理已在步骤 3-7 完成，此处无需重复检测。
