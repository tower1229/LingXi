# /init - 项目初始化命令

## 命令用途

引导式初始化 workflow 到新项目，快速建立项目上下文（技术栈、常用模式、开发规则、业务流程），并将这些信息沉淀到经验库（`.cursor/.lingxi/context/experience/`）、规则（`.cursor/rules/qs-*.mdc`）、业务上下文（`.cursor/.lingxi/context/business/`）和服务上下文（`.cursor/.lingxi/context/tech/services/`）中。

---

## 依赖的 Agent Skills

- `service-loader`：生成服务上下文文档
- `experience-depositor`：沉淀经验到经验库
- `rules-creator`：创建质量规则（如需要）

---

## 使用方式

```
/init
```

命令无需参数，通过对话式引导收集项目信息。

---

## 产物（必须写入）

- `.cursor/.lingxi/context/business/<topic>.md`（业务上下文文档，至少 1 个）
- `.cursor/.lingxi/context/tech/services/<service>.md`（服务上下文文档，如适用）
- `.cursor/.lingxi/context/experience/<tag>-<title>.md`（经验文档，如触发沉淀）
- `.cursor/.lingxi/context/session/pending-compounding-candidates.json`（经验候选暂存，如生成 EXP-CANDIDATE）
- `.cursor/.lingxi/context/experience/INDEX.md`（经验索引，如写入经验）
- `.cursor/rules/qs-*.mdc`（质量规则，如用户采纳质量准则建议）

---

## 执行流程

### 0) 命令目的说明（必须）

在开始执行前，必须明确说明：

- `/init` 命令的目的：建立项目上下文，快速让 AI 理解项目
- 将生成的文档类型：业务上下文、服务上下文、经验候选
- 执行流程概览：信息收集 → 文档生成 → 经验识别 → 沉淀确认

### 阶段 1：信息收集 + 即时识别经验候选

**并行执行**：

1. 收集项目信息（技术栈、项目结构、开发规范、业务流程等）
2. **同时识别经验候选**：
   - 技术栈选择理由（为什么选择某个技术栈）
   - 架构决策（为什么选择某个架构模式）
   - 开发规范取舍（为什么采用某个规范）
   - 输出 EXP-CANDIDATE 格式（静默输出，HTML 注释包裹）

**必须明确展示**以下信息（不仅收集，还要在对话中展示供用户确认）：

- **项目结构信息**（必须展示）：
  - 项目类型：前端/后端/全栈/库/工具等
  - 目录结构：主要目录及其用途
  - 入口文件：主要入口文件路径
  - 构建配置：构建工具和配置方式

- **技术栈信息**：编程语言、框架/库、数据库、其他技术组件
- **开发规范信息**：代码规范、测试规范、提交规范、文档规范
- **业务流程信息**（如适用）：核心业务领域、关键业务流程、业务规则
- **服务/模块信息**（如适用）：服务列表、服务职责、服务依赖

**输出要求**：

- 展示收集的信息供用户确认
- 静默输出识别的经验候选（EXP-CANDIDATE 格式）
- 不干扰对话流程

### 阶段 2：深入调查 + 持续识别经验候选

**执行内容**：

1. 根据用户指定的调查项进行深入调查
2. **同时回顾阶段 1 收集的信息**，补全遗漏的经验候选
3. 识别常见坑点、深层架构决策
4. 输出 EXP-CANDIDATE 格式

**关键要求**：

- 必须回顾阶段 1 的信息，不能只关注用户指定的调查项
- 确保阶段 1 识别的经验候选不被遗漏

### 阶段 3：汇总所有经验候选

**执行内容**：

1. 汇总阶段 1 和阶段 2 的所有 EXP-CANDIDATE
2. 去重和合并相似候选
3. 输出完整的经验候选列表（在对话中展示，包含核心信息）

**输出格式**：

```markdown
## 识别的经验候选

### 候选 1：[标题]

- **触发条件**：...
- **判断**：...
- **解决方案**：...
- **推荐载体**：experience

### 候选 2：[标题]

...
```

### 阶段 4：生成上下文文档

根据收集的信息，生成相应的上下文文档：

- **业务上下文文档**：使用 [Business Context 模板](../../../.cursor/.lingxi/context/business/references/business-context-template.md)，至少生成 1 个示例
- **服务上下文文档**（如适用）：调用 `service-loader` Skill 生成

### 阶段 5：沉淀经验（如适用）

如果用户选择沉淀经验候选，调用 `experience-depositor` Skill 处理沉淀流程。

### 阶段 6：生成初始化报告

输出初始化报告（在对话中输出摘要，而非只保存到文件），包含：

- 生成的文档列表
- 识别的经验候选列表（核心信息）
- 后续建议

---

## 委托给 Skills 的说明

本命令将以下任务委托给相应的 Skills：

- **生成服务上下文文档**：调用 `service-loader` Skill（参考 `.cursor/skills/service-loader/SKILL.md`）
- **沉淀经验到经验库**：调用 `experience-depositor` Skill（参考 `.cursor/skills/experience-depositor/SKILL.md`）
- **创建质量规则**（如需要）：通过 `experience-depositor` 间接调用 `rules-creator` Skill

---

## 输出要求

- 必须生成至少 1 个业务上下文文档
- 必须输出初始化报告（在对话中输出摘要）
- **如果识别到可沉淀知识点，必须输出 EXP-CANDIDATE 格式**：
  - 在阶段 1 和阶段 2 中，每次识别经验候选时，立即输出 EXP-CANDIDATE 格式（HTML 注释包裹，静默输出）
  - 在阶段 3 汇总时，在对话中展示经验候选的核心信息（trigger、decision、solution 等）
  - EXP-CANDIDATE 格式必须包含所有关键字段（taskId、stage、trigger、decision、solution、verify、pointers）
  - 对于 `/init` 命令，`taskId` 设为 `null`，`stage` 设为 `init`
- 最后用 3-6 行简短说明：生成了哪些文档、识别了哪些经验候选、如何选择沉淀（直接输入编号，如 `1,3`，由 `experience-depositor` 处理）
