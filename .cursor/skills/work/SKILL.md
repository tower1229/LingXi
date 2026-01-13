---
name: work
description: 此 Skill 按 Plan 执行实现并持续验证。当 plan 生成完成且用户确认开始 work 时激活，回写 plan 的任务勾选与 Worklog，必要时写 checkpoint，阶段推进需人工确认。
---

# Work

## Outputs (must write)

- 更新：`.workflow/requirements/in-progress/REQ-xxx.plan.md`（任务勾选 + Worklog + Status Summary）
- 按需新增：`.workflow/context/session/<REQ-xxx>-checkpoint-*.md`

## Instructions

### 0) Experience Index（强制）

进入代码编写前，`experience-index` 会自动匹配历史经验提醒。

### 1) 状态恢复

- 优先读取 plan 的 Status Summary
- 若存在 checkpoint，加载最新一个继续

### 2) 边做边验证（Fail Fast）

- 每完成一个“最小步”，立即记录验证方式与结果（PASS/FAIL）
- 核心逻辑优先即时验证，避免最后才发现基础模块有问题

### 2.1) 长任务续航：checkpoint / compaction（强烈建议）

当满足任一条件时，必须写 checkpoint（并尽量压缩到“最小高信号”）：

- 已完成一个可交付“最小步”（完成一个 task 或子任务）
- 讨论/排查超过 10-15 轮对话，信息开始分散
- 阶段切换前（work → review）
- 需要“换人/换会话/明天继续”

checkpoint 文件路径：

- `.workflow/context/session/<REQ-xxx>-checkpoint-<YYYYMMDD-HHMM>.md`

checkpoint 建议格式（结构化，便于交接）：

```markdown
# <REQ-xxx> Checkpoint - <YYYY-MM-DD HH:MM>

## 状态摘要（Status Summary）
- 阶段：work
- 进度：X/Y
- 当前任务：...
- 阻塞项：...

## 已完成（Done）
- ...

## 关键决策（Decisions）
- 决策：...
  - 原因：...
  - 影响：...

## 验证记录（Validation）
- [ ] 步骤：...
  - 结果：PASS/FAIL
  - 证据/输出：...

## 指针（Pointers）
- `path/to/file`: 为什么重要

## 下一步（Next）
- ...

## 复利候选（Compounding Candidates）
- ...
```

### 3) 回写规范（必须）

plan.md 中必须持续更新：

- Status Summary（阶段/进度/当前任务/阻塞项/上次更新）
- Worklog（做了什么 + 为什么 + 如何验证 + 结果 + 指针）
- Compounding Candidates（可沉淀点）

