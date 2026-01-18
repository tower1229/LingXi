# /init - 项目初始化命令

## 命令用途

引导式初始化 workflow 到新项目，快速建立项目上下文（技术栈、常用模式、开发规则、业务流程），并将这些信息沉淀到经验库（`.workflow/context/experience/`）、规则（`.cursor/rules/qs-*`）、业务上下文（`.workflow/context/business/`）和服务上下文（`.workflow/context/tech/services/`）中。

---

## 前置要求（必须）

- **Cursor Nightly**：本工作流依赖 Agent Skills（仅 Nightly 渠道可用）
- **项目已安装 workflow**：确保 `.workflow/` 目录结构已存在

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

- `.workflow/context/business/<topic>.md`（业务上下文文档，至少 1 个）
- `.workflow/context/tech/services/<service>.md`（服务上下文文档，如适用）
- `.workflow/context/experience/<tag>-<title>.md`（经验文档，如触发沉淀）
- `.workflow/context/session/pending-compounding-candidates.json`（经验候选暂存，如生成 EXP-CANDIDATE）
- `.workflow/context/experience/INDEX.md`（经验索引，如写入经验）
- `.cursor/rules/qs-*`（质量规则，如用户采纳质量准则建议）

---

## 执行流程

### 1) 引导式收集项目信息

通过对话式引导，收集以下信息：

- **技术栈信息**：编程语言、框架/库、数据库、其他技术组件
- **项目结构信息**：项目类型、目录结构、入口文件
- **开发规范信息**：代码规范、测试规范、提交规范、文档规范
- **业务流程信息**（如适用）：核心业务领域、关键业务流程、业务规则
- **服务/模块信息**（如适用）：服务列表、服务职责、服务依赖

### 2) 生成上下文文档

根据收集的信息，生成相应的上下文文档：

- **业务上下文文档**：使用 [Business Context 模板](../../.workflow/context/business/references/business-context-template.md)，至少生成 1 个示例
- **服务上下文文档**（如适用）：调用 `service-loader` Skill 生成

### 3) 识别并输出经验候选

在初始化过程中，识别可沉淀的知识点（技术栈选择理由、架构决策、开发规范、常见坑点），输出 EXP-CANDIDATE 格式的候选。

### 4) 沉淀经验（如适用）

如果用户选择沉淀经验候选，调用 `experience-depositor` Skill 处理沉淀流程。

### 5) 生成初始化报告

输出初始化报告，包含生成的文档列表、经验候选列表、后续建议。

---

## 委托给 Skills 的说明

本命令将以下任务委托给相应的 Skills：

- **生成服务上下文文档**：调用 `service-loader` Skill（参考 `.cursor/skills/service-loader/SKILL.md`）
- **沉淀经验到经验库**：调用 `experience-depositor` Skill（参考 `.cursor/skills/experience-depositor/SKILL.md`）
- **创建质量规则**（如需要）：通过 `experience-depositor` 间接调用 `rules-creator` Skill

---

## 输出要求

- 必须生成至少 1 个业务上下文文档
- 必须输出初始化报告
- 如果识别到可沉淀知识点，必须输出 EXP-CANDIDATE
- 最后用 3-6 行简短说明：生成了哪些文档、识别了哪些经验候选、如何选择沉淀（直接输入编号，如 `1,3`，由 `experience-depositor` 处理）

---

## 与需求工作流的区别

| 维度 | `/init` | `/req`、`/plan`、`/build`、`/review` |
|-----|---------|---------|
| **使用频率** | 低频（仅项目初始化时） | 高频（日常需求推进） |
| **使用场景** | 项目初始化、上下文建立 | 需求全生命周期推进 |
| **产物** | 上下文文档、经验候选 | 需求三件套、经验沉淀 |
| **用户交互** | 引导式收集项目信息 | 需求推进、阶段流转 |

两者互补，不冲突。`/init` 用于项目初始化建立上下文，需求工作流用于日常开发任务。

---
