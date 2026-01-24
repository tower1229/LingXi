---
name: init-executor
description: 按项目类型（A-H）引导式初始化：基于收集清单生成“初始化记忆笔记草稿”，并在用户确认后可选写入记忆库（默认不写入）。
---

# Init Executor

## 目标

- 为新项目快速建立**业务理解 + 技术架构 + 运行心智模型**的最小上下文
- 生成 3-6 份“初始化记忆笔记草稿”（至少 1 份 business），供用户校对
- 仅在用户明确选择写入时，才落盘到 `.cursor/.lingxi/memory/notes/` 并更新 `.cursor/.lingxi/memory/INDEX.md`

## 依赖（SSoT）

- 类型化收集清单（SSoT）：`references/init-checklists.md`
- 记忆模板：`.cursor/.lingxi/memory/references/memory-note-template.md`

## 输出与交互原则（必须）

- **静默成功**：不要输出执行过程、不要输出工具调用信息、不要输出“我将要做什么”的旁白
- **最小高信号**：只输出供用户决策/校对的内容
- **写入门控不可侵犯**：除非用户在 Q2 明确选择写入，否则只展示草稿，不写入磁盘
- **AI Native**：不要用关键词/正则/复杂 if-else 识别类型；用菜单 + 自然语言补充来判断

## 执行流程（按需）

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

使用模板 `.cursor/.lingxi/memory/references/memory-note-template.md` 生成 3-6 份草稿：

- **最少必须包含**：
  - `MEM-project-goals-and-nongoals`（business）
  - `MEM-domain-glossary-and-core-entities`（business）
  - `MEM-architecture-overview`（tech）
- **强烈建议再补齐**：
  - `MEM-critical-user-flows`（business）
  - `MEM-local-dev-mental-model`（tech）
  - `MEM-release-and-environment-contract`（tech）

并根据所选类型，从 `references/init-checklists.md` 的 Draft targets 里补齐 0-2 份最关键的类型特化草稿（保持“少而准”）。

草稿输出格式：
- 每份草稿在对话中完整展示（但可省略冗长背景，只保留 Meta/WhenToLoad/OneLiner/Decision/Signals/Pointers）
- `Source` 统一填 `init`
- `Audience=project`、`Portability=project-only`（除非用户明确说要团队共享）

### 4) 同屏双问（Q1 + Q2）

按 `/init` Command 的同屏双问格式输出，并解析用户输入：
- **Q1（必选）**：A/B/C/D
- **Q2（可选，缺省 S）**：S / N / All / 1,3

解析规则：
- 用户只回复 `A` 视为 `A; S`
- 用户只回复 `All` 之类的 Q2 选项时，必须追问补齐 Q1（不重复贴大段内容）

### 5) 可选写入（仅当 Q2 明确选择写入）

当且仅当 Q2 为 `N` / `All` / `1,3` 时：
- 先写入“初始化记忆笔记草稿”（项目级，写入 `.cursor/.lingxi/memory/notes/`）
- 更新 `.cursor/.lingxi/memory/INDEX.md`
- 若 Q2 为 `All` / `1,3`：再将“候选”交给 `memory-curator` 做治理与写入

写入失败时需要输出明确错误与解决方案；写入成功保持静默（只在最后报告中列出结果）。

### 6) 初始化报告（最小高信号）

输出 3-6 行摘要：
- 识别的项目类型
- 生成的草稿列表
- 若写入：写入的文件列表 + 是否更新 INDEX

