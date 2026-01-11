# /compound - Compound 阶段：沉淀可复用知识（复利）

## 命令用途

把本次 `<REQ-xxx>` 的“过程经验”转化为**下次自动可用**的资产：上下文、经验、自动化拦截点，并维护索引。

## 依赖的技能型 rules（Skill）

- `.cursor/rules/skill-experience-depositor.mdc`
- `.cursor/rules/skill-index-manager.mdc`
- `.cursor/rules/skill-context-engineering.mdc`

## 使用方式

```
/compound <REQ-xxx>
```

---

## 产物（必须落盘）

- `ai/context/experience/<tag>-<title>.md`（按需，多条）
- `ai/context/experience/INDEX.md`
-（按需）`ai/context/tech/services/<service-or-module>.md`
- `ai/requirements/INDEX.md`

## 执行要点（入口 + 路由）

- **提取候选**：从本次 Plan/Worklog/Review 中提取高价值条目（优先“返工/排查/隐性约束/可自动拦截”）
- **经验落盘**：按 `skill-experience-depositor.mdc` 的模板写入（必须含触发条件与校验方式）
- **索引维护**：更新 `ai/context/experience/INDEX.md`（新增行）与 `ai/requirements/INDEX.md`（推进状态）
- **上下文补齐**：缺少服务/模块概要时补 `ai/context/tech/services/`（只写概要+指针）
- **自动化优先**：可被 lint/test/script 拦截的问题优先固化（否则至少沉淀为 experience）

---

## 输出要求

- 必须实际创建/更新 `ai/context/` 文件与索引
- 最后用 3-6 行说明：新增/更新了哪些沉淀资产，下次会如何复用

