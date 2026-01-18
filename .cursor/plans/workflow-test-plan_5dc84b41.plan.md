<!-- 历史计划：此文档记录 LingXi 1.0 到 2.0 演进过程中的计划，包含已废弃的 flow 相关引用，保留作为历史记录 -->

---
name: workflow-test-plan
overview: 通过创建一个验证 INDEX.md 格式的 Node.js 脚本来完整测试 workflow 的 6 个阶段（req → plan → audit → work → review → archive），验证各环节功能和机制是否正常工作
todos:
  - id: test_req
    content: 执行 req 阶段：创建需求文档，验证需求澄清、文件创建、索引更新、循环菜单输出
    status: completed
  - id: test_plan
    content: 执行 plan 阶段：创建计划文档，验证任务拆解、测试规格、索引更新、质量闸门
    status: completed
  - id: test_audit
    content: 执行 audit 阶段：进行技术审查，验证审查维度、阻塞项识别、可推进判据
    status: completed
  - id: test_work
    content: 执行 work 阶段：实现验证脚本，验证代码编写、测试执行、plan 回写、索引更新
    status: completed
  - id: test_review
    content: 执行 review 阶段：进行多维度审查，验证审查报告、问题回写、索引更新
    status: completed
  - id: test_archive
    content: 执行 archive 阶段：归档需求，验证文件移动、索引更新、状态同步
    status: completed
isProject: false
---

# Workflow 完整测试计划

## 测试目标

通过一个真实且有意义的任务（创建 INDEX.md 格式验证脚本），完整测试 workflow 的 6 个阶段，验证：

- 各阶段 Skills 是否正确激活
- 人工闸门是否正常工作
- 质量闸门是否有效
- 文件创建和索引更新是否同步
- 状态机转换是否符合预期

## 测试任务

**创建验证 `.cursor/.lingxi/requirements/INDEX.md` 格式的 Node.js 脚本**

该脚本应验证：

1. 表头格式（7 个字段：ID | Title | Status | Current Phase | Next Action | Blockers | Links）
2. ID 格式（REQ-xxx）
3. Status 值有效性（in-progress/planned/in-review/needs-fix/completed）
4. Current Phase 值有效性（req/plan/audit/work/review/archive）
5. 文件一致性（索引中的 REQ 对应的文件是否存在）
6. 目录一致性（Status 和文件位置是否匹配：completed → completed/，其他 → in-progress/）

参考文件：

- [.cursor/skills/index-manager/SKILL.md](.cursor/skills/index-manager/SKILL.md) - 定义了数据模型和验证规则（INDEX.md 结构定义）
- [.cursor/hooks/stop.mjs](.cursor/hooks/stop.mjs) - 包含解析逻辑参考
- [install.js](install.js) - Node.js 脚本风格参考

## 测试执行流程

### 阶段 1: req（需求澄清）

**验证点**：

- [ ] 是否正确创建 `REQ-002.md` 文件（或其他编号）
- [ ] 需求文档是否包含：概述、目标、用户故事、功能需求、验收检查清单
- [ ] 是否正确更新 `.cursor/.lingxi/requirements/INDEX.md`
- [ ] INDEX 状态是否正确（Status = in-progress, Current Phase = req）
- [ ] 是否输出循环选项菜单（A/B/C/D）

**预期产物**：

- `.cursor/.lingxi/requirements/in-progress/REQ-002.md`
- `.cursor/.lingxi/requirements/INDEX.md`（已更新）

### 阶段 2: plan（计划制定）

**验证点**：

- [ ] 是否创建 `REQ-002.plan.md` 文件
- [ ] Plan 是否包含所有必需小节：
- Status Summary（阶段/进度/当前任务/阻塞项/上次更新）
- Files to Change（需创建/修改的文件清单，含测试文件）
- Tasks（可勾选、含依赖关系）
- Test Specifications / Validation（验证方式可复现）
- Worklog（初始为空）
- Compounding Candidates（初始为空）
- [ ] 任务拆解是否清晰、可执行
- [ ] 测试规格是否明确（输入/输出/边界条件）
- [ ] 是否正确更新 INDEX（Status = planned, Current Phase = plan）
- [ ] 是否输出质量闸门（可推进判据）
- [ ] 是否输出循环选项菜单

**预期产物**：

- `.cursor/.lingxi/requirements/in-progress/REQ-002.plan.md`
- `.cursor/.lingxi/requirements/INDEX.md`（已更新）

### 阶段 3: audit（技术审查）

**验证点**：

- [ ] 审查报告是否涵盖所有维度：
- 技术风险（方案可行性、依赖稳定性、性能风险、架构影响）
- 任务完整性（任务拆解、依赖关系、文件变更、边界条件、测试任务）
- 测试规格（行为提取、规格完整性、类型区分、覆盖对齐）
- 验证可靠性（可复现性、覆盖充分性、与需求对齐）
- 规范符合度（规范引用、命名约定、架构模式）
- [ ] 是否识别潜在阻塞项
- [ ] 是否给出明确的"可推进判据"（Blockers=0 等）
- [ ] 审查报告是否仅输出到对话（不写入文件）
- [ ] INDEX 状态是否正确（Current Phase = audit，Status 保持 planned）
- [ ] 是否输出循环选项菜单

### 阶段 4: work（实现与验证）

**验证点**：

- [ ] 是否按 plan 执行任务
- [ ] 是否创建脚本文件（如 `scripts/validate-index.js`）
- [ ] 是否创建测试文件（如 `scripts/__tests__/validate-index.test.js`）
- [ ] 是否回写 plan.md（任务勾选、Worklog、Status Summary 更新）
- [ ] 测试执行和记录是否正常（测试命令、结果、覆盖的行为）
- [ ] 验证脚本是否能正常运行并输出正确结果
- [ ] INDEX 状态是否正确（Current Phase = work）
- [ ] 是否输出循环选项菜单

**预期产物**：

- `scripts/validate-index.js`（或类似路径）
- `scripts/__tests__/validate-index.test.js`（测试文件）
- `.cursor/.lingxi/requirements/in-progress/REQ-002.plan.md`（已更新）

### 阶段 5: review（多维度审查）

**验证点**：

- [ ] 是否创建 `REQ-002.review.md` 文件
- [ ] 审查是否涵盖多个维度：
- 功能完整性
- 安全性
- 性能
- 架构合理性
- 可维护性
- 回归风险
- 测试覆盖
- [ ] 是否将 Blockers/High 问题回写到 plan
- [ ] 是否给出推进建议
- [ ] INDEX 状态是否正确（Status = in-review 或 needs-fix, Current Phase = review）
- [ ] 是否输出循环选项菜单

**预期产物**：

- `.cursor/.lingxi/requirements/in-progress/REQ-002.review.md`
- `.cursor/.lingxi/requirements/in-progress/REQ-002.plan.md`（Blockers/High 问题已回写）
- `.cursor/.lingxi/requirements/INDEX.md`（已更新）

### 阶段 6: archive（归档）

**验证点**：

- [ ] 是否将 REQ 三件套从 `in-progress/` 移动到 `completed/`
- [ ] 是否更新 INDEX 的 Links 指向 `completed/`
- [ ] 是否更新 INDEX 的状态（Status = completed, Current Phase = archive, Next Action = 已完成）
- [ ] 文件移动和索引更新是否同步

**预期产物**：

- `.cursor/.lingxi/requirements/completed/REQ-002.md`
- `.cursor/.lingxi/requirements/completed/REQ-002.plan.md`
- `.cursor/.lingxi/requirements/completed/REQ-002.review.md`
- `.cursor/.lingxi/requirements/INDEX.md`（Links 已更新为 completed/ 路径，状态已更新）

## 辅助机制验证

### 人工闸门

- [ ] 每个阶段是否都输出循环选项菜单（A/B/C/D）
- [ ] 阶段切换前是否等待用户确认
- [ ] 是否有质量闸门（可推进判据）输出

### 索引管理

- [ ] INDEX.md 是否始终保持同步
- [ ] 文件创建/更新时索引是否及时更新
- [ ] 归档时索引是否正确更新

### 经验索引（如果触发）

- [ ] 进入各阶段前是否触发 experience-index（如果有相关经验）

## 测试脚本功能要求

脚本应支持：

1. 读取 `.cursor/.lingxi/requirements/INDEX.md` 文件
2. 解析表头和表格行
3. 验证表头格式（7 个字段）
4. 验证每行的 ID 格式（REQ-xxx）
5. 验证 Status 值有效性
6. 验证 Current Phase 值有效性
7. 检查文件一致性（索引中的 REQ 对应的文件是否存在）
8. 检查目录一致性（Status 和文件位置是否匹配）
9. 输出验证结果（成功/失败，错误详情）

## 潜在问题检查清单

在测试过程中注意记录：

- Skills 是否正确激活
- 文件路径和格式是否符合规范
- 索引更新是否及时和准确
- 人工闸门是否在每个阶段都起作用
- 状态机转换是否按预期工作
- 是否有未预期的行为或错误

## 执行方式

使用 `/flow` 命令逐步推进：

1. `/flow 创建一个验证 INDEX.md 格式的 Node.js 脚本`
2. 在每个阶段选择 B（进入下一阶段）或 A（继续本阶段）
3. 在 work 阶段实际编写和测试脚本
4. 在 review 阶段确认审查质量
5. 在 archive 阶段确认归档结果
