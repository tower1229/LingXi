---
name: experience-depositor
description: 此 Skill 将学习成果、约束条件和调试结论沉淀到 .workflow/context/experience。当用户通过 /remember ... 命令提取新经验时激活，或当用户直接输入编号选择候选经验（如 1,3）时激活。
---

# Experience Depositor

## Inputs（从上下文获取）

1. `.workflow/context/session/pending-compounding-candidates.json`（由 EXP-CANDIDATE + experience-collector 生成）
2. `.workflow/requirements/in-progress/<REQ-xxx>.plan.md` 的 Compounding Candidates
3. plan Worklog / review 复利候选（必要时）
4. 用户输入（可能是编号选择，如 `1,3` 或 `1 3`）

## Instructions

### -1) 解析用户输入（编号选择优先）

**如果用户输入是编号格式**（如 `1,3`、`1 3`、`1,2,3`、`全部`、`all` 等），优先按编号选择候选：

> **注意**：编号选择通常直接输入即可（如 `1,3`），无需 `/remember` 前缀。如果用户使用 `/remember 1,3`，也支持，但直接输入编号更简单。

1. **读取候选列表**：从 `.workflow/context/session/pending-compounding-candidates.json` 读取所有候选
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

### 0) 沉淀分流（多落点，优先复利最大化）

对每条候选先判断应沉淀到哪里（可多选，但默认只选 ROI 最高的一个）：

- **经验文档（默认）**：写入 `.workflow/context/experience/`（适合"容易忘、下次会遇到、需要提醒/指针"的知识）
- **规则/自动拦截**：如果可以自动判定且高频，优先沉淀为 hook/lint/CI（把人工检查前移）
- **Skill/流程升级**：如果是可复用流程或重复步骤，优先沉淀为新 skill 或扩展现有 skill（降低决策疲劳）
- **长期上下文补齐**：如果属于"考古/服务边界/配置规范"，优先补齐 `.workflow/context/tech/services/` 或 `.workflow/context/business/`

输出要求：对每条候选给出"落点选择 + 理由 + 预期收益（下次如何变快/变稳）"。

**注意**：如果选择"经验文档"或"规则/自动拦截"，需要在后续步骤中让用户选择存储目标（经验库或规则库）。

### 0.0) 成长过滤器（强制：决定进 session 还是进 experience）

在决定"写入经验文档（长期）"之前，对每条候选先回答一个问题：

> **如果我一年后在完全不同的项目里再遇到类似局面，这条信息还能帮我提前做出正确判断吗？**

- 若答案是 **否**：不写入 experience，改为沉淀到 **session/worklog**（项目记录），并说明原因
- 若答案是 **是**：允许写入 experience（长期判断资产）

> 目的：避免 experience 退化为"事实堆叠/案例百科"，把长期资产留给"可迁移的判断结构"。

### 0.1) 存储目标选择（新增：在预览确认阶段）

在决定写入经验文档（长期）之前，需要让用户选择存储目标：

- **选项 A：存入经验库**：写入 `.workflow/context/experience/`，下次匹配时作为提醒
- **选项 B：存入规则库**：写入 `.cursor/rules/qs-*/`，作为 Cursor 规则自动加载

**预览输出格式**（在生成经验预览时同时展示）：

```markdown
## 质量标准预览

### 内容摘要

- **标题**：...
- **触发条件**：...
- **核心判断**：...

### 存储目标选择

- **A) 存入经验库**：写入 .workflow/context/experience/，下次匹配时作为提醒

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

### 0.2) 成长循环（仅限经验库，每次新增经验后触发）

当本次沉淀**实际新增**了经验文件（写入 `.workflow/context/experience/`）后，需执行 `experience-curator` 的治理流程。

**experience-curator 执行内容**：

1. **经验治理（自动执行，无需人工审核）**

   - 备份 INDEX → `INDEX.md.bak`
   - 评估新经验与现有经验的关系，智能判断合并/取代/保持独立
   - 当识别到强相似信号（Tag 相同、Decision 相似、Trigger 大量重叠、Title 语义相似）时，执行合并或取代
   - 建立 `Replaces/ReplacedBy` 追溯关系，更新 INDEX（Scope/Strength 取更优值）
   - 输出变更报告（动作/理由/影响/回滚命令）

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

> 目的：确保经验一定能上升为"判断结构"，而不是仅成为"做过什么/怎么做"的文档。

写入（根据存储目标选择）：

- **如果选择 A（经验库）**：

  - `.workflow/context/experience/<tag>-<title>.md`
  - 更新 `.workflow/context/experience/INDEX.md`
  - 触发 `experience-curator` 治理流程

- **如果选择 B（规则库）**：
  - 调用 `rules-creator` skill，创建或更新 `.cursor/rules/qs-{type}-{scope}/RULE.md`
  - 更新 `.cursor/rules/quality-standards-index.md`
  - 更新 `.cursor/rules/quality-standards-schema.md`

索引写入要求（与 INDEX 表头一致）：

- `Trigger (when to load)`：用于工程检索（关键词/场景）
- `Surface signal`：表层信号（让我应该警觉的味道）
- `Hidden risk`：隐含风险（真正会炸的点）

### 冲突检测（必须）

沉淀前读取 INDEX 中所有 active 经验，判断：

- 触发条件相同/相似，且解决方案矛盾 → 冲突：旧经验标记 deprecated，新经验记录替代关系
- 触发条件相近且解决方案相同/相似 → 重复：默认合并（或请求用户确认合并策略）
