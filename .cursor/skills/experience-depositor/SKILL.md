---
name: experience-depositor
description: 将“过程中的坑/隐性约束/排查结论”沉淀到 .workflow/context/experience，并维护 INDEX；支持冲突检测与 deprecated 处理。
---

# Experience Depositor

## When to Use

- 用户确认：`/flow 沉淀 ...`
- 或用户手动：`/remember ...`（可选兼容）

## Instructions

### 输入来源（优先级）

1. `.workflow/context/session/pending-compounding-candidates.json`（hooks 暂存候选）
2. `.workflow/requirements/in-progress/<REQ-xxx>.plan.md` 的 Compounding Candidates
3. plan Worklog / review 复利候选（必要时）

### 经验模板（必须包含）

- 触发条件（When to load）
- 问题现象（Symptom）
- 根因（Root cause）
- 解决方案（Fix）
- 校验方式（How to verify）
- 关联指针（Pointers）

落盘：

- `.workflow/context/experience/<tag>-<title>.md`
- 更新 `.workflow/context/experience/INDEX.md`

### 冲突检测（必须）

沉淀前读取 INDEX 中所有 active 经验，判断：

- 触发条件相同/相似，且解决方案矛盾 → 冲突：旧经验标记 deprecated，新经验记录替代关系
- 触发条件相近且解决方案相同/相似 → 重复：默认合并（或请求用户确认合并策略）

