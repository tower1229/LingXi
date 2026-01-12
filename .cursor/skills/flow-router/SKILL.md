---
name: flow-router
description: /flow 单入口路由与人工闸门（req→audit→plan→work→review→compound），负责阶段判断、循环菜单与推进确认。
---

# Flow Router

## When to Use

- 当用户输入 `/flow <REQ-xxx|描述>` 时
- 当需要判断当前 REQ 所处阶段、允许重复执行（例如 audit 多次）、并在推进前请求用户确认时

## Instructions

### 输入解析

- `/flow <描述>`：创建新需求并进入 req 阶段
- `/flow REQ-xxx`：继续该需求，读取状态并进入合适阶段
- `/flow 沉淀 ...` / `/flow 忽略沉淀`：处理 hooks 暂存的候选沉淀确认

### 状态机（SSoT 优先）

状态来源优先级：

1. `ai/requirements/INDEX.md` 的 `Status` / `Current Phase` / `Next Action`
2. `ai/requirements/in-progress/<REQ-xxx>.plan.md` 的 `状态摘要（Status Summary）`
3. 文件存在性推断：`<REQ>.md` / `<REQ>.plan.md` / `<REQ>.review.md`

### 阶段执行（调用对应 skills）

- **req**：调用 skill `req`
- **audit**：调用 skill `audit`
- **plan**：调用 skill `plan`
- **work**：调用 skill `work`
- **review**：调用 skill `review`
- **compound**：调用 skill `compound`

每个阶段执行前：

- 调用 skill `experience-index` 输出匹配的历史经验提醒（最小高信号）
- 必要时调用 skill `index-manager` 做 Fail Fast 的索引一致性检查

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

> Hooks 会在对话结束时弹出确认；用户必须用 `/flow 沉淀 ...` 明确确认后，才允许写入 `ai/context/experience/`。

