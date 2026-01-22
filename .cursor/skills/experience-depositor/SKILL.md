---
name: experience-depositor
description: 此 Skill 负责整个持久化记忆库的治理与写入，支持所有记忆类型（Experience/Tech/Business）。当用户在 experience-capture 展示的候选列表中选择候选时激活，或在 /remember 命令中提取新经验时激活，或需要写入/治理技术记忆、业务记忆时激活。
---

# Memory Depositor（记忆库治理与写入）

## 职责范围

此 Skill 负责整个持久化记忆库的治理与写入，支持所有记忆类型：
- **经验记忆（Experience）**：团队级标准/经验和项目级经验
- **技术记忆（Tech）**：服务上下文、技术文档
- **业务记忆（Business）**：业务上下文、业务规则

## Inputs（从上下文获取）

1. 从会话上下文获取候选（由 experience-capture 传递，包含评估结果）
2. 用户输入（可能是编号选择，如 `1,3` 或 `1 3`，或直接经验表达）
3. 记忆类型（experience/tech/business）：根据输入自动识别或用户指定

**注意**：
- 对于 Experience 类型：候选已由 experience-capture 完成评估，包含 level、type、推荐载体等信息
- 对于 Tech/Business 类型：从用户输入或上下文获取需要写入的记忆内容

## Instructions

### 0) 获取候选

**从会话上下文获取候选**：

- 如果由 experience-capture 传递，直接从上下文获取候选列表
- 如果用户通过 `/remember` 命令提取新经验，从用户输入中提取经验信息并生成候选

**候选格式**：

每个候选应包含：
- EXP-CANDIDATE 字段（taskId, stage, trigger, decision, alternatives, signal, solution, verify, pointers, reqFile）
- 评估结果（level, type, depositionTarget, evaluation 等）

### 1) 冲突检测（增强版：语义搜索 + 关键词匹配）

读取统一索引 `memory/INDEX.md`，根据记忆类型匹配对应的记忆条目：

**记忆类型识别**：
- **Experience**：根据候选的 Level 和 Type 匹配
  - Level = team → 匹配 Experience 表格中 Level = team 的条目
  - Level = project → 匹配 Experience 表格中 Level = project 的条目
- **Tech**：匹配 Tech 表格中所有 active 条目
- **Business**：匹配 Business 表格中所有 active 条目

**双重验证机制**：

1. **语义搜索（主要）**：
   - 使用 Cursor 语义搜索查找相似记忆
   - **Experience**：基于 Decision Shape、Judgment Capsule、Trigger、Title 构建自然语言查询
     - 示例查询："处理错误和异常情况的策略，判断如何选择错误处理方案"
   - **Tech**：基于服务名称、职责、边界、依赖、配置点构建自然语言查询
     - 示例查询："用户服务的职责、边界、依赖关系和配置点"
   - **Business**：基于业务定位、边界、关键流程、业务规则构建自然语言查询
     - 示例查询："订单处理的业务流程和业务规则"
   - 从语义搜索结果中提取相似记忆的 Tag，与现有索引条目匹配

2. **关键词匹配（辅助）**：
   - Tag 完全相同 → 明确表示同一主题的升级版本
   - Title 语义高度相似 → 可能是新版本覆盖旧版本
   - Trigger 关键词大量重叠 → 可能是重复内容或同主题的不同视角
   - **Experience 特有**：
     - Decision being made 高度相似 → 可能是同一判断单元的完善或补充
   - **Tech 特有**：
     - Service 名称相同 → 同一服务的上下文更新
   - **Business 特有**：
     - Topic 相同 → 同一业务主题的上下文更新

**判断逻辑**：
- 语义搜索找到相似记忆 + 关键词匹配确认 → 强相似信号，需要治理
- 语义搜索找到相似记忆但关键词不匹配 → 中等相似信号，需要人工判断
- 语义搜索未找到相似记忆 → 保持独立

对选择的候选检查：
- 触发条件相同/相似，且解决方案矛盾 → 冲突：旧记忆标记 deprecated，新记忆记录替代关系
- 触发条件相近且解决方案相同/相似 → 重复：默认合并（或请求用户确认合并策略）

### 2) 生成治理方案（方案模式）

如果检测到需要治理（合并/取代），生成治理方案（不执行，供用户确认）：

**合并/取代判断（AI Native + 语义搜索）**：

对每条新记忆，使用语义搜索 + 关键词匹配双重验证，评估与现有 `active` 记忆的关系：

1. **语义搜索（主要）**：
   - 构建搜索查询：基于新记忆的 Decision Shape、Judgment Capsule、Trigger、Title
   - 示例查询："判断如何选择状态管理方案，拒绝 Redux 和 Context API，因为项目规模不需要复杂方案"
   - 使用 Cursor 语义搜索查找相似经验
   - 从搜索结果中提取相似经验的 Tag，与 INDEX.md 中的 active 条目匹配

2. **关键词匹配（辅助验证）**：
   - Tag 完全相同 → 明确表示同一主题的升级版本
   - Title 语义高度相似 → 可能是新版本覆盖旧版本
   - Trigger 关键词大量重叠 → 可能是重复内容或同主题的不同视角
   - **Experience 特有**：
     - Decision being made 高度相似 → 可能是同一判断单元的完善或补充

3. **综合判断**：
   - 语义搜索找到相似 + 关键词匹配确认 → 强相似信号（通常需要合并/取代）
   - 语义搜索找到相似但关键词不匹配 → 中等相似信号（需要人工判断）
   - 语义搜索未找到相似 → 保持独立

**判断策略**：
根据相似程度、信息完整度、判断结构质量，智能决定：
- **合并**：多条记忆讲同一件事，保留信息量最大的版本
- **取代**：新记忆是旧记忆的明确升级，旧版本已过时
- **保持独立**：虽有相似但视角不同，各有价值

**决策依据**：
- **Experience**：
  - 优先保留 Decision Shape 和 Judgment Capsule 更完整的版本
  - 优先保留 Scope 更广、Strength 更高的版本
- **Tech/Business**：
  - 优先保留信息更完整、更新更及时的版本
- 当不确定时，倾向于保持独立而非强制合并
- **禁止跨类型合并**：Experience 不能与 Tech/Business 合并

**输出治理方案**（动作/理由/影响），供用户确认

### 3) 展示治理方案

向用户展示治理方案，请求用户确认或调整：

```markdown
## 治理方案

- **合并 EXP-001→EXP-003**：理由：Trigger 关键词重叠 75%，主题高度相似
- **取代 EXP-002→EXP-004**：理由：新经验是旧经验的升级版（更完整/更准确）

请确认是否执行此治理方案？
```

**如果无需要治理的内容**：

- 静默跳过，直接进入步骤 4

### 4) 用户确认治理方案

等待用户确认或调整治理方案。

### 5) 执行治理动作（执行模式）

用户确认后，执行治理动作：

**0) 确定索引路径**：
- 统一索引路径：`.cursor/.lingxi/memory/INDEX.md`
- 所有记忆类型（Experience/Tech/Business）都使用同一个统一索引

**0.5) 备份索引（回滚准备）**：
在执行任何治理动作前，必须先备份：
```bash
cp .cursor/.lingxi/memory/INDEX.md .cursor/.lingxi/memory/INDEX.md.bak
```
注：备份文件会在治理完成后（步骤 5.6）自动删除

**5.1) 读取索引与新记忆**：
- 读取 `memory/INDEX.md` 统一索引中对应类型的所有 `Status = active` 的记忆
  - Experience：读取 Experience 表格中所有 active 条目
  - Tech：读取 Tech 表格中所有 active 条目
  - Business：读取 Business 表格中所有 active 条目
- 识别本轮新增的记忆（从对话上下文获取）
- 读取本轮新增记忆文件内容，确保包含并可提取以下结构化字段：
  - **Experience**：
    - `Decision Shape`（Decision being made / Alternatives rejected / Discriminating signal）
    - `Judgment Capsule`（I used to think / Now I believe / decisive variable）
    - `Surface signal` / `Hidden risk`（来自 INDEX；若缺失则提示在后续补齐）
  - **Tech**：
    - 服务职责、边界、依赖、入口、配置点、常见坑点
  - **Business**：
    - 业务定位、边界、关键流程、业务规则

**5.2) 自动执行治理动作**：

**合并**（多条 → 1 条）：
1. 保留新记忆作为"主记忆"
2. 旧记忆 `Status` 改为 `deprecated`
3. 旧记忆 `ReplacedBy` 填入新记忆 Tag
4. 新记忆 `Replaces` 追加旧记忆 Tag（逗号分隔）
5. **Experience 特有**：
   - 新记忆 `Scope` 取更 broad 的值（narrow < medium < broad）
   - 新记忆 `Strength` 取更高的值（hypothesis < validated < enforced）

**取代**（新覆盖旧）：
1. 旧记忆 `Status` 改为 `deprecated`
2. 旧记忆 `ReplacedBy` 填入新记忆 Tag
3. 新记忆 `Replaces` 追加旧记忆 Tag

**禁止**：
- 删除任何记忆文件（只做 `deprecated` 标记）
- 在没有备份的情况下修改 INDEX
- 跨类型合并（Experience 不能与 Tech/Business 合并）

**5.3) 输出变更报告（静默成功原则）**：

**无变更时**：
- 完全静默，不输出任何内容

**有变更时**：
- 仅输出变更摘要，格式：
  ```
  治理：合并 EXP-001→EXP-003，deprecated 1 条（回滚：cp memory/INDEX.md.bak memory/INDEX.md）
  ```
- 详细信息已在文件中，无需重复输出完整报告

**5.4) 清理备份文件（必须执行）**：
治理流程结束后，必须删除备份文件：
```bash
rm .cursor/.lingxi/memory/INDEX.md.bak
```

**执行时机**：
- 在步骤 5.3（变更报告）完成后
- 无论有无变更，都必须删除备份
- 删除操作静默执行，不输出任何信息

**如果无需要治理的内容**：
- 静默跳过，直接进入步骤 6

### 6) 存储目标选择

在决定写入记忆文档（长期）之前，需要让用户选择存储目标：

**根据记忆类型选择存储目标**：

- **Experience（经验记忆）**：
  - **A) 存入团队级标准**：写入 `memory/experience/team/standards/`，强约束、执行底线
  - **B) 存入团队级经验**：写入 `memory/experience/team/knowledge/`，复杂判断、认知触发
  - **C) 存入项目级经验**：写入 `memory/experience/project/`，项目特定、长期复用
- **Tech（技术记忆）**：
  - **D) 存入服务上下文**：写入 `memory/tech/services/<service>.md`，服务职责、边界、依赖、配置点
- **Business（业务记忆）**：
  - **E) 存入业务上下文**：写入 `memory/business/<topic>.md`，业务定位、边界、关键流程、业务规则

**预览输出格式**（在生成记忆预览时同时展示）：

```markdown
## 记忆库资产预览

### 内容摘要

- **标题**：...
- **触发条件**：...
- **核心内容**：...
- **记忆类型**：Experience/Tech/Business
- **Level**：团队级/项目级（仅 Experience）

### 存储目标选择

- **A) 存入团队级标准**：写入 memory/experience/team/standards/，强约束、执行底线
- **B) 存入团队级经验**：写入 memory/experience/team/knowledge/，复杂判断、认知触发
- **C) 存入项目级经验**：写入 memory/experience/project/，项目特定、长期复用
- **D) 存入服务上下文**：写入 memory/tech/services/，服务职责、边界、依赖、配置点
- **E) 存入业务上下文**：写入 memory/business/，业务定位、边界、关键流程、业务规则

请选择 A、B、C、D 或 E：
```

**推荐逻辑**：

- **Experience**：
  - 如果评估结果推荐 Level = team，Type = standard → 推荐 A（团队级标准）
  - 如果评估结果推荐 Level = team，Type = knowledge → 推荐 B（团队级经验）
  - 如果评估结果推荐 Level = project → 推荐 C（项目级经验）
- **Tech**：推荐 D（服务上下文）
- **Business**：推荐 E（业务上下文）

### 7) 写入前执行治理（最终检查）

在写入文件前，再次执行治理动作，确保知识库质量：

**如果步骤 5 已执行治理**：
- 仅做最终检查，确保没有遗漏的相似经验
- 如果发现新的相似经验，执行与步骤 5 相同的治理流程（备份、执行、报告、清理）

**如果步骤 5 未执行治理**（无需要治理的内容）：
- 执行完整的治理流程（与步骤 5 相同）：
  - 备份索引
  - 读取索引与新记忆
  - 执行治理动作（合并/取代/保持独立）
  - 建立 `Replaces/ReplacedBy` 追溯关系，更新统一索引（Scope/Strength 取更优值）
  - 输出变更报告（如有变更）
  - 清理备份文件

### 8) 写入

根据用户选择的存储目标，写入对应位置：

- **如果选择 A（团队级标准）**：
  - 写入 `.cursor/.lingxi/memory/experience/team/standards/<tag>-<title>.md`
  - **自动更新统一索引**：记忆文件写入成功后，自动运行 `node scripts/validate-memory-index.js --update` 更新统一索引
    - 如果更新失败，输出错误信息，但不影响记忆文件写入
    - 保持静默成功原则：更新成功时不输出确认信息

- **如果选择 B（团队级经验）**：
  - 写入 `.cursor/.lingxi/memory/experience/team/knowledge/<tag>-<title>.md`
  - **自动更新统一索引**：记忆文件写入成功后，自动运行 `node scripts/validate-memory-index.js --update` 更新统一索引
    - 如果更新失败，输出错误信息，但不影响记忆文件写入
    - 保持静默成功原则：更新成功时不输出确认信息

- **如果选择 C（项目级经验）**：
  - 写入 `.cursor/.lingxi/memory/experience/project/<tag>-<title>.md`
  - **自动更新统一索引**：记忆文件写入成功后，自动运行 `node scripts/validate-memory-index.js --update` 更新统一索引
    - 如果更新失败，输出错误信息，但不影响记忆文件写入
    - 保持静默成功原则：更新成功时不输出确认信息

- **如果选择 D（服务上下文）**：
  - 写入 `.cursor/.lingxi/memory/tech/services/<service>.md`
  - **自动更新统一索引**：记忆文件写入成功后，自动运行 `node scripts/validate-memory-index.js --update` 更新统一索引
    - 如果更新失败，输出错误信息，但不影响记忆文件写入
    - 保持静默成功原则：更新成功时不输出确认信息

- **如果选择 E（业务上下文）**：
  - 写入 `.cursor/.lingxi/memory/business/<topic>.md`
  - **自动更新统一索引**：记忆文件写入成功后，自动运行 `node scripts/validate-memory-index.js --update` 更新统一索引
    - 如果更新失败，输出错误信息，但不影响记忆文件写入
    - 保持静默成功原则：更新成功时不输出确认信息

### 经验模板（必须包含）

#### 标准模板（standard）

适用于团队级标准（强约束、执行底线）：

- 触发条件（When to load）
- 标准内容（执行底线、预设通行方案）
- 判断结构（Decision Shape）
- 认知蒸馏（Judgment Capsule）
- 校验方式（How to verify）
- 关联指针（Pointers）

#### 经验模板（knowledge）

适用于团队级经验和项目级经验（复杂判断、认知触发）：

- 触发条件（When to load）
- 表层信号（Surface signal）
- 隐含风险（Hidden risk）
- 问题现象（Symptom）
- 根因（Root cause）
- 解决方案（Fix）
- 判断结构（Decision Shape）
- 认知蒸馏（Judgment Capsule）
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

索引写入要求（与 INDEX 表头一致）：

- `Type`：经验类型（standard/knowledge）
- `Trigger (when to load)`：用于工程检索（关键词/场景）
- `Surface signal`：表层信号（让我应该警觉的味道）
- `Hidden risk`：隐含风险（真正会炸的点）

**注意**：冲突检测和治理已在步骤 1-5 完成，步骤 7 是写入前的最终治理检查。
