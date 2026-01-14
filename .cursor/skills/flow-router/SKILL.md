---
name: flow-router
description: 此 Skill 路由 /flow 命令，驱动工作流阶段流转（req→plan→audit→work→review→archive）。当用户输入 /flow <REQ-xxx|描述> 命令时激活，负责判断当前阶段、支持重复执行（如 audit 多次）、并在推进前请求用户确认（人工闸门）。
---

# Flow Router

## Instructions

### 输入解析

- `/flow <描述>`：创建新需求并进入 req 阶段
- `/flow REQ-xxx`：继续该需求，读取状态并进入合适阶段
- `/flow 沉淀 ...` / `/flow 忽略沉淀`：处理 subagent 暂存的候选沉淀确认

### 状态机（SSoT 优先）

状态来源优先级：

1. `.workflow/requirements/INDEX.md` 的 `Status` / `Current Phase` / `Next Action`
2. `.workflow/requirements/(in-progress|completed)/<REQ-xxx>.plan.md` 的 `状态摘要（Status Summary）`
3. 文件存在性推断：`<REQ>.md` / `<REQ>.plan.md` / `<REQ>.review.md`

### 阶段执行（遵循对应 skill 的指引）

每个阶段有对应的 skill 提供执行指南：

| 阶段 | 对应 Skill | 说明 |
|------|-----------|------|
| req | `req` | 需求澄清与定义 |
| plan | `plan` | 任务拆解与计划 |
| audit | `audit` | 技术审查与风险评估 |
| work | `work` | 实现与验证 |
| review | `review` | 多维度审查 |
| archive | `archive` | 归档 |

Agent 会根据阶段自动激活相关 skill（基于 skill 的 description 匹配）。

**每个阶段执行前**，`experience-index` 会自动匹配历史经验提醒。

**每个阶段开始前**，若上一阶段产生了通过低质量校验（噪音过滤 + 成长过滤器）的候选，则**全量展示**给用户，辅助即时价值判断。参考 `references/trade-off-record.md` 中的"候选全量展示格式模板"。

**候选回放流程**：
1. **检查暂存**：在进入任一阶段前（如 plan/audit/work/review/archive），检查 `session/pending-compounding-candidates.json`
2. **筛选候选**：筛选 `sourceStage`=上一阶段的候选（已通过噪音过滤 + 成长过滤器）
3. **去重**：若同一阶段产生多条相似候选（trigger/decision 高度相似），仅展示最新一条
4. **全量展示**：使用 `references/trade-off-record.md` 定义的展示格式模板，每条候选至少包含 trigger/decision/signal/solution/verify/pointers 等摘要字段（按时间倒序排列，最新优先）
5. **提供选项**：
   - A) 现在沉淀（进入 `/flow 沉淀` 流程）
   - B) 稍后再说（继续进入当前阶段）
   - C) 忽略这批（标记忽略）
6. **继续推进**：展示不等于写入，写入仍必须走 `/flow 沉淀` 确认式闸门

**按需**（存量/多服务项目），`service-loader` 可生成服务上下文降低"考古成本"。

### 判据检查（必须）

在用户选择 B（进入下一阶段）后，必须检查可推进判据：

1. **读取检查清单**：从 `references/gate-protocol.md` 读取对应阶段切换的检查清单
2. **执行检查**：按验证方式检查每个判据是否满足
3. **输出结果**：
   - **如果所有判据满足**：内部检查，不输出检查清单，直接进入下一阶段（节省 token）
   - **如果有判据不满足**：输出完整检查清单（标注未满足项），提供选项（强制推进 / 回退 / 继续本阶段）

### REQ 文档候选提取（req → plan 时）

在 `req → plan` 判据检查后、进入 plan 前（判据满足时），执行 REQ 文档候选提取：

1. **读取 REQ 文档**：读取 `.workflow/requirements/in-progress/REQ-xxx.md`
2. **提取高信号片段**：
   - 非目标（2.2 非目标）
   - 关键决策记录（6.2 关键决策记录）
   - 风险与对策（如有）
   - 验收口径背后的判断（验收检查清单中的取舍）
   - 业务边界/规则/术语（从需求描述中识别）
3. **生成候选**：
   - **EXP-CANDIDATE**（经验候选）：从非目标、关键决策记录、风险与对策、验收口径中提取，使用 `references/trade-off-record.md` 定义的格式转写
   - **SEM-CANDIDATE**（语义候选）：从业务边界/规则/术语中提取，使用 `references/semantics-capsule.md` 定义的 JSON 格式
4. **交给 experience-collector**：将候选交给 `experience-collector` 暂存（静默处理，不打断推进）
5. **继续进入 plan**：符合静默成功原则，不输出确认信息

**检查清单格式**（仅用于判据不满足时）：
```markdown
## 可推进判据检查清单（<当前阶段> → <下一阶段>）

| 判据 | 状态 | 说明 |
|------|------|------|
| 判据1 | ✅ 已满足 | ... |
| 判据2 | ❌ 未满足 | ...（未满足原因）|

**未满足项**：
- 判据2：具体未满足原因

**处理选项**：
A) 强制推进（需说明原因）
B) 回退到上一阶段
C) 继续本阶段（完善后再推进）
```

### 人工闸门（必须）

每一轮结束都必须输出一个菜单，让用户选择下一步（不能自动推进）：

```text
你要怎么做？
A) 继续本阶段（例如再 audit 一次 / 继续 work 下一个 task）
B) 进入下一阶段（我会检查推进判据，满足则直接进入）
C) 回退到上一阶段（说明原因与影响）
D) 退出
```

**注意**：用户选择 B 后，判据满足时，内部检查，不输出检查清单，直接进入下一阶段（节省 token）。判据不满足时，输出完整检查清单，展示未满足项。

### 阶段完成输出（静默成功原则）

**正常完成（无阻塞项）**：
- 仅输出一行状态 + 菜单，格式：
  ```
  ✅ <阶段> 完成 → <下一阶段> | A)继续 B)下一阶段 C)回退 D)退出
  ```

**有阻塞项**：
- 输出详细说明（保留完整信息），包含阻塞项详情和处理建议

### 复利候选（通过 EXP-CANDIDATE 自动收集）

当你识别到可沉淀点时，在回复中输出结构化注释：

```html
<!-- EXP-CANDIDATE {
  "stage": "work",
  "trigger": "...",
  "decision": "...",
  "solution": "...",
  "verify": "...",
  "pointers": [...]
} -->
```

> experience-collector 会在后台自动收集并暂存到 `.workflow/context/session/pending-compounding-candidates.json`；用户必须用 `/flow 沉淀 ...` 明确确认后，才允许写入 `.workflow/context/experience/`。
