# /compound - Compound 阶段：沉淀可复用知识（复利）

## 命令用途

把本次 `<REQ-xxx>` 的“过程经验”转化为**下次自动可用**的资产：上下文、经验、自动化拦截点，并维护索引。

## 依赖的技能型 rules（Skill）

- `.cursor/rules/skill-experience-depositor.mdc`
- `.cursor/rules/skill-index-manager.mdc`
- `.cursor/rules/skill-context-engineering.mdc`
- `.cursor/rules/skill-experience-index.mdc`（自动检索与加载历史经验）

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

### 第一步：经验检索（强制执行）

**⚠️ 必须执行：** 在命令执行的第一步就必须执行经验检索，不可跳过。

调用 `skill-experience-index.mdc`，检查是否已有相似或重复的经验，避免重复沉淀。

**执行步骤：**
1. 读取 `ai/context/experience/INDEX.md`
2. 匹配所有 Status = `active` 的经验
3. 根据本次 Plan/Worklog/Review 中提取的候选经验进行语义匹配
4. 识别重复或高度相似的经验（如果存在，在后续步骤中提供合并选项）

### 第二步：提取候选经验

- **提取候选**：从本次 Plan/Worklog/Review 中提取高价值条目（优先"返工/排查/隐性约束/可自动拦截"）

### 第三步：冲突检测与处理

对每个候选经验，执行冲突检测与处理（按 `skill-experience-depositor.mdc` 的冲突处理机制）：

1. **冲突检测**：检查新经验是否与现有经验冲突
2. **自动剔除矛盾旧经验**：如果检测到冲突，自动标记旧经验为 `deprecated`
3. **经验合并/去重**：如果检测到重复或高度相似的经验，提供合并选项

### 第四步：经验落盘

- **经验落盘**：按 `skill-experience-depositor.mdc` 的模板写入（必须含触发条件与校验方式）
- **索引维护**：更新 `ai/context/experience/INDEX.md`（新增行/更新Status）与 `ai/requirements/INDEX.md`（推进状态）
- **上下文补齐**：缺少服务/模块概要时补 `ai/context/tech/services/`（只写概要+指针）
- **自动化优先**：可被 lint/test/script 拦截的问题优先固化（否则至少沉淀为 experience）

---

## 输出要求

- 必须实际创建/更新 `ai/context/` 文件与索引
- 最后用 3-6 行说明：新增/更新了哪些沉淀资产，下次会如何复用

