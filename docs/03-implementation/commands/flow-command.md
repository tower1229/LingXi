# /flow 命令实现细节

## 概述

`/flow` 是 LingXi workflow 的单入口命令，负责驱动需求的全生命周期推进。

## 源码位置

`.cursor/commands/flow.md`

## 输入解析

### 四类意图

`/flow` 支持四类意图：

1. **创建新需求**：`/flow <需求描述>` → 进入 `req`
2. **继续既有需求**：`/flow REQ-xxx` → 读取 SSoT / plan 状态决定阶段
3. **确认沉淀**：`/flow 沉淀 1,3` / `/flow 沉淀 全部` / `/flow 忽略沉淀`
4. **采纳质量准则**：`/flow 采纳质量准则 1,3` / `/flow 忽略质量准则`

### 解析逻辑

```text
if (参数以"沉淀"开头) {
  进入沉淀确认路径
} else if (参数以"采纳质量准则"开头) {
  进入质量准则采纳路径
} else if (参数匹配 REQ-xxx 格式) {
  进入继续需求路径
} else {
  进入创建新需求路径
}
```

## 沉淀确认路径

### 输入

读取候选暂存（由 EXP-CANDIDATE + experience-collector 生成）：

- `.workflow/context/session/pending-compounding-candidates.json`

### 行为

- **忽略沉淀**：删除该暂存文件并输出"已忽略"
- **沉淀**：
  - 由 `experience-depositor` 展示候选摘要，支持全选/部分选择
  - `experience-depositor` 执行沉淀分流（经验文档 / hook|lint|CI / skill 升级 / 服务上下文），并写入 experience/INDEX（需用户确认）
  - 若新增经验，自动触发 `experience-curator`（合并/取代 + 治理报告 + 质量准则建议）
  - 处理完所选候选后，从暂存中移除；未选项保留

### 输出

只需简短说明"沉淀了几条，文件路径在哪，下次触发条件是什么"。

## 质量准则采纳路径

### 触发条件

成长循环输出"质量准则建议"后，用户选择采纳或忽略。

### 输入

成长循环输出的质量准则建议列表（在对话上下文中），格式包含 Type、Scope、目标规则。

### 行为

- **忽略质量准则**：输出"已忽略质量准则建议"，不做任何写入
- **采纳质量准则**：
  1. 按序号解析用户选择的建议（1-based index，如 `1,3` 表示采纳第 1 和第 3 条）
  2. 对每条选中的建议，遵循 `rules-creator` 的指引执行规则创建：
     - 从对话上下文获取：准则内容、Type、Scope、来源经验
     - 类型确认与模板选择
     - 创建/更新规则文件
     - 配置正确的 frontmatter
     - 更新索引文件

### 输出

简短说明"采纳了几条质量准则建议，写入到哪些文件"。

## 继续/创建需求路径

### Fail Fast

确保索引与目录结构存在：

- 确保 `.workflow/requirements/INDEX.md` 表头符合 `index-manager` 的要求
- 确保 `.workflow/context/session/` 与 `.workflow/workspace/` 目录存在（若不存在则创建）

### 经验检索（强制执行）

进入任一阶段前，`experience-index` 会自动匹配历史经验，并用"最小高信号"方式提醒风险/背景指针。

### 状态机路由

**状态来源**（优先级从高到低）：

1. `.workflow/requirements/INDEX.md` 中该 REQ 的 `Current Phase` / `Status` / `Next Action`
2. `.workflow/requirements/(in-progress|completed)/<REQ-xxx>.plan.md` 的 `状态摘要（Status Summary）`
3. 文件存在性推断（是否有 requirement/plan/review）

**阶段行为**（简述）：

- **req**：生成/更新 Requirement + 更新索引（Status = in-progress, Current Phase = req）
- **plan**：生成/更新 plan.md（含 Status Summary/Tasks/Validation/Worklog/复利候选）；更新索引 Status = planned, Current Phase = plan
- **audit**：审查 plan 的技术细节与风险，输出审查报告到对话（不写入），并给出"可推进判据 + 未决点"；更新索引 Current Phase = audit（Status 可保持 planned）
- **work**：按 plan 执行实现、边做边验证、持续回写 plan 的任务勾选与 Worklog，并按需写 checkpoint；更新索引 Current Phase = work
- **review**：生成/更新 review.md（分维度分级 TODO），并把 Blockers/High 回写 plan；更新索引 Status = in-review 或 needs-fix, Current Phase = review
- **archive**：当用户明确确认任务完成（Status = completed）时激活，负责归档 REQ 三件套和更新索引

### 循环选项菜单

每完成一个阶段（或阶段内一个"最小步"）后，必须输出一个简短菜单，让用户选择下一步（人工闸门）：

```text
你要怎么做？
A) 继续本阶段（例如再 audit 一次 / 继续 work 下一个 task）
B) 进入下一阶段（我会先复述推进判据，等待你确认）
C) 回退到上一阶段（说明原因与影响）
D) 退出
```

**强约束**：未获得用户选择前，不得自动进入下一阶段。

### 质量闸门

每次阶段输出完成后，必须先给出"是否允许推进"的**显式判据**，并把选择权交还给用户（人工闸门）：

- **req → plan**：Requirement 已写入，且关键缺失项=0；用户确认"可以进入 plan"
- **plan → audit**：plan 含 Tasks/Validation/Worklog/复利候选小节；用户确认"可以进入 audit"
- **audit → work**：Blockers=0；技术风险已评估；未决问题有明确处理方式；用户确认"可以开始 work"
- **work → review**：Deliverables 关键项完成；验证记录可复现；用户确认"进入 review"
- **review → archive**：Blockers/High 已处理或明确拒绝并记录原因；用户确认"任务完成"后进入 archive

## 经验候选输出约定

当出现纠正/取舍/根因/覆盖缺口等判断时，直接输出结构化候选（HTML 注释），由 subagent 处理：

```html
<!-- EXP-CANDIDATE
{
  "stage": "work",
  "trigger": "当发现 root cause 并更换方案",
  "decision": "实现/修复/接口/边界的取舍",
  "alternatives": ["原方案A（放弃，因为...）"],
  "signal": "判断依据/风险信号/失败证据",
  "solution": "新的实现/修复方案",
  "verify": "测试/验证步骤与结果期望",
  "pointers": ["path/to/file"],
  "notes": "可选补充"
}
-->
```

- `experience-collector` 背景收集并暂存；`experience-depositor` 在确认后写入。

## 产物（必须写入）

- `.workflow/requirements/in-progress/<REQ-xxx>.md`（Requirement，进行中）
- `.workflow/requirements/in-progress/<REQ-xxx>.plan.md`（Plan / 执行账本，进行中）
- `.workflow/requirements/in-progress/<REQ-xxx>.review.md`（Review，进行中）
- `.workflow/requirements/completed/<REQ-xxx>.md`（Requirement，已完成归档）
- `.workflow/requirements/completed/<REQ-xxx>.plan.md`（Plan，已完成归档）
- `.workflow/requirements/completed/<REQ-xxx>.review.md`（Review，已完成归档）
- `.workflow/requirements/INDEX.md`（SSoT）
- `.workflow/context/experience/*`（经验沉淀，需用户确认）
- `.workflow/context/session/*`（checkpoint / 会话临时）

## 输出要求

- 必须写入该轮产生的文件（如 req/plan/review/experience）
- 必须更新 `.workflow/requirements/INDEX.md`
- 最后只用 3-6 行说明：当前阶段、进度、阻塞项、下一步需要你选 A/B/C/D

## 参考

- [工作流生命周期设计](../02-design/workflow-lifecycle.md)
- [flow-router Skill](../../.cursor/skills/flow-router/SKILL.md)
