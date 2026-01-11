# /plan - Plan 阶段：把需求变成可执行计划

## 命令用途

基于 `ai/requirements/in-progress/<REQ-xxx>.md` 生成可执行的开发计划（任务拆解 + 验证方式 + 交付物），并落盘。

## 依赖的技能型 rules（Skill）

- `.cursor/rules/skill-index-manager.mdc`
- `.cursor/rules/skill-context-engineering.mdc`

## 使用方式

```
/plan <REQ-xxx>
```

---

## 产物（必须落盘）

- `ai/requirements/in-progress/<REQ-xxx>.plan.md`
- `ai/requirements/INDEX.md`

## 执行要点（入口 + 路由）

- **输入**：读取 `ai/requirements/in-progress/<REQ-xxx>.md`（Requirement）
- **计划结构**：创建/更新 `ai/requirements/in-progress/<REQ-xxx>.plan.md`，使用以下结构（可勾选、可执行、可复现验证）：

```markdown
# <REQ-xxx> Plan

## 目标回放（1-3 行）

## 交付物（Deliverables）
- [ ] 代码变更：...
- [ ] 文档变更：...
- [ ] 验证记录：...

## 任务清单（Tasks）
### A. 准备与对齐
- [ ] ...

### B. 后端
- [ ] ...

### C. 前端
- [ ] ...

### D. 数据/配置/外部系统（如有）
- [ ] ...

## 文件清单（Files）
- [ ] 新增：`...`
- [ ] 修改：`...`

## 验证方式（Validation）
> 允许多样化：测试/脚本/手工步骤。必须“可复现”。
- **自动化**：
  - [ ] ...
- **脚本**：
  - [ ] ...
- **手工验证步骤**：
  - [ ] ...

## 风险与回滚（Risks & Rollback）
- 风险：
- 回滚策略：

## Open Questions
- [ ] ...

## 执行记录（Worklog）
- YYYY-MM-DD: 完成 xxx；验证方式：xxx；结果：PASS/FAIL（附简短原因）
```

- **任务粒度**：计划要能直接驱动 `/work` 顺序执行（避免“大而空”的任务）
- **索引更新**：以 `skill-index-manager.mdc` 为准（Status = `planned`，Links 补充 plan 路径）

---

## 输出要求

- 必须实际写入/更新文件
- 最后用 3-6 行说明：计划文件路径、下一步建议 `/work <REQ-xxx>`

