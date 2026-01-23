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

### 1) 冲突检测（概念级语义搜索）

读取统一索引 `memory/INDEX.md`，根据记忆类型匹配对应的记忆条目：

**记忆类型识别**：
- **Experience**：根据候选的 Level 和 Type 匹配
  - Level = team → 匹配 Experience 表格中 Level = team 的条目
  - Level = project → 匹配 Experience 表格中 Level = project 的条目
- **Tech**：匹配 Tech 表格中所有 active 条目
- **Business**：匹配 Business 表格中所有 active 条目

**概念级语义搜索**：

1. **直接语义搜索（基于完整记忆文件）**：
   - 对新记忆的完整内容进行语义搜索
   - 查询范围：根据 Level 和 Type 限定目录
     - Level = team, Type = standard → `.cursor/.lingxi/memory/experience/team/standards/`
     - Level = team, Type = knowledge → `.cursor/.lingxi/memory/experience/team/knowledge/`
     - Level = project → `.cursor/.lingxi/memory/experience/project/`
   - **构建概念化查询**：描述"新记忆要解决什么问题"、"传递什么概念"，确保能匹配到同一场景的记忆
     - 示例查询："我遇到了状态管理方案选择的问题，需要考虑项目规模，拒绝了 Redux 和 Context API，选择了更简单的方案"
     - 查询应包含：要解决的问题、触发场景、判断依据（但不包含具体解决方案，以便找到同一场景但结论不同的记忆）
     - 让 Agent 理解新记忆的**真正含义**，而非匹配关键词
   - 使用 `codebase_search` 工具查找相似记忆文件
   - Cursor 语义搜索自动进行**概念级匹配**，理解记忆内容的真正含义
   - 返回语义相似度最高的 Top 5 结果

2. **LLM 概念级相似度评估**：
   - 对语义搜索结果，使用 LLM 进行**概念级相似度评估**
   - **评估维度**（基于概念理解，而非字段匹配）：
     - **问题概念相似度**：新记忆和旧记忆要解决的问题是否在概念上相似
     - **判断逻辑概念相似度**：新记忆和旧记忆的判断逻辑是否在概念上相似
       - 是否在判断相同类型的问题
       - 是否使用相似的判断依据
       - 是否拒绝相似的备选方案
     - **认知变化概念相似度**：新记忆和旧记忆的认知变化是否在概念上相似
       - 是否从相似的错误认知转向相似的正确认知
       - 是否识别了相似的决定性变量
     - **解决方案概念相似度**：新记忆和旧记忆的解决方案是否在概念上相似
     - **场景冲突检测**（关键）：新记忆和旧记忆是否覆盖同一场景但结论不同
       - 问题概念高度相似（≥ 0.8）但解决方案不同或矛盾
       - 触发条件相同/相似但最终选择不同
       - 这种情况应被识别为"冲突"，需要"取代"而非"合并"
   - 让 Agent 理解记忆内容的**真正含义**，进行概念级判断
   - 输出相似度得分（0-1）、场景冲突标识（true/false）和判断理由

3. **治理决策（基于相似度和场景冲突）**：
   - **场景冲突（关键）**：如果检测到场景冲突（问题概念高度相似但解决方案不同/矛盾）
     - 无论总体相似度如何，都应建议"取代"
     - 场景冲突优先级高于总体相似度
   - **无场景冲突时**：
     - 相似度 ≥ 0.8：强相似 → 建议合并/取代
     - 相似度 0.5-0.8：中等相似 → 需要人工判断
     - 相似度 < 0.5：弱相似 → 保持独立

**判断逻辑**：
- **场景冲突**（问题概念高度相似但解决方案不同/矛盾）→ 建议"取代"（优先级最高）
- 相似度 ≥ 0.8 且无场景冲突 → 强相似信号，需要治理（合并/取代）
- 相似度 0.5-0.8 且无场景冲突 → 中等相似信号，需要人工判断
- 相似度 < 0.5 → 保持独立

### 2) 生成治理方案（方案模式）

如果检测到需要治理（合并/取代），生成治理方案（不执行，供用户确认）：

**合并/取代判断（基于概念级相似度评估）**：

对每条新记忆，使用概念级语义搜索和 LLM 相似度评估，评估与现有 `active` 记忆的关系：

1. **概念级语义搜索**：
   - 构建概念化查询：描述"新记忆要解决什么问题"、"传递什么概念"
   - **查询重点**：强调问题场景和触发条件，而非具体解决方案
     - 这样能确保找到"同一场景但结论不同"的记忆（需要被取代）
     - 示例查询："我遇到了状态管理方案选择的问题，需要考虑项目规模"
     - 避免只查询解决方案，以免遗漏同一场景但结论不同的记忆
   - 使用 `codebase_search` 工具查找相似记忆文件
   - Cursor 语义搜索自动进行**概念级匹配**，理解记忆内容的真正含义

2. **LLM 概念级相似度评估**：
   - 对语义搜索结果，使用 LLM 进行**概念级相似度评估**
   - **评估维度**：
     - 问题概念相似度：新记忆和旧记忆要解决的问题是否在概念上相似
     - 判断逻辑概念相似度：新记忆和旧记忆的判断逻辑是否在概念上相似
     - 认知变化概念相似度：新记忆和旧记忆的认知变化是否在概念上相似
     - 解决方案概念相似度：新记忆和旧记忆的解决方案是否在概念上相似
     - **场景冲突检测（关键）**：新记忆和旧记忆是否覆盖同一场景但结论不同
       - 问题概念高度相似（≥ 0.8）但解决方案不同或矛盾
       - 触发条件相同/相似但最终选择不同
       - 这种情况应被识别为"冲突"，需要"取代"而非"合并"
   - 输出相似度得分（0-1）、场景冲突标识（true/false）和判断理由

3. **治理决策（基于相似度和场景冲突）**：
   - **场景冲突（关键）**：如果检测到场景冲突（问题概念高度相似但解决方案不同/矛盾）
     - 无论总体相似度如何，都应建议"取代"
     - 场景冲突优先级高于总体相似度
   - **无场景冲突时**：
     - 相似度 ≥ 0.8：强相似 → 建议合并/取代
     - 相似度 0.5-0.8：中等相似 → 需要人工判断
     - 相似度 < 0.5：弱相似 → 保持独立

**判断策略**：
根据相似度得分、场景冲突标识、信息完整度、判断结构质量，智能决定：
- **取代**（优先级最高）：
  - 场景冲突：覆盖同一场景但结论不同/矛盾
  - 新记忆是旧记忆的明确升级，旧版本已过时
- **合并**：
  - 多条记忆讲同一件事，解决方案相同或相似，保留信息量最大的版本
- **保持独立**：
  - 虽有相似但视角不同，各有价值
  - 场景不同，或场景相同但结论都有效（非冲突）

**决策依据**：
- **Experience**：
  - 优先保留 Decision Shape 和 Judgment Capsule 更完整的版本
  - 优先保留 Scope 更广、Strength 更高的版本
- **Tech/Business**：
  - 优先保留信息更完整、更新更及时的版本
- 当不确定时，倾向于保持独立而非强制合并
- **禁止跨类型合并**：Experience 不能与 Tech/Business 合并

**输出治理方案**（动作/理由/影响/将要删除的文件），供用户确认：

治理方案必须明确列出：
- 将要删除的记忆文件路径
- 删除原因（合并/取代）
- 保留的新记忆信息
- 提醒用户确认后才执行删除

### 3) 展示治理方案

向用户展示治理方案，请求用户确认或调整：

```markdown
## 治理方案

- **取代 EXP-001→EXP-003**（场景冲突）：
  - 理由：场景冲突 - 覆盖同一场景（状态管理方案选择）但结论不同（EXP-001 选择 Redux，EXP-003 选择更简单的方案）
  - 问题概念相似度：0.9（高度相似）
  - 解决方案相似度：0.2（不同/矛盾）
  - 将要删除：`memory/experience/team/knowledge/EXP-001-xxx.md`
  - 保留：EXP-003（新结论）

- **合并 EXP-002→EXP-004**：
  - 理由：概念相似度 0.85，问题概念和判断逻辑高度相似，解决方案相同
  - 将要删除：`memory/experience/team/knowledge/EXP-002-xxx.md`
  - 保留：EXP-004（信息更完整）

- **取代 EXP-005→EXP-006**：
  - 理由：概念相似度 0.92，新经验是旧经验的明确升级
  - 将要删除：`memory/experience/project/EXP-005-xxx.md`
  - 保留：EXP-006（更完整/更准确）

**注意**：删除操作需要您明确确认。确认后将删除上述文件，并从 INDEX.md 中移除对应条目。

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
2. **删除旧记忆文件**（而非标记为 deprecated）
   - 删除文件：`.cursor/.lingxi/memory/experience/.../<旧记忆文件名>.md`
3. 从 INDEX.md 中删除旧记忆的条目
4. 从新记忆的 `Replaces` 字段中移除已删除记忆的 Tag（如果存在）
5. **Experience 特有**：
   - 新记忆 `Scope` 取更 broad 的值（narrow < medium < broad）
   - 新记忆 `Strength` 取更高的值（hypothesis < validated < enforced）

**取代**（新覆盖旧）：
1. **删除旧记忆文件**（而非标记为 deprecated）
   - 删除文件：`.cursor/.lingxi/memory/experience/.../<旧记忆文件名>.md`
2. 从 INDEX.md 中删除旧记忆的条目
3. 从新记忆的 `Replaces` 字段中移除已删除记忆的 Tag（如果存在）

**删除操作安全性**：
- 删除操作需要用户明确确认
- 在治理方案中明确列出将要删除的记忆文件
- 用户确认后才执行删除

**禁止**：
- 在没有用户确认的情况下删除记忆文件
- 在没有备份的情况下修改 INDEX
- 跨类型合并（Experience 不能与 Tech/Business 合并）

**5.3) 输出变更报告（静默成功原则）**：

**无变更时**：
- 完全静默，不输出任何内容

**有变更时**：
- 仅输出变更摘要，格式：
  ```
  治理：合并 EXP-001→EXP-003，删除 1 条（回滚：cp memory/INDEX.md.bak memory/INDEX.md）
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
  - 删除旧记忆文件（如适用）
  - 从 INDEX.md 中删除旧记忆条目（如适用）
  - 从新记忆的 `Replaces` 字段中移除已删除记忆的 Tag（如适用）
  - 更新统一索引（Scope/Strength 取更优值）
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
