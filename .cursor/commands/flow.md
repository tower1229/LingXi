# /flow - 单入口工作流：状态机 + 循环选项 + 人工闸门

## 命令用途

用一个入口 `/flow <REQ|描述>` 完成需求的全生命周期推进（Req → Audit → Plan → Work → Review → Compound），并且：

- **保留循环**：允许你在任意阶段反复执行（例如 audit 多次直到满意）
- **人工闸门**：阶段推进必须明确询问用户确认（不能“自动推进”）
- **产物落盘**：遵循既有 `.workflow/requirements/` 与 `.workflow/context/` 约定

## 前置要求（必须）

- **Cursor Nightly**：本工作流依赖 Agent Skills（仅 Nightly 渠道可用），详见 [Cursor Agent Skills](https://cursor.com/cn/docs/context/skills)。

## 依赖的 Agent Skills（质量来源，必须遵循）

> 说明：`/flow` 的“高质量提示词/模板/检查清单”不在本文件里重复维护，而是下沉到 `.cursor/skills/`，由 Agent 按需加载。
> `/flow` 在进入对应阶段时，**必须调用并遵循对应 Skill**，以保证输出质量稳定。

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
```

---

## 产物（必须落盘）

- `.workflow/requirements/in-progress/<REQ-xxx>.md`（Requirement）
- `.workflow/requirements/in-progress/<REQ-xxx>.plan.md`（Plan / 执行账本）
- `.workflow/requirements/in-progress/<REQ-xxx>.review.md`（Review）
- `.workflow/requirements/INDEX.md`（SSoT）
- `.workflow/context/experience/*`（经验沉淀，需用户确认）
- `.workflow/context/session/*`（checkpoint / 会话临时）

---

## 执行要点（入口 + 路由）

### 0) 解析用户意图（必须）

根据参数判断本次 `/flow` 进入哪条路径：

1. **确认沉淀路径**：`/flow 沉淀 ...` 或 `/flow 忽略沉淀`
2. **继续某个需求**：`/flow REQ-xxx`
3. **创建新需求**：`/flow <需求描述>`（无 REQ）

> **禁止**：在用户没有明确确认“沉淀”的情况下写入 `.workflow/context/experience/`。

### 1) 沉淀确认路径（/flow 沉淀 / 忽略沉淀）

**输入**：读取候选暂存文件（由 hooks 生成）：

- `.workflow/context/session/pending-compounding-candidates.json`

**行为**：

- 如果用户选择 **忽略沉淀**：删除该暂存文件并输出“已忽略”
- 如果用户选择 **沉淀**：
  - 按序处理选中的候选（1-based index）
  - 对每条候选，执行“即时沉淀”：
    - 从对话历史与候选描述中提取 Trigger / Symptom / Root cause / Fix / How to verify / Pointers
    - 按 `skill-experience-depositor.mdc` 落盘经验文件并更新 `.workflow/context/experience/INDEX.md`
  - 全部完成后删除暂存文件

**输出**：只需简短说明“沉淀了几条，文件路径在哪，下次触发条件是什么”。

### 2) 继续/创建需求路径（/flow REQ-xxx 或 /flow <描述>）

#### 2.1 Fail Fast：确保索引与目录结构存在

- 确保 `.workflow/requirements/INDEX.md` 表头符合 `skill-index-manager.mdc`
- 确保 `.workflow/context/session/` 与 `.workflow/workspace/` 目录存在（若不存在则创建）

#### 2.2 经验检索（强制执行：每次进入一个阶段前）

进入任一阶段前，必须先按 `skill-experience-index.mdc` 做经验检索，并用“最小高信号”方式提醒风险/背景指针。

#### 2.3 阶段路由（状态机）

**状态来源**（优先级从高到低）：

1. `.workflow/requirements/INDEX.md` 中该 REQ 的 `Current Phase` / `Status` / `Next Action`
2. `.workflow/requirements/in-progress/<REQ-xxx>.plan.md` 的 `状态摘要（Status Summary）`
3. 文件存在性推断（是否有 requirement/plan/review）

**阶段行为**（简述）：

- **req**：生成/更新 Requirement + 更新索引（Status = in-progress, Current Phase = req）
- **audit**：输出审查报告到对话（不落盘），并给出“可推进判据 + 未决点”；更新索引 Current Phase = audit（Status 可保持 in-progress）
- **plan**：生成/更新 plan.md（含 Status Summary/Tasks/Validation/Worklog/复利候选）；更新索引 Status = planned, Current Phase = plan
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

每次阶段输出完成后，必须先给出“是否允许推进”的**显式判据**，并把选择权交还给用户（人工闸门）：

- **req → plan**：Requirement 已落盘，且关键缺失项=0（若不为 0，则必须建议回到 req 补齐或再 audit 一轮）
- **audit → plan**：Blockers=0；未决问题有明确处理方式；用户确认“可以进入 plan”
- **plan → work**：plan 含 Tasks/Validation/Worklog/复利候选小节；用户确认“可以开始 work”
- **work → review**：Deliverables 关键项完成；验证记录可复现；用户确认“进入 review”
- **review → compound**：Blockers/High 已处理或明确拒绝并记录原因；用户确认“进入 compound”

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
