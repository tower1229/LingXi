# /flow - 单入口工作流：状态机 + 循环选项 + 人工闸门

## 命令用途

用一个入口 `/flow <REQ|描述>` 完成需求的全生命周期推进（Req → Plan → Audit → Work → Review → Compound），并且：

- **保留循环**：允许你在任意阶段反复执行（例如 audit 多次直到满意）
- **人工闸门**：阶段推进必须明确询问用户确认（不能“自动推进”）
- **产物落盘**：遵循既有 `.workflow/requirements/` 与 `.workflow/context/` 约定

## 前置要求（必须）

- **Cursor Nightly**：本工作流依赖 Agent Skills（仅 Nightly 渠道可用），详见 [Cursor Agent Skills](https://cursor.com/cn/docs/context/skills)。

## 依赖的 Agent Skills（质量来源）

> 说明：`/flow` 的“高质量提示词/模板/检查清单”不在本文件里重复维护，而是下沉到 `.cursor/skills/`，由 Agent 按需自动激活。
> `/flow` 在进入对应阶段时，**会根据阶段和上下文自动匹配相关 Skill（基于 description）**，以保证输出质量稳定。
>
> **魂的放大**：req/plan 阶段会按需调用 WebSearch 和 MCP 工具获取外部知识，让用户的简短意图获得行业最佳实践的加持。

- 路由：`flow-router`
- 阶段：
  - `req`
  - `audit`
  - `plan`
  - `work`
  - `review`
  - `compound`
- 底座：
  - `index-manager`
  - `experience-index`
  - `experience-depositor`

---

## 使用方式

```
/flow <需求描述>
/flow REQ-001
/flow 沉淀 1,3
/flow 忽略沉淀
/flow 采纳质量准则 1,3
/flow 忽略质量准则
```

---

## 产物（必须落盘）

- `.workflow/requirements/in-progress/<REQ-xxx>.md`（Requirement，进行中）
- `.workflow/requirements/in-progress/<REQ-xxx>.plan.md`（Plan / 执行账本，进行中）
- `.workflow/requirements/in-progress/<REQ-xxx>.review.md`（Review，进行中）
- `.workflow/requirements/completed/<REQ-xxx>.md`（Requirement，已完成归档）
- `.workflow/requirements/completed/<REQ-xxx>.plan.md`（Plan，已完成归档）
- `.workflow/requirements/completed/<REQ-xxx>.review.md`（Review，已完成归档）
- `.workflow/requirements/INDEX.md`（SSoT）
- `.workflow/context/experience/*`（经验沉淀，需用户确认）
- `.workflow/context/session/*`（checkpoint / 会话临时）

---

## 执行要点（入口 + 路由）

### 0) 解析用户意图（必须）

根据参数判断本次 `/flow` 进入哪条路径：

1. **确认沉淀路径**：`/flow 沉淀 ...` 或 `/flow 忽略沉淀`
2. **质量准则采纳路径**：`/flow 采纳质量准则 ...` 或 `/flow 忽略质量准则`
3. **继续某个需求**：`/flow REQ-xxx`
4. **创建新需求**：`/flow <需求描述>`（无 REQ）

> **禁止**：在用户没有明确确认"沉淀"的情况下写入 `.workflow/context/experience/`。
> **禁止**：在用户没有明确确认"采纳质量准则"的情况下写入 `.cursor/rules/qs-*`。

### 1) 沉淀确认路径（/flow 沉淀 / 忽略沉淀）

**输入**：读取候选暂存文件（由 hooks 生成）：

- `.workflow/context/session/pending-compounding-candidates.json`

**行为**：

- 如果用户选择 **忽略沉淀**：删除该暂存文件并输出“已忽略”
- 如果用户选择 **沉淀**：
  - 按序处理选中的候选（1-based index）
  - 对每条候选，先做“沉淀分流”（多落点，目标是复利最大化）：
    - **A. 经验文档**（默认）：遵循 `experience-depositor` 的指引落盘到 `.workflow/context/experience/`
    - **B. 自动拦截**：如果是高频且可自动判定的问题，优先沉淀为 hook/lint/CI（例如格式/约定检查、代码规范校验）
    - **C. Skill/流程升级**：如果是可复用流程或反复出现的步骤，优先沉淀为 skill（执行层）或扩展已有 skill
    - **D. 长期上下文补齐**：如果是“考古信息/服务边界/配置规范”，优先补齐 `.workflow/context/tech/services/` 或 `.workflow/context/business/`
  - 对每条候选，输出“推荐沉淀落点 + 理由 + 预期复利”，再执行具体落盘（仍然必须在用户确认的前提下）
  - **成长循环（自动触发）**：当本轮新增经验落盘完成后，必须自动执行：
    - **经验治理（自动执行，无需人工审核）**：生成候选合并组/候选取代链，并直接落盘执行（合并/取代/索引更新），随后输出变更报告与回滚说明
    - **质量准则建议（需人工审核）**：只给建议与选项，由用户决定是否采纳（可升级为 rules/skills/checklists）
  - 全部完成后删除暂存文件

**输出**：只需简短说明"沉淀了几条，文件路径在哪，下次触发条件是什么"。

### 1.1) 质量准则采纳路径（/flow 采纳质量准则 / 忽略质量准则）

**触发条件**：成长循环输出"质量准则建议"后，用户选择采纳或忽略。

**输入**：成长循环输出的质量准则建议列表（在对话上下文中），格式包含 Type、Scope、目标规则。

**行为**：

- 如果用户选择 **忽略质量准则**：输出"已忽略质量准则建议"，不做任何落盘
- 如果用户选择 **采纳质量准则**：
  1. 按序号解析用户选择的建议（1-based index，如 `1,3` 表示采纳第 1 和第 3 条）
  2. 对每条选中的建议，遵循 `rules-creator` 的指引执行规则创建：
     - 从对话上下文获取：准则内容、Type、Scope、来源经验
     - 类型确认与模板选择
     - 创建/更新规则文件
     - 配置正确的 frontmatter
     - 更新索引文件

**输出**：简短说明"采纳了几条质量准则建议，落盘到哪些文件"。

### 2) 继续/创建需求路径（/flow REQ-xxx 或 /flow <描述>）

#### 2.1 Fail Fast：确保索引与目录结构存在

- 确保 `.workflow/requirements/INDEX.md` 表头符合 `index-manager` 的要求
- 确保 `.workflow/context/session/` 与 `.workflow/workspace/` 目录存在（若不存在则创建）

#### 2.2 经验检索（强制执行：每次进入一个阶段前）

进入任一阶段前，`experience-index` 会自动匹配历史经验，并用"最小高信号"方式提醒风险/背景指针。

#### 2.3 阶段路由（状态机）

**状态来源**（优先级从高到低）：

1. `.workflow/requirements/INDEX.md` 中该 REQ 的 `Current Phase` / `Status` / `Next Action`
2. `.workflow/requirements/(in-progress|completed)/<REQ-xxx>.plan.md` 的 `状态摘要（Status Summary）`
3. 文件存在性推断（是否有 requirement/plan/review）

**阶段行为**（简述）：

- **req**：生成/更新 Requirement + 更新索引（Status = in-progress, Current Phase = req）
- **plan**：生成/更新 plan.md（含 Status Summary/Tasks/Validation/Worklog/复利候选）；更新索引 Status = planned, Current Phase = plan
- **audit**：审查 plan 的技术细节与风险，输出审查报告到对话（不落盘），并给出"可推进判据 + 未决点"；更新索引 Current Phase = audit（Status 可保持 planned）
- **work**：按 plan 执行实现、边做边验证、持续回写 plan 的任务勾选与 Worklog，并按需写 checkpoint；更新索引 Current Phase = work
- **review**：生成/更新 review.md（分维度分级 TODO），并把 Blockers/High 回写 plan；更新索引 Status = in-review 或 needs-fix, Current Phase = review
- **compound**：在 review 与 plan 输入充分时，做复利沉淀（经验/上下文/自动化），并推进索引 Status = completed, Current Phase = compound

#### 2.4 循环选项菜单（每轮结束必须输出）

每完成一个阶段（或阶段内一个“最小步”）后，必须输出一个简短菜单，让用户选择下一步（人工闸门）：

```text
你要怎么做？
A) 继续本阶段（例如再 audit 一次 / 继续 work 下一个 task）
B) 进入下一阶段（我会先复述推进判据，等待你确认）
C) 回退到上一阶段（说明原因与影响）
D) 退出
```

> **强约束**：未获得用户选择前，不得自动进入下一阶段。

#### 2.4.1 质量闸门（必须，避免过程偏差）

每次阶段输出完成后，必须先给出"是否允许推进"的**显式判据**，并把选择权交还给用户（人工闸门）：

- **req → plan**：Requirement 已落盘，且关键缺失项=0；用户确认"可以进入 plan"
- **plan → audit**：plan 含 Tasks/Validation/Worklog/复利候选小节；用户确认"可以进入 audit"
- **audit → work**：Blockers=0；技术风险已评估；未决问题有明确处理方式；用户确认"可以开始 work"
- **work → review**：Deliverables 关键项完成；验证记录可复现；用户确认"进入 review"
- **review → compound**：Blockers/High 已处理或明确拒绝并记录原因；用户确认"进入 compound"

> 目的：即使入口极简，阶段切换依然“可观测、可纠偏、可回退”，不会全靠模型自行推进。

#### 2.5 复利候选输出约定（用于 Hooks 自动发现）

当你在任意阶段识别到“可沉淀点”（例如：返工原因、隐性约束、可自动拦截点、典型排查结论），必须在当轮回复中追加一个小节：

```text
## 复利候选（Compounding Candidates）
- （候选）...
```

> Hooks 会在对话结束时自动弹出“是否沉淀”的确认；用户必须用 `/flow 沉淀 ...` 明确确认后，才允许写入 `.workflow/context/experience/`。

---

## 输出要求

- 必须落盘该轮产生的文件（如 req/plan/review/experience）
- 必须更新 `.workflow/requirements/INDEX.md`
- 最后只用 3-6 行说明：当前阶段、进度、阻塞项、下一步需要你选 A/B/C/D
