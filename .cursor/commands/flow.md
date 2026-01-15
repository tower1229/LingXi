# /flow - 单入口工作流

## 执行方式（强制）

**必须首先读取并遵循 `.cursor/skills/flow-router/SKILL.md`**。

本文档仅提供命令概述，执行逻辑在 Skill 中定义。

---

## 命令用途

用一个入口 `/flow <REQ|描述>` 完成需求的全生命周期推进（Req → Plan → Audit → Work → Review → Archive）。

核心特性：
- **保留循环**：允许在任意阶段反复执行
- **人工闸门**：阶段推进必须用户确认
- **产物写入**：遵循 `.workflow/requirements/` 约定

## 前置要求

- **Cursor Nightly**：本工作流依赖 Agent Skills（仅 Nightly 渠道可用）

## 使用方式

```
/flow <需求描述>        # 创建新需求
/flow REQ-001           # 继续已有需求
/flow 沉淀 1,3          # 确认沉淀候选
/flow 忽略沉淀          # 忽略沉淀候选
/flow 采纳质量准则 1,3  # 采纳质量准则建议
/flow 忽略质量准则      # 忽略质量准则建议
```

## 依赖的 Agent Skills

| 类别 | Skills |
|------|--------|
| 路由 | `flow-router` |
| 阶段 | `req` `plan` `audit` `work` `review` `archive` |
| 底座 | `index-manager` `experience-index` `experience-collector` `experience-depositor` |

## 产物

- `.workflow/requirements/in-progress/<REQ-xxx>.md` / `.plan.md` / `.review.md`
- `.workflow/requirements/completed/<REQ-xxx>.md` / `.plan.md` / `.review.md`
- `.workflow/requirements/INDEX.md`（SSoT）
- `.workflow/context/experience/*`（需用户确认）
- `.workflow/context/session/*`（checkpoint）
