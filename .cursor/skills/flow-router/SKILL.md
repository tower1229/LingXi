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

**按需**（存量/多服务项目），`service-loader` 可生成服务上下文降低"考古成本"。

### 判据检查（必须）

在用户选择 B（进入下一阶段）后，必须检查可推进判据：

1. **读取检查清单**：从 `docs/02-design/gate-protocol.md` 读取对应阶段切换的检查清单
2. **执行检查**：按验证方式检查每个判据是否满足
3. **输出结果**：
   - **如果所有判据满足**：内部检查，不输出检查清单，直接进入下一阶段（节省 token）
   - **如果有判据不满足**：输出完整检查清单（标注未满足项），提供选项（强制推进 / 回退 / 继续本阶段）

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
