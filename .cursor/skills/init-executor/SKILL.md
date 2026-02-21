---
name: init-executor
description: 按项目类型（A-H）引导式初始化：基于收集清单生成“初始化记忆笔记草稿”，并在用户确认后可选写入记忆库（默认不写入）。
---

# Init Executor

## 目标

- 为新项目快速建立**业务理解 + 技术架构 + 运行心智模型**的最小上下文
- 生成一份**连续编号**的“记忆候选清单”（包含 3-6 条草稿项；可选包含若干额外候选项），供用户校对与门控选择
- 仅在用户明确选择写入时，才落盘到 `.cursor/.lingxi/memory/notes/` 并更新 `.cursor/.lingxi/memory/INDEX.md`

## 依赖（SSoT）

- 类型化收集清单（SSoT）：`references/init-checklists.md`
- 记忆模板：`.cursor/.lingxi/memory/references/memory-note-template.md`
- Workflow 骨架（SSoT）：`references/workflow-skeleton.json`；模板与 INDEX 默认内容：`references/memory-note-template.default.md`、`references/INDEX.default.md`

## 输出与交互原则（必须）

- **静默成功**：不要输出执行过程、不要输出工具调用信息、不要输出“我将要做什么”的旁白
- **最小高信号**：只输出供用户决策/校对的内容
- **写入门控不可侵犯**：除非用户在 Q2 明确选择写入，否则只展示候选清单，不写入磁盘
- **AI Native**：不要用关键词/正则/复杂 if-else 识别类型；用菜单 + 自然语言补充来判断

## 执行流程（按需）

### Step 0) 确保 workflow 骨架存在（优先执行）

在执行后续步骤前，必须先保证当前工作区内 `.cursor/.lingxi/` 骨架存在：

1. **读取** `references/workflow-skeleton.json`，获取 `workflowDirectories`、`workflowTemplateFiles`、`workflowIndexFiles`。
2. **创建目录**：若工作区根下 `.cursor/.lingxi/` 或任一 `workflowDirectories` 中的目录不存在，则按顺序创建（相对于工作区根，递归创建父目录）。
3. **写入模板文件**：若 `workflowTemplateFiles` 中某路径对应的文件不存在，则将该内容写入该路径；其中 `.cursor/.lingxi/memory/references/memory-note-template.md` 使用 `references/memory-note-template.default.md` 的内容。
4. **写入 INDEX 占位**：若 `workflowIndexFiles` 中某路径对应的文件不存在，则将 `references/INDEX.default.md` 的内容写入该路径（如 `.cursor/.lingxi/memory/INDEX.md`）。

上述操作均相对于**当前工作区根**；默认内容来自本 Skill 的 `references/` 下对应 .default 文件。执行时静默完成，不向用户输出步骤细节。

### 0) 项目类型选择（A-H，可多选）

输出菜单并让用户选择（允许多选）：

- A) Web 应用（SPA/SSR/全栈）
- B) 后端服务（API/Worker/微服务）
- C) 移动端
- D) 数据&ETL
- E) 库&SDK
- F) CLI 工具
- G) 基建&平台
- H) AI 应用

规则：
- 用户描述“全栈/前后端一体”时，优先按 A+B
- 用户描述“AI + Web/服务”时，按 H +（A 或 B）

### 1) 按清单收集信息（渐进式披露）

从 `references/init-checklists.md` 读取：
- 通用骨架（common.*）Must → Should
- 所选类型的 Must → Should

要求：
- 先问 Must，用户答完再进入 Should；Optional 默认不追问，除非用户选择“继续深入”（对应 Q1=C）
- 每个问题尽量让用户用“1-3 行”回答，减少负担

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

并根据所选类型，从 `references/init-checklists.md` 的 Draft targets 里补齐 0-2 份最关键的类型特化草稿（保持“少而准”）。

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
- 识别的项目类型
- 生成的草稿列表
- 若写入：写入的文件列表 + 是否更新 INDEX

