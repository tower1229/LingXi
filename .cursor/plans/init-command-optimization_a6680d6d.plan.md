---
name: init-command-optimization
overview: 优化 /init 命令的执行体验，解决 4 个高优先级问题：移除 HTML 注释传递机制、增加确认环节、明确下一步选项、添加经验候选确认
todos:
  - id: phase1-1
    content: 修改 experience-capture Skill：移除 HTML 注释，添加评估和文件写入逻辑
    status: completed
  - id: phase1-2
    content: 删除 experience-collector.md 文件
    status: completed
  - id: phase1-3
    content: 更新 candidate-evaluator Skill：移除对 experience-collector 的引用
    status: completed
  - id: phase1-4
    content: 更新 init.md：移除 HTML 注释要求，更新阶段说明
    status: completed
  - id: phase1-5
    content: 更新业务文档：knowledge-compounding.md、workflow-lifecycle.md、noise-filter.md
    status: completed
  - id: phase2-1
    content: 更新 init.md 阶段 1：添加结构化确认选项和明确下一步选项影响
    status: completed
  - id: phase3-1
    content: 更新 experience-capture Skill：在写入前添加经验候选确认环节
    status: completed
  - id: phase3-2
    content: 更新 init.md：说明经验候选确认环节的交互方式
    status: completed
isProject: false
---

# /init 命令调优实施计划

## 目标

优化 `/init` 命令的执行体验，解决 4 个高优先级问题：

1. **问题 4**：移除 HTML 注释传递机制，职责合并到 `experience-capture`
2. **问题 2**：增加明确的确认机制
3. **问题 3**：明确下一步选项的影响
4. **问题 8**：添加经验候选确认环节

## Phase 1：EXP-CANDIDATE 传递机制重构

### 1.1 修改 experience-capture Skill

**文件**：`.cursor/skills/experience-capture/SKILL.md`

**修改内容**：

- 移除"静默输出 HTML 注释"的要求（第 95、142-144 行）
- 移除 HTML 注释格式说明（第 104-122 行）
- 添加完整的处理流程：
  1. 识别 EXP-CANDIDATE（保持现有触发机制）
  2. **新增**：输出用户友好的摘要并询问用户确认
  3. **新增**：用户确认后，调用 `candidate-evaluator` 执行阶段 1 评估
  4. **新增**：评估通过后，读取 `pending-compounding-candidates.json`（如果存在），合并新候选，写入文件
  5. **新增**：输出确认信息（如："已识别并暂存 4 个经验候选"）

**关键实现细节**：

- 摘要格式：`已识别 X 个经验候选：[候选1类型]、[候选2类型]、...`
- 文件操作：读取现有 JSON，合并到 `candidates` 数组，保留 `asked` 标志
- 评估调用：传递 EXP-CANDIDATE JSON 和 `stage1` 参数给 `candidate-evaluator`
- 确认选项：`A) 全部确认`、`B) 需要调整`、`C) 跳过确认`

### 1.2 删除 experience-collector Subagent

**文件**：`.cursor/agents/experience-collector.md`

**操作**：删除该文件

### 1.3 更新 candidate-evaluator Skill

**文件**：`.cursor/skills/candidate-evaluator/SKILL.md`

**修改内容**：

- 更新 description（第 3 行）：移除"在 experience-collector 和 experience-depositor 中调用"，改为"在 experience-capture 和 experience-depositor 中调用"
- 更新阶段 1 说明（第 23 行）：移除"在 experience-collector 中调用"，改为"在 experience-capture 中调用"

### 1.4 更新 init.md

**文件**：`.cursor/commands/init.md`

**修改内容**：

- 阶段 1（第 57 行）：移除"输出 EXP-CANDIDATE 格式（静默输出，HTML 注释包裹）"
- 阶段 1 输出要求（第 75 行）：移除"静默输出识别的经验候选（EXP-CANDIDATE 格式）"
- 阶段 3（第 96 行）：更新说明，明确候选从 `pending-compounding-candidates.json` 读取
- 输出要求（第 152-156 行）：移除 HTML 注释相关要求，改为"输出摘要 + 用户确认 + 评估 + 写入文件"

### 1.5 更新业务文档

**文件 1**：`.cursor/.lingxi/context/business/references/knowledge-compounding.md`

**修改内容**：

- 更新流程图（第 9-35 行）：移除 `experience-collector` 节点
- 更新自动收集说明（第 77-87 行）：改为 `experience-capture` 直接处理
- 更新流程描述：`experience-capture` 识别 → 评估 → 写入文件

**文件 2**：`.cursor/.lingxi/context/business/workflow-lifecycle.md`

**修改内容**：

- 更新经验沉淀机制说明：移除 `experience-collector` 的引用

**文件 3**：`.cursor/agents/references/noise-filter.md`

**修改内容**：

- 更新说明：移除"在 experience-collector 中实现"的引用

### 1.6 验证安装清单

**文件**：`install/install-manifest.json`

**状态**：已更新（已从 `agents.files` 中删除 `experience-collector.md`）

## Phase 2：确认机制优化

### 2.1 更新 init.md 阶段 1

**文件**：`.cursor/commands/init.md`

**修改内容**：

- 在阶段 1 信息展示后（第 72-76 行之后），添加结构化确认选项：

  ```markdown
  ## 请确认信息准确性

  - ✅ **A) 全部准确，继续**：进入下一阶段
  - 📝 **B) 需要补充**：请说明需要补充的内容
  - 🔍 **C) 需要深入调查**：请指定需要深入调查的模块
  ```

- 在下一步建议部分（阶段 1 末尾），明确每个选项的影响：

  ```markdown
  ## 下一步选择

  - **A) 继续深入调查所有模块**
    - 将调查：AI 分析流水线、GitHub 数据同步、配额管理、数据版本控制等
    - 预计耗时：5-10 分钟
    - 产出：完整的服务上下文文档 + 更多经验候选

  - **B) 重点调查某个模块**
    - 请指定模块名称（如：AI 分析流水线）
    - 将深入调查该模块的架构、依赖、常见坑点
    - 预计耗时：2-5 分钟

  - **C) 直接进入文档生成阶段**
    - 基于当前信息生成业务上下文文档
    - 预计耗时：1-2 分钟
  ```

## Phase 3：经验候选确认环节

### 3.1 更新 experience-capture Skill

**文件**：`.cursor/skills/experience-capture/SKILL.md`

**修改内容**：

- 在"完整捕获流程"（第 90-95 行）中，修改流程：
  1. 生成 EXP-CANDIDATE
  2. **新增**：输出摘要并询问用户确认
  3. **新增**：用户确认后，才执行评估和写入
  4. **新增**：如果用户选择调整，允许修改候选信息

**确认选项格式**：

```markdown
## 请确认经验候选

已识别 X 个经验候选：[候选1类型]、[候选2类型]、...

- ✅ **A) 全部确认**：评估并暂存这些候选
- 📝 **B) 需要调整**：请说明需要调整的候选和内容
- ⏭️ **C) 跳过确认**：直接评估并暂存
```

### 3.2 更新 init.md

**文件**：`.cursor/commands/init.md`

**修改内容**：

- 阶段 1（第 57 行）：更新说明，明确候选需要在用户确认后才写入文件
- 添加说明：确认环节的交互方式由 `experience-capture` Skill 处理

## 实施顺序

1. **Phase 1**：先完成传递机制重构（这是基础，其他优化依赖此变更）
2. **Phase 2**：然后优化确认机制（相对独立）
3. **Phase 3**：最后添加经验候选确认（依赖 Phase 1 的变更）

## 验证要点

- [ ] `experience-capture` 不再输出 HTML 注释
- [ ] `experience-collector.md` 已删除
- [ ] 所有文档中不再引用 `experience-collector`
- [ ] `pending-compounding-candidates.json` 正确写入和读取
- [ ] 用户确认机制正常工作
- [ ] 经验候选确认环节正常工作
