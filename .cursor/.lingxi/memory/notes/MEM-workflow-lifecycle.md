# Workflow 生命周期（业务上下文）

## Meta

- **Id**: MEM-workflow-lifecycle
- **Kind**: business
- **Status**: active
- **Strength**: hypothesis
- **Scope**: medium

## When to load

- 讨论灵犀工作流（req/plan/build/review）职责边界与阶段可跳过策略时
- 讨论记忆库（capture/curate/retrieve）的业务目的与门控原则时

## One-liner (for injection)

工作流阶段可独立执行、用户门控优先；记忆库以“更好的提取”为目标，捕获/治理/注入都要降低用户认知负担。

## Context

- **业务目标**：让 AI 具备项目级成长能力，让“判断/取舍/排查路径/验证方式”变成可复用资产\n+- **工作流边界**：灵犀提供机制与流程，不替代项目部署与外部集成，不侵入业务代码\n+- **核心约束**：\n+  - 用户决策权不可侵犯（关键写入/删除必须确认）\n+  - 索引是 SSoT（用于治理与定位），真实内容用于语义检索\n+
## Pointers

- `.cursor/commands/req.md` / `plan.md` / `build.md` / `review.md`\n+- `.cursor/commands/remember.md`（手动捕获入口）\n+- `.cursor/commands/init.md`（初始化入口）\n+
