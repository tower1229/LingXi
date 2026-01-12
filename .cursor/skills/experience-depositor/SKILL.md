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

### 0) 沉淀分流（多落点，优先复利最大化）

对每条候选先判断应沉淀到哪里（可多选，但默认只选 ROI 最高的一个）：

- **经验文档（默认）**：写入 `.workflow/context/experience/`（适合“容易忘、下次会遇到、需要提醒/指针”的知识）
- **规则/自动拦截**：如果可以自动判定且高频，优先沉淀为 hook/lint/CI（把人工检查前移）
- **Skill/流程升级**：如果是可复用流程或重复步骤，优先沉淀为新 skill 或扩展现有 skill（降低决策疲劳）
- **长期上下文补齐**：如果属于“考古/服务边界/配置规范”，优先补齐 `.workflow/context/tech/services/` 或 `.workflow/context/business/`

输出要求：对每条候选给出“落点选择 + 理由 + 预期收益（下次如何变快/变稳）”。

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

