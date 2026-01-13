---
name: flow-router
description: 此 Skill 路由 /flow 命令，驱动工作流阶段流转（req→plan→audit→work→review→compound）。当用户输入 /flow <REQ-xxx|描述> 命令时激活，负责判断当前阶段、支持重复执行（如 audit 多次）、并在推进前请求用户确认（人工闸门）。
---

# Flow Router

## Instructions

### 输入解析

- `/flow <描述>`：创建新需求并进入 req 阶段
- `/flow REQ-xxx`：继续该需求，读取状态并进入合适阶段
- `/flow 沉淀 ...` / `/flow 忽略沉淀`：处理 hooks 暂存的候选沉淀确认

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
| compound | `compound` | 复利沉淀 |

Agent 会根据阶段自动激活相关 skill（基于 skill 的 description 匹配）。

**每个阶段执行前**，`experience-index` 会自动匹配历史经验提醒。

**按需**（存量/多服务项目），`service-loader` 可生成服务上下文降低"考古成本"。

### 人工闸门（必须）

每一轮结束都必须输出一个菜单，让用户选择下一步（不能自动推进）：

```text
你要怎么做？
A) 继续本阶段（例如再 audit 一次 / 继续 work 下一个 task）
B) 进入下一阶段（我会先复述推进判据，等待你确认）
C) 回退到上一阶段（说明原因与影响）
D) 退出
```

### 复利候选（用于 hooks 自动发现）

当你识别到可沉淀点时，在回复中追加：

```text
## 复利候选（Compounding Candidates）
- （候选）...
```

> Hooks 会在对话结束时弹出确认；用户必须用 `/flow 沉淀 ...` 明确确认后，才允许写入 `.workflow/context/experience/`。
