---
name: init-executor
description: Agent 静默推断项目类型，按收集清单生成“初始化记忆笔记草稿”，并在用户确认后可选写入记忆库（默认不写入）。类型不向用户展示、无需确认或修正。
---

# Init Executor

## Quick Start

- **目标**：建立项目最小上下文并生成记忆候选清单，仅用户门控时写入。步骤：确保 workflow 骨架存在 → 静默推断项目类型 → common Must 五项理解 → 展示供确认 → 生成候选清单 → 用户 Q2 门控写入。

## 目标

- 为项目建立**业务理解 + 技术架构 + 运行心智模型**的最小上下文：**新项目**通过引导式收集；**已有文档的迭代期项目**优先从现有文档/代码中抽取，仅对缺失或不确定项向用户提问。
- 生成一份**连续编号**的“记忆候选清单”（包含 3-6 条草稿项；可选包含若干额外候选项），供用户校对与门控选择。
- 仅在用户明确选择写入时，才落盘到 `.cursor/.lingxi/memory/notes/` 并更新 `.cursor/.lingxi/memory/INDEX.md`。

## 依赖（SSoT）

- 类型化收集清单（SSoT）：`references/init-checklists.md`
- 记忆模板：`.cursor/.lingxi/memory/references/memory-note-template.md`
- Workflow 骨架（SSoT）：`references/workflow-skeleton.json`；模板与 INDEX 默认内容：`references/memory-note-template.default.md`、`references/INDEX.default.md`

## 输出与交互原则（必须）

- 执行时遵循 [workflow-output-principles](.cursor/skills/about-lingxi/references/workflow-output-principles.md)；只输出供用户决策/校对的内容（最小高信号）。
- **写入门控不可侵犯**：除非用户在 Q2 明确选择写入，否则只展示候选清单，不写入磁盘。
- **AI Native**：类型与 common 信息均优先从工作区推断或抽取；仅对无法推断/抽取或不确定的项向用户补充提问，避免硬编码关键词/复杂 if-else。

## 执行流程（按需）

### Step 0) 确保 workflow 骨架存在（优先执行）

在执行后续步骤前，必须先保证当前工作区内 `.cursor/.lingxi/` 骨架存在：

1. **读取** `references/workflow-skeleton.json`，获取 `workflowDirectories`、`workflowTemplateFiles`、`workflowIndexFiles`。
2. **创建目录**：若工作区根下 `.cursor/.lingxi/` 或任一 `workflowDirectories` 中的目录不存在，则按顺序创建（相对于工作区根，递归创建父目录）。
3. **写入模板文件**：若 `workflowTemplateFiles` 中某路径对应的文件不存在，则将该内容写入该路径；其中 `.cursor/.lingxi/memory/references/memory-note-template.md` 使用 `references/memory-note-template.default.md` 的内容。
4. **写入 INDEX 占位**：若 `workflowIndexFiles` 中某路径对应的文件不存在，则将 `references/INDEX.default.md` 的内容写入该路径（如 `.cursor/.lingxi/memory/INDEX.md`）。

上述操作均相对于**当前工作区根**；默认内容来自本 Skill 的 `references/` 下对应 .default 文件。执行时静默完成，不向用户输出步骤细节。

### Step 0.5) Agent 静默推断项目类型（不展示、不确认、不修正）

仅用于提高收集清单与草稿的准确率，**不向用户展示推断结果，也不接受用户确认或修正**。根据工作区内容推断项目类型（A–H，可多选）：

1. **读取**（工作区根）：`package.json`（若有）、`README`/`README.md`（若有）、`pyproject.toml`（若有）、根目录及一层子目录名列表；必要时扫 1～2 个关键配置文件（如 `next.config.*`、`vite.config.*`、`Dockerfile`）。不扫全仓，只取足以推断类型的信号。
2. **推断**：结合文件内容与目录结构做语义判断，从下表选取适用的类型（可多选）。推断结果仅内部使用，用于 Step 1 选取收集清单与 Step 3 类型特化草稿；若无法得到有效信号，按「通用（common 仅）」处理。

**类型推断信号参考**（非穷举，用于辅助语义判断）：

| 类型        | 可参考信号示例                                                                                                          |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| A Web       | `next.config.*` / `vite.config.*` / `nuxt.config.*`，`pages/`、`app/`（App Router），前端框架依赖（react、vue、svelte） |
| B 后端      | `express`/`fastify`/`koa`、`server/`/`api/` 目录、`Dockerfile` 暴露服务端口、README 中「API/微服务」                    |
| C 移动端    | `app.json`（Expo）、`android/`/`ios/`、`react-native`、Xcode/Android 工程结构                                           |
| D 数据&ETL  | `dbt_project.yml`、`dagster`/`airflow`、数据/ETL 相关依赖、调度脚本目录                                                 |
| E 库&SDK    | `package.json` 的 `main`/`exports` 且无 `bin`、`packages/*`（monorepo 库）、名称带 `-sdk`/`-lib`/`-core`                |
| F CLI       | `package.json` 的 `bin` 字段、名称/描述含「cli」「命令行」、根目录 `src/cli`/`commands`                                 |
| G 基建&平台 | `terraform/`、`k8s/`/`helm/`、多服务 `docker-compose.*`、README 中「平台/网关/IaC」                                     |
| H AI 应用   | 依赖中含 `openai`/`langchain`/`@anthropic` 等、README 中「LLM/Agent/评测」                                              |

类型枚举（仅 Agent 内部使用）：A) Web 应用 B) 后端服务 C) 移动端 D) 数据&ETL E) 库&SDK F) CLI 工具 G) 基建&平台 H) AI 应用。规则：全栈/前后端一体优先按 A+B；AI + Web/服务按 H +（A 或 B）。

### 1) 带着 common Must 五项理解项目，再按缺失决定是否提问

在向用户提问前，**带着下面 5 个问题理解整个项目**（如何读仓库、读哪些文件由你自主决定），得到一份 common 草稿（每项为一小段结论或“未找到”）。理解过程静默完成，不向用户输出。

**5 个问题**（与 init-checklists 的 common Must 对应）：(1) 项目解决什么问题、不做什么（goal + 非目标）；(2) 核心用户/角色与关键诉求（users）；(3) 1–3 条关键链路及失败兜底（flows）；(4) 风险优先级与最不可接受的失败（risks）；(5) 环境、发布与回滚方式（releaseEnv）。

**行为契约**：仅对草稿中**未找到或明显不确定**的项向用户提问；若五项均已填满且置信度足够，**不要先问这五个问题**，直接进入 Step 2，将“项目结构/技术栈/规范/业务模块”整理成一段供用户确认（可标注「根据项目文档整理，请确认或修正」）。用户确认或补充完 Must 后，再按需进入 Should；Optional 默认不追问，除非用户选择 Q1=C。从 `references/init-checklists.md` 读取通用骨架与**推断出的类型**的 Must → Should；类型不向用户询问。每个问题尽量让用户用“1-3 行”回答。

### 2) 展示“项目结构/技术栈/规范/业务模块”供确认

把收集到的信息整理成以下区块（用于校对）：

- 项目结构信息
- 技术栈信息
- 开发规范信息
- 业务/模块信息（如适用）

### 3) 生成初始化记忆笔记草稿（不写入）

使用模板 `.cursor/.lingxi/memory/references/memory-note-template.md` 生成 3-6 条草稿项，并与额外候选项合并为一份“记忆候选清单”（连续编号，不写入）：

- **最少必须包含**：
  - `MEM-project-goals-and-nongoals`（business）
  - `MEM-domain-glossary-and-core-entities`（business）
  - `MEM-architecture-overview`（tech）
- **强烈建议再补齐**：
  - `MEM-critical-user-flows`（business）
  - `MEM-local-dev-mental-model`（tech）
  - `MEM-release-and-environment-contract`（tech）

并根据**推断出的类型**，从 `references/init-checklists.md` 的 Draft targets 里补齐 0-2 份最关键的类型特化草稿（保持“少而准”）。

候选清单输出格式：

- **一个清单**：`## 记忆候选清单（含草稿项）`
- **连续编号**：从 1 开始递增（例如 1-10）
- **每条候选都可写入**，且至少包含：Meta、When to load、One-liner、Context/Decision（可短）、Pointers
- `Source` 统一填 `init`
- `Audience=project`、`Portability=project-only`（除非用户明确说要团队共享）
- 每条候选建议标注 `Type=draft|candidate`（仅用于阅读，不进入 Id）

### 4) 同屏双问（Q1 + Q2）

按 `/init` Command 的同屏双问格式输出，并解析用户输入：

- **Q1（必选）**：A/B/C/D
- **Q2（可选，缺省 S）**：S / All / 1,3

解析规则：

- 用户只回复 `A` 视为 `A; S`
- 用户只回复 `All` 之类的 Q2 选项时，必须追问补齐 Q1（不重复贴大段内容）

### 5) 可选写入（仅当 Q2 明确选择写入）

当且仅当 Q2 为 `All` / `1,3` 时：

- 从“记忆候选清单”中确定要写入的条目（`All` 为全部；`1,3` 为所选编号）
- 将待写入的候选通过**显式调用**交给 lingxi-memory 子代理：在提示中使用 `/lingxi-memory mode=remember input=<选中的条目或编号>`（或 `mode=init`，必要时在 input 或后续消息中传 `context`），或自然语言如「使用 lingxi-memory 子代理将选中的候选写入记忆库：<条目摘要或编号>」
- 子代理在独立上下文中完成治理与写入（合并优先、冲突否决；涉及删除/取代须用户在其对话内确认），直接读写 `.cursor/.lingxi/memory/notes/` 与 `.cursor/.lingxi/memory/INDEX.md`

主对话根据子代理返回展示一句结果或静默；写入失败时输出明确错误与解决方案。

### 6) 初始化报告（最小高信号）

输出 3-6 行摘要：

- 生成的草稿列表
- 若写入：写入的文件列表 + 是否更新 INDEX

（不展示推断的项目类型；类型仅用于内部收集与草稿生成。）
