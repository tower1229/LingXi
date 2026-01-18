---
name: experience-depositor
description: 此 Skill 将学习成果、约束条件和调试结论沉淀到 .cursor/.lingxi/context/experience。当用户通过 /remember ... 命令提取新经验时激活，或当用户直接输入编号选择候选经验（如 1,3）时激活，或在 /init 命令初始化项目过程中需要沉淀经验候选时激活。
---

# Experience Depositor

## Inputs（从上下文获取）

1. `.cursor/.lingxi/context/session/pending-compounding-candidates.json`（由 EXP-CANDIDATE + experience-capture 生成）
2. `.cursor/.lingxi/requirements/<taskId>.plan.<标题>.md` 的 Compounding Candidates（如存在）
3. plan Worklog / review 复利候选（必要时）
4. 用户输入（可能是编号选择，如 `1,3` 或 `1 3`）

**注意**：2.0 中 plan 文档位于 `.cursor/.lingxi/requirements/` 统一目录，文件命名格式为 `001.plan.<标题>.md`。

## Instructions

### -1) 解析用户输入（编号选择优先）

**如果用户输入是编号格式**（如 `1,3`、`1 3`、`1,2,3`、`全部`、`all` 等），优先按编号选择候选：

> **注意**：编号选择通常直接输入即可（如 `1,3`），无需 `/remember` 前缀。如果用户使用 `/remember 1,3`，也支持，但直接输入编号更简单。

1. **读取候选列表**：从 `.cursor/.lingxi/context/session/pending-compounding-candidates.json` 读取所有候选
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

按 stage/时间排序，展示候选及评估结果：

- 候选基本信息（trigger/decision/signal/solution/verify/pointers）
- 评估结果（各维度评估结果、推荐载体、理由、预期收益）
- 请求用户选择写入项（支持全选/部分/放弃）

**展示格式示例**：

```markdown
## 候选列表

### 候选 1
- **触发条件**：...
- **判断**：...
- **推荐载体**：experience
- **理由**：高可复用性且判断结构完整
- **预期收益**：下次遇到类似判断场景时，可提前参考经验

### 候选 2
...
```

### 2) 用户选择

用户选择要沉淀的候选（支持编号选择，如 `1,3`）。

### 3) 冲突检测

读取 `.cursor/.lingxi/context/experience/INDEX.md`，对选择的候选检查：

- 触发条件相同/相似，且解决方案矛盾 → 冲突：旧经验标记 deprecated，新经验记录替代关系
- 触发条件相近且解决方案相同/相似 → 重复：默认合并（或请求用户确认合并策略）

### 4) 调用 curator 方案模式

如果检测到需要治理（合并/取代），调用 `experience-curator` 的**方案模式**：

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

用户确认后，调用 `experience-curator` 的**执行模式**：

- 备份 INDEX → `INDEX.md.bak`
- 执行治理动作（合并/取代/保持独立）
- 建立 `Replaces/ReplacedBy` 追溯关系，更新 INDEX（Scope/Strength 取更优值）
- 输出变更报告（动作/理由/影响/回滚命令）

### 8) 存储目标选择（如果推荐载体包含 experience 或 rules）

在决定写入经验文档（长期）或规则之前，需要让用户选择存储目标：

在决定写入经验文档（长期）之前，需要让用户选择存储目标：

- **选项 A：存入经验库**：写入 `.cursor/.lingxi/context/experience/`，下次匹配时作为提醒
- **选项 B：存入规则库**：写入 `.cursor/rules/qs-*/`，作为 Cursor 规则自动加载

**预览输出格式**（在生成经验预览时同时展示）：

```markdown
## 质量标准预览

### 内容摘要

- **标题**：...
- **触发条件**：...
- **核心判断**：...

### 存储目标选择

- **A) 存入经验库**：写入 .cursor/.lingxi/context/experience/，下次匹配时作为提醒

- **B) 存入规则库**：写入 .cursor/rules/，作为 Cursor 规则自动加载

  **规则配置预览**（如果选择 B）：

- **推荐应用方式**：文件匹配（上下文成本最低）
- **推荐配置**：
- Type: fs (file-scoped)
- Scope: frontend
- Globs: `**/components/**/*.tsx`（根据项目实际结构调整）
- 理由：内容明确涉及"组件"，适合文件匹配方式

请选择 A 或 B：
```

**规则配置推荐逻辑**（当用户选择 B 时）：

1. **分析质量标准内容**，结合项目实际情况，推荐应用方式（按优先级）：

   - 文件匹配（globs）：如果内容明确关联某类文件，且项目中有明确的文件结构
   - 智能判断（description）：如果内容是某领域的通用原则，或文件分布较散
   - 始终应用（alwaysApply）：仅限安全红线/合规底线

2. **推荐参考表**（AI 灵活判断，参考以下映射表）：

AI 应根据以下因素综合判断：

- 质量标准内容的核心主题和适用场景
- **项目实际目录结构**（必须分析项目结构，不能套用固定模式）
- 内容是否与特定文件类型/路径强绑定
- 是否符合 Cursor Rules 的最佳实践（参考 `rules-guide.md`）

**推荐参考表**（仅供参考，AI 应灵活判断）：

| 关键词/主题     | 可能的推荐方式                      | 可能的 globs 示例（需根据项目实际调整）          |
| --------------- | ----------------------------------- | ------------------------------------------------ |
| 组件/Component  | fs（如果组件集中）或 i（如果分散）  | `**/components/**/*.tsx`（需验证项目结构）       |
| API/接口/路由   | fs（如果 API 集中）或 i（如果分散） | `**/api/**`, `**/routes/**`（需验证项目结构）    |
| SQL/数据库/迁移 | fs                                  | `**/*.sql`, `**/migrations/**`（需验证项目结构） |
| 安全/密钥/权限  | always（红线）或 i（建议）          | -                                                |
| 设计/UI/样式    | fs（如果设计文件集中）              | `**/design/**`, `**/styles/**`（需验证项目结构） |
| 通用/架构/原则  | i                                   | -                                                |

**重要**：

- 必须先分析项目实际目录结构，再推荐 globs
- 不能套用固定模式，必须根据项目实际情况调整
- 如果无法确定，优先推荐 i（智能判断）而非 fs（文件匹配）

3. **如果用户确认选择 B**，则直接进入规则创建流程（调用 rules-creator），无需再次确认配置。

### 9) 写入

根据用户选择的存储目标和推荐载体，写入对应位置：

- **如果选择 experience**：
  - 写入 `.cursor/.lingxi/context/experience/<tag>-<title>.md`
  - **自动更新 INDEX.md**：经验文件写入成功后，自动运行 `node scripts/validate-experience-index.js --update` 更新索引
    - 如果更新失败，输出错误信息，但不影响经验文件写入
    - 保持静默成功原则：更新成功时不输出确认信息
  - 触发 `experience-curator` 治理流程

- **如果选择 rules**：调用 `rules-creator` skill，创建或更新 `.cursor/rules/qs-{type}-{scope}/RULE.md`
- **如果选择其他载体**：按对应载体的写入规范执行

**注意**：治理已在步骤 7 执行，此处只需写入文件即可。

### 10) 清理

从暂存中移除已处理项；未写入项保留。

### 经验模板（必须包含）

- 触发条件（When to load）
- 问题现象（Symptom）
- 根因（Root cause）
- 解决方案（Fix）
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

- **如果选择 A（经验库）**：

  - `.cursor/.lingxi/context/experience/<tag>-<title>.md`
  - 更新 `.cursor/.lingxi/context/experience/INDEX.md`
  - 触发 `experience-curator` 治理流程

- **如果选择 B（规则库）**：
  - 调用 `rules-creator` skill，创建或更新 `.cursor/rules/qs-{type}-{scope}/RULE.md`
  - 更新 `.cursor/rules/quality-standards-index.md`
  - 更新 `.cursor/rules/quality-standards-schema.md`

索引写入要求（与 INDEX 表头一致）：

- `Trigger (when to load)`：用于工程检索（关键词/场景）
- `Surface signal`：表层信号（让我应该警觉的味道）
- `Hidden risk`：隐含风险（真正会炸的点）

**注意**：冲突检测和治理已在步骤 3-7 完成，此处无需重复检测。
