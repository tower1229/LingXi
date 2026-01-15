# /flow - 单入口工作流

## 执行方式（强制）

**必须首先读取并遵循 `.cursor/skills/flow-router/SKILL.md`**。

本文档仅提供命令概述，执行逻辑在 Skill 中定义。

---

## 命令用途

用一个入口 `/flow` 完成需求的全生命周期推进（Req → Plan → Audit → Work → Review → Archive）。

核心特性：

- **保留循环**：允许在任意阶段反复执行
- **人工闸门**：阶段推进必须用户确认
- **产物写入**：遵循 `.workflow/requirements/` 约定

## 前置要求

- **Cursor Nightly**：本工作流依赖 Agent Skills（仅 Nightly 渠道可用）

## 使用方式

```
/flow <需求描述>        # 创建新需求
/flow REQ-xxx           # 继续已有需求
/flow                   # 自动查找进行中任务
```

**注意**：`/flow` 命令只支持以上三种用法。

## 依赖的 Agent Skills

| 类别 | Skills                                         |
| ---- | ---------------------------------------------- |
| 路由 | `flow-router`                                  |
| 阶段 | `req` `plan` `audit` `work` `review` `archive` |
| 底座 | `index-manager` `experience-index`             |

## 产物

- `.workflow/requirements/in-progress/<REQ-xxx>.md` / `.plan.md` / `.review.md`
- `.workflow/requirements/completed/<REQ-xxx>.md` / `.plan.md` / `.review.md`
- `.workflow/requirements/INDEX.md`（SSoT）
- `.workflow/context/session/*`（checkpoint）

## 故障排查

### 问题：`/flow <描述>` 没有进入 req 阶段

**可能原因**：

- AI 未正确激活 flow-router skill
- 描述被误解为其他类型的任务

**解决方案**：

1. 确认 `.cursor/skills/flow-router/SKILL.md` 文件存在
2. 重新输入 `/flow <描述>`，确保描述清晰
3. 如果问题持续，尝试使用更明确的描述前缀，如 `/flow 需求：实现用户登录`

### 问题：`/flow` 空参数没有返回进行中任务

**可能原因**：

- INDEX.md 中没有 Status != completed 的任务
- AI 未正确读取 INDEX.md

**解决方案**：

1. 检查 `.workflow/requirements/INDEX.md` 是否有进行中的任务
2. 如果有任务但未显示，尝试使用 `/flow REQ-xxx` 直接指定任务
