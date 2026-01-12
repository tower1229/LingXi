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

### 0.0) 成长过滤器（强制：决定进 session 还是进 experience）

在决定“写入经验文档（长期）”之前，对每条候选先回答一个问题：

> **如果我一年后在完全不同的项目里再遇到类似局面，这条信息还能帮我提前做出正确判断吗？**

- 若答案是 **否**：不写入 experience，改为沉淀到 **session/worklog**（项目记录），并说明原因
- 若答案是 **是**：允许写入 experience（长期判断资产）

> 目的：避免 experience 退化为“事实堆叠/案例百科”，把长期资产留给“可迁移的判断结构”。

### 0.1) 成长循环（每次新增经验后自动触发）

当本次沉淀**实际新增**了经验文件（写入 `.workflow/context/experience/`）后，必须**自动调用 `experience-curator` Skill**，传入本轮新增的经验 Tag 列表。

**`experience-curator` 执行内容**：

1. **经验治理（自动执行，无需人工审核）**
   - 备份 INDEX → `INDEX.md.bak`
   - 识别候选合并组：Tag 相同 / Trigger 关键词重叠 ≥ 60% → 合并
   - 识别候选取代链：新经验是旧经验升级版 → 旧经验 `deprecated`，建立 `Replaces/ReplacedBy` 追溯
   - 更新 INDEX（Scope/Strength 取更优值）
   - 输出变更报告（动作/理由/影响/回滚命令）

2. **质量准则建议（仅建议，需人工审核）**
   - 从本轮新增经验中抽象 1-3 条"质量准则建议"（质量判断/风险偏好/工程标准）
   - 明确标注为建议，不得自动写入 rules/skills
   - 给出采纳入口：`/flow 采纳质量准则 <序号>` 或 `/flow 忽略质量准则`

### 经验模板（必须包含）

- 触发条件（When to load）
- 问题现象（Symptom）
- 根因（Root cause）
- 解决方案（Fix）
- 校验方式（How to verify）
- 关联指针（Pointers）

#### 强制：把经验主语从【事】换成【判断】

每条经验必须补齐以下两段（哪怕每段只写 3 行）：

- **Decision Shape（判断结构）**
  - Decision being made: 我当时在判断什么
  - Alternatives rejected: 我拒绝了哪些备选方案（至少 1 个）
  - Discriminating signal: 我靠什么可观测信号做出分叉
- **Judgment Capsule（认知蒸馏）**
  - I used to think:
  - Now I believe:
  - Because the decisive variable is:

> 目的：确保经验一定能上升为“判断结构”，而不是仅成为“做过什么/怎么做”的文档。

落盘：

- `.workflow/context/experience/<tag>-<title>.md`
- 更新 `.workflow/context/experience/INDEX.md`

索引写入要求（与 INDEX 表头一致）：

- `Trigger (when to load)`：用于工程检索（关键词/场景）
- `Surface signal`：表层信号（让我应该警觉的味道）
- `Hidden risk`：隐含风险（真正会炸的点）

### 冲突检测（必须）

沉淀前读取 INDEX 中所有 active 经验，判断：

- 触发条件相同/相似，且解决方案矛盾 → 冲突：旧经验标记 deprecated，新经验记录替代关系
- 触发条件相近且解决方案相同/相似 → 重复：默认合并（或请求用户确认合并策略）

