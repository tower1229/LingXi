# /work - Work 阶段：按计划实现并持续验证

## 命令用途

按 `ai/requirements/in-progress/<REQ-xxx>.plan.md` 执行开发任务，持续更新勾选状态与验证记录。

## 依赖的技能型 rules（Skill）

- `.cursor/rules/skill-plan-manager.mdc`（Worklog/验证方式/任务勾选）
- `.cursor/rules/skill-context-engineering.mdc`
- `.cursor/rules/skill-experience-index.mdc`（自动检索与加载历史经验）
- `.cursor/rules/development-specifications.mdc`

## 使用方式

```
/work <REQ-xxx>
```

---

## 产物（必须落盘）

- 代码变更（视项目而定）
- `ai/requirements/in-progress/<REQ-xxx>.plan.md`（持续更新勾选与 Worklog）

## 执行要点（入口 + 路由）

- **输入**：读取 `ai/requirements/in-progress/<REQ-xxx>.plan.md`
- **经验检索（代码编写前必须执行）**：调用 `skill-experience-index.mdc`，根据当前任务与代码文件自动检索匹配的代码模式与风险，并主动提醒
- **执行节奏**：按 Tasks 顺序逐条推进；每完成一个可独立交付任务立刻做一次验证（测试/脚本/手工均可，但必须可复现）
- **持续更新**：将任务勾选与验证结果写回 plan 的 Worklog（以 `skill-plan-manager.mdc` 为准）
- **完成判断**：当 Deliverables 全部完成，进入 `/review <REQ-xxx>`

---

## 输出要求

- 必须实际完成代码修改/文件更新，而不是只给建议
- 最后用 3-6 行说明：完成了哪些任务、剩余哪些任务、当前验证状态、下一步建议

