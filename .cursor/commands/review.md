# /review - Review 阶段：分级审查并产出 TODO

## 命令用途

对 `<REQ-xxx>` 的实现进行结构化审查（功能、边界、可维护性、安全、性能、回归风险），输出分级 TODO，并落盘。

## 依赖的技能型 rules（Skill）

- `.cursor/rules/skill-index-manager.mdc`（状态更新）
- `.cursor/rules/skill-context-engineering.mdc`

## 使用方式

```
/review <REQ-xxx>
```

---

## 产物（必须落盘）

- `ai/requirements/in-progress/<REQ-xxx>.review.md`
- `ai/requirements/in-progress/<REQ-xxx>.plan.md`（必须回写 Blockers/High）
- `ai/requirements/INDEX.md`

## 执行要点（入口 + 路由）

- **输入**：Requirement + Plan + 本次改动核心文件 + 已做的验证记录
- **审查输出结构**：创建/更新 `ai/requirements/in-progress/<REQ-xxx>.review.md`，使用以下结构：

```markdown
# <REQ-xxx> Review

## 总结（3-6 行）

## Blockers（必须修复）
- [ ] ...

## High（高优先级）
- [ ] ...

## Medium
- [ ] ...

## Low / Nice-to-have
- [ ] ...

## 回归检查清单
- [ ] ...
```

- **回写规则（必须）**：把 Blockers/High 同步回 `ai/requirements/in-progress/<REQ-xxx>.plan.md` 的 Tasks（避免“两份 TODO 漂移”）
- **索引更新**：以 `skill-index-manager.mdc` 为准（Status = `in-review` 或 `needs-fix`）

---

## 输出要求

- 必须实际写入/更新文件
- 最后用 3-6 行说明：是否有 Blockers、下一步建议（通常是 `/work <REQ-xxx>` 修复后再 `/compound`）

