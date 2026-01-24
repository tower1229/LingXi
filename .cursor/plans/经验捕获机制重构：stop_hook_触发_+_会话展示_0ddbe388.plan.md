---
name: 经验捕获机制重构：stop hook 触发 + 会话展示
overview: 重构经验捕获机制：使用 stop hook 触发 experience-capture skill，移除 pending-compounding-candidates.json 文件依赖，合并 candidate-evaluator 到 experience-capture，简化 experience-depositor 只负责治理和写入。所有候选直接在会话中展示，用户即时选择。
todos: []
isProject: false
---

# 经验捕获机制重构执行规划

## 目标

将经验捕获机制从"自动匹配触发 + 文件暂存"改为"stop hook 触发 + 会话展示"，实现更直接的用户体验和更简洁的架构。

## 核心变更

1. **触发机制**：从 Cursor Skill 自动匹配改为 stop hook 触发
2. **数据流转**：从文件暂存（pending-compounding-candidates.json）改为会话展示
3. **评估逻辑**：将 candidate-evaluator 合并到 experience-capture
4. **depositor 简化**：移除评估逻辑，只负责治理和写入

## 详细执行步骤

### 阶段 1：stop hook 改造

#### 1.1 修改 `.cursor/hooks/stop.mjs`

**变更内容**：

- 移除读取 `pending-compounding-candidates.json` 的逻辑
- 添加会话去重机制（基于 `conversation_id` + `generation_id`）
- 添加轻量级信号检测（可选，减少无效触发）
- 输出 followup_message 引导调用 experience-capture skill

**关键实现**：

```javascript
// 会话去重
const sessionKey = `${input.conversation_id}-${input.generation_id}`;
const processedFile = path.join(projectRoot, '.cursor/.lingxi/workspace/processed-sessions.json');

// 检查是否已处理
if (await isProcessed(sessionKey, processedFile)) return;

// 标记已处理
await markProcessed(sessionKey, processedFile);

// 输出 prompt 引导调用 skill
writeStdoutJson({
  followup_message: `请使用 @experience-capture 技能扫描本次对话（conversation_id: ${input.conversation_id}, generation_id: ${input.generation_id}），提取有价值的经验候选。注意过滤：单纯知识解释、临时调试猜测、尚未验证的方案、明显一次性代码。`
});
```

**新增文件**：

- `.cursor/.lingxi/workspace/processed-sessions.json`（会话去重记录）

### 阶段 2：experience-capture skill 重构

#### 2.1 合并 candidate-evaluator 评估逻辑

**文件**：`.cursor/skills/experience-capture/SKILL.md`

**变更内容**：

1. **更新 description**：移除"自动激活"描述，改为"由 stop hook 触发"
2. **合并评估逻辑**：将 candidate-evaluator 的所有评估维度合并进来

   - 结构完整性评估
   - 判断结构质量评估
   - 可复用性评估（时间维度、空间维度、抽象层次）
   - 知识可获得性评估
   - 经验类型判断（Type）
   - Level 判断
   - 沉淀载体适配性评估

3. **移除文件写入逻辑**：删除所有关于 `pending-compounding-candidates.json` 的代码
4. **添加会话展示逻辑**：直接在会话中展示候选结果，让用户选择

**新的工作流程**：

```
1. 扫描对话历史，识别经验信号
2. 生成 EXP-CANDIDATE JSON
3. 执行评估（合并的 candidate-evaluator 逻辑）
4. 过滤明显不通过的候选
5. 在会话中展示候选列表（包含评估结果摘要）
6. 用户选择要沉淀的候选（编号选择）
7. 将选中的候选传递给 experience-depositor
```

**展示格式**：

```markdown
## 经验候选列表

### 候选 1：[标题] [团队级/项目级] [标准/经验]
- **触发条件**：...
- **判断**：...
- **推荐存储**：团队级标准
- **知识可获得性**：低（0.8）- 团队特定决策

### 候选 2：...

请选择要沉淀的候选（输入编号，如 `1,3` 或 `全部`）：
```

#### 2.2 更新 references 文件

**文件**：`.cursor/skills/experience-capture/references/*.md`

**变更内容**：

- 更新触发场景说明，反映新的触发机制（stop hook 触发）

### 阶段 3：experience-depositor skill 简化

#### 3.1 移除评估和文件读取逻辑

**文件**：`.cursor/skills/experience-depositor/SKILL.md`

**变更内容**：

1. **移除编号选择解析**：不再从 `pending-compounding-candidates.json` 读取
2. **移除阶段 2 评估**：不再调用 candidate-evaluator
3. **简化输入**：直接从会话上下文获取候选（由 experience-capture 传递）
4. **保留核心流程**：

   - 冲突检测（读取 INDEX.md）
   - 调用 memory-curator 方案模式
   - 展示治理方案
   - 用户确认
   - 调用 memory-curator 执行模式
   - 存储目标选择
   - **写入前执行治理**（调用 memory-curator）
   - 写入经验文件
   - 更新索引

**新的工作流程**：

```
1. 从会话上下文获取候选（由 experience-capture 传递）
2. 冲突检测（读取 INDEX.md）
3. 调用 memory-curator 方案模式
4. 展示治理方案，用户确认
5. 调用 memory-curator 执行模式
6. 存储目标选择
7. 写入前执行治理（调用 memory-curator）
8. 写入经验文件
9. 更新索引
```

#### 3.2 更新 description

**变更**：移除关于 `pending-compounding-candidates.json` 的描述

### 阶段 4：删除 candidate-evaluator skill

#### 4.1 删除 skill 文件

**文件**：`.cursor/skills/candidate-evaluator/SKILL.md`

**操作**：完全删除该文件

### 阶段 5：更新所有相关文档

#### 5.1 架构文档

**文件**：

- `docs/design/architecture.md`
- `.cursor/skills/about-lingxi/references/architecture.md`
- `.cursor/skills/about-lingxi/references/memory-system.md`

**变更内容**：

- 更新经验沉淀机制描述
- 移除 candidate-evaluator 的引用
- 更新触发机制说明（stop hook 触发）
- 移除 pending-compounding-candidates.json 的引用

#### 5.2 命令文档

**文件**：

- `.cursor/commands/req.md`
- `.cursor/commands/plan.md`
- `.cursor/commands/build.md`
- `.cursor/commands/review.md`
- `.cursor/commands/remember.md`
- `.cursor/commands/init.md`

**变更内容**：

- 更新经验捕获触发机制说明
- 移除 pending-compounding-candidates.json 的引用
- 更新 `/remember` 命令说明（不再从文件读取）

#### 5.3 Executor Skills 文档

**文件**：

- `.cursor/skills/req-executor/SKILL.md`
- `.cursor/skills/plan-executor/SKILL.md`
- `.cursor/skills/build-executor/SKILL.md`
- `.cursor/skills/review-executor/SKILL.md`

**变更内容**：

- 更新经验捕获说明（stop hook 触发，不再自动匹配）

#### 5.4 业务记忆文档

**文件**：

- `.cursor/.lingxi/memory/business/references/knowledge-compounding.md`
- `.cursor/.lingxi/memory/business/workflow-lifecycle.md`

**变更内容**：

- 更新经验沉淀流程描述
- 移除 pending-compounding-candidates.json 的引用

#### 5.5 组件指南

**文件**：`.cursor/skills/about-lingxi/references/component-guides.md`

**变更内容**：

- 移除 candidate-evaluator 的描述
- 更新 experience-capture 的描述

### 阶段 6：更新安装程序

#### 6.1 移除 pending-compounding-candidates.json 创建

**文件**：

- `install/bash.sh`
- `install/powershell.ps1`

**变更内容**：

- 移除创建 `pending-compounding-candidates.json` 的代码
- 添加创建 `processed-sessions.json` 的代码（可选，首次使用时创建）

#### 6.2 更新 install-manifest.json

**文件**：`install/install-manifest.json`

**变更内容**：

- 移除 `skills/candidate-evaluator/SKILL.md`
- 保留 `skills/experience-capture/SKILL.md`（但更新引用）

### 阶段 7：更新 .gitignore

**文件**：`.gitignore`

**变更内容**：

- 确认 `.cursor/.lingxi/workspace/` 已在 gitignore 中（包含 processed-sessions.json）

## 数据流对比

### 旧流程

```
用户输入 → experience-capture (自动匹配) → candidate-evaluator (阶段1)
→ pending-compounding-candidates.json → stop hook 提醒
→ /remember → experience-depositor → candidate-evaluator (阶段2)
→ memory-curator → 写入文件
```

### 新流程

```
任务完成 → stop hook → experience-capture (合并评估)
→ 会话展示候选 → 用户选择 → experience-depositor
→ memory-curator (治理) → 写入文件
```

## 关键设计决策

1. **会话去重**：基于 `conversation_id + generation_id` 组合，避免重复处理
2. **评估合并**：将 candidate-evaluator 完全合并到 experience-capture，简化架构
3. **即时展示**：候选直接在会话中展示，无需文件暂存
4. **治理前置**：在写入前执行治理，确保知识库质量

## 风险评估

1. **stop hook 触发时机**：需要验证是否在合适的时机触发（任务真正完成时）
2. **会话去重机制**：需要确保不会遗漏有价值的经验
3. **评估逻辑合并**：需要确保评估质量不受影响
4. **向后兼容**：不需要考虑兼容，按用户要求直接废弃旧机制

## 测试要点

1. stop hook 正确触发并引导调用 experience-capture
2. experience-capture 正确扫描对话并生成候选
3. 评估逻辑正确过滤和分类候选
4. 会话展示格式清晰易读
5. experience-depositor 正确执行治理和写入
6. 所有文档更新完整准确