<!-- 历史计划：此文档记录 LingXi 1.0 到 2.0 演进过程中的计划，包含已废弃的 flow 相关引用，保留作为历史记录 -->

---
name: 轻量 Plan 提速优化
overview: 通过文件操作优先策略优化轻量 plan 生成流程，将生成时间从 10-30 秒降至 1-3 秒，同时明确标记局限性并在后续阶段按需补充缺失信息。
todos:
  - id: req-extract-markers
    content: 在 req Skill 模板中添加 PLAN-EXTRACT 提取标记（GOAL、TASKS、VALIDATION）
    status: completed
  - id: flow-router-file-extraction
    content: 在 flow-router Skill 中实现文件操作提取逻辑，替换 LLM 生成
    status: completed
  - id: flow-router-template-update
    content: 更新轻量 plan 模板，添加 Minimal 标记和局限性说明
    status: completed
  - id: backward-compatibility
    content: 实现向后兼容处理，检测到标记缺失时回退到 LLM 生成
    status: completed
  - id: audit-enhancement
    content: （必须）在 audit Skill 中实现按需补充机制，自动补充 Minimal plan 的关键缺失项
    status: pending
  - id: work-enhancement
    content: （推荐）在 work Skill 中实现按需补充机制，执行过程中动态补充缺失信息
    status: pending
isProject: false
---

# 轻量 Plan 提速优化方案

## 目标

优化轻量 plan 生成流程，通过文件操作替代 LLM 生成，实现：

- **速度提升**：从 10-30 秒降至 1-3 秒
- **成本降低**：减少 LLM 调用和 token 消耗
- **体验改进**：用户感知为"跳过 plan"，无等待感
- **质量保障**：明确标记局限性，在后续阶段按需补充

## 核心策略

采用"文件操作优先 + 明确标记局限性 + 按需动态补充"的策略：

1. 在 req 阶段添加 HTML 注释标记，便于后续文件操作提取
2. 在 flow-router 中使用文件操作提取，而非 LLM 生成
3. 明确标记轻量 plan 为"Minimal"版本，说明可能的不完整性
4. 在 audit/work 阶段按需补充缺失信息

## 实施步骤

### 1. 更新 req Skill：添加提取标记

**文件**：`.cursor/skills/req/SKILL.md`

**修改内容**：

- 在完整模板（5.2）的"概述"部分添加 `PLAN-EXTRACT:GOAL` 标记
- 在"功能需求"表格前后添加 `PLAN-EXTRACT:TASKS` 标记
- 在"验收检查清单"部分添加 `PLAN-EXTRACT:VALIDATION` 标记
- 在简化模板（5.3）中添加相同的标记

**具体修改位置**：

- 概述部分：在 `### 1.3 解决方案概述` 后添加结束标记
- 功能需求：在表格前后添加开始和结束标记
- 验收检查清单：在清单前后添加开始和结束标记

**标记格式**：

```markdown
<!-- PLAN-EXTRACT:GOAL-START -->

{概述内容}

<!-- PLAN-EXTRACT:GOAL-END -->

<!-- PLAN-EXTRACT:TASKS-START -->

{功能需求表格}

<!-- PLAN-EXTRACT:TASKS-END -->

<!-- PLAN-EXTRACT:VALIDATION-START -->

{验收检查清单}

<!-- PLAN-EXTRACT:VALIDATION-END -->
```

### 2. 更新 flow-router Skill：实现文件操作提取

**文件**：`.cursor/skills/flow-router/SKILL.md`

**修改内容**：

- 更新"自动生成轻量 plan"部分（第 107-186 行）
- 将 LLM 生成逻辑替换为文件操作提取逻辑
- 更新轻量 plan 模板，添加"Minimal"标记和局限性说明

**核心逻辑**：

1. 使用 `read_file` 读取 req 文件
2. 使用字符串操作提取标记内容：

   - 提取 `PLAN-EXTRACT:GOAL` 标记间的内容作为目标回放
   - 提取 `PLAN-EXTRACT:TASKS` 标记间的表格作为任务清单
   - 提取 `PLAN-EXTRACT:VALIDATION` 标记间的内容作为验收检查清单

3. 使用正则表达式从"实现方案"列提取文件路径（如 `` `([^\`]+\.(ts|tsx|js|jsx|py|md))` ``）
4. 使用固定模板填充提取的内容
5. 静默写入 plan 文件

**模板更新**：

- 标题改为：`# REQ-xxx Plan (Auto-generated, Minimal)`
- 添加局限性说明块（使用 `> **注意**` 格式）
- 在每个可能不完整的章节添加注意事项
- 如果没有提取到内容，显示"待补充"提示

### 3. 向后兼容处理

**文件**：`.cursor/skills/flow-router/SKILL.md`

**处理逻辑**：

- 如果 req 文件中没有提取标记（旧格式），回退到当前的 LLM 生成方式
- 如果功能需求表格缺少"实现方案"列，文件变更清单显示为空并标记"待补充"
- 如果 req 中没有功能需求表格，任务清单显示为空并标记"待补充"

### 4. 更新 audit Skill：实现按需补充机制（必须）

**文件**：`.cursor/skills/audit/SKILL.md`

**为什么必须实现**：

- 轻量 plan 可能缺失关键信息（测试任务分类、测试规格等）
- audit 的阻塞项检查要求这些信息必须存在
- 如果不自动补充，audit 会要求用户回退到 plan 修正，违背"跳过 plan"的意图
- **这是"跳过 plan"功能能够正常工作的关键**

**实现内容**：

1. **识别 Minimal plan**：

   - 检查 plan 标题是否包含 "Auto-generated, Minimal"
   - 如果识别到 Minimal plan，进入补充流程

2. **自动补充关键缺失项**：

   - **测试任务分类缺失**：基于 req 的功能需求，自动添加测试任务分类（如果可测试行为可从需求中提取）
   - **测试规格缺失**：基于 req 的验收检查清单，自动补充手工验证步骤
   - **文件变更清单为空**：基于 req 的功能需求表格，尝试从"实现方案"列提取文件路径（如果 req 中没有，标记为"待 work 阶段补充"）

3. **更新 plan 文件**：

   - 补充后，更新 plan 标题为 "Auto-generated, Enhanced"
   - 在补充的章节添加注释说明"由 audit 阶段自动补充"

4. **审查逻辑调整**：

   - 如果 plan 已从 Minimal 补充为 Enhanced，按正常 plan 进行审查
   - 如果无法自动补充的关键缺失项，仍然作为阻塞项/建议项

**补充优先级**：

- **必须补充**：测试任务分类（如果可从需求提取）、测试规格（手工验证步骤）
- **尽量补充**：文件变更清单（从实现方案列提取）
- **无法补充时**：标记为"待 work 阶段补充"，不作为阻塞项

### 5. 更新 work Skill：实现按需补充机制（推荐）

**文件**：`.cursor/skills/work/SKILL.md`

**为什么推荐实现**：

- work 阶段在执行任务时，可能会发现 plan 中缺失的实际文件
- 动态补充可以保持 plan 的实时准确性，便于进度跟踪
- 虽然不是阻塞项，但能显著改善执行体验

**实现内容**：

1. **识别 Minimal/Enhanced plan**：

   - 检查 plan 是否为 "Auto-generated" 版本

2. **执行过程中动态补充**：

   - 在执行任务时，如果创建/修改了计划外文件，自动更新"文件变更清单"
   - 如果发现任务粒度不匹配，自动拆解为子任务并更新任务清单
   - 如果发现需要补充测试规格，自动更新测试规格部分

3. **更新 plan 文件**：

   - 补充后，更新 plan 标记为 "Auto-generated, Enhanced"
   - 在补充的章节添加注释说明"由 work 阶段动态补充"

## 实施优先级

1. **必须实施**（核心功能）：

   - 步骤 1：req Skill 添加提取标记
   - 步骤 2：flow-router Skill 实现文件操作提取
   - 步骤 3：向后兼容处理
   - **步骤 4：audit Skill 按需补充机制**（必须，否则"跳过 plan"功能无法正常工作）

2. **推荐实施**（体验优化）：

   - 步骤 5：work Skill 按需补充机制

## 预期效果

- **速度**：生成时间从 10-30 秒降至 1-3 秒
- **成本**：每次生成减少 LLM 调用（约 500-1000 tokens）
- **体验**：用户感知为"跳过 plan"，无等待感
- **质量**：明确标记局限性，在后续阶段按需补充，不影响整体质量

## 风险与缓解

1. **风险**：req 文件格式不一致导致提取失败

   - **缓解**：实现向后兼容，检测到标记缺失时回退到 LLM 生成

2. **风险**：提取的文件路径不准确

   - **缓解**：明确标记为"可能不完整"，在 audit/work 阶段按需补充

3. **风险**：任务粒度不匹配影响进度跟踪

   - **缓解**：明确标记为"粒度可能不一致"，在 work 阶段按需拆解

4. **风险**：audit 阶段阻塞项检查导致无法推进

   - **缓解**：实现 audit 按需补充机制，自动补充关键缺失项（测试任务分类、测试规格等），确保 Minimal plan 能够通过审查
