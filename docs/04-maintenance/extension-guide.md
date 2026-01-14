# 扩展指南

## 概述

本文档说明如何扩展 cursor-workflow 系统，包括新增阶段、Skill、Rule、Hook 等。

## 新增阶段

### 步骤

1. **创建阶段 Skill**
   - 在 `.cursor/skills/` 下创建新目录（如 `new-stage/`）
   - 创建 `SKILL.md`，定义阶段的输入/输出/执行步骤

2. **更新 flow-router**
   - 在 `.cursor/skills/flow-router/SKILL.md` 的阶段表中添加新阶段
   - 更新状态机逻辑

3. **更新 INDEX 表头**
   - 在 `.workflow/requirements/INDEX.md` 的说明中更新阶段列表
   - 确保 `Current Phase` 字段支持新阶段值

4. **更新相关文档**
   - 更新 `docs/02-design/workflow-lifecycle.md`
   - 更新 `docs/01-concepts/architecture-overview.md`

### 示例

假设要添加 `test` 阶段（在 work 之后）：

1. 创建 `.cursor/skills/test/SKILL.md`
2. 在 `flow-router` 中添加：
   ```markdown
   | test | `test` | 测试执行 |
   ```
3. 更新状态机：`work → test → review`

## 新增 Skill

### 步骤

1. **创建 Skill 目录**
   - 在 `.cursor/skills/` 下创建新目录
   - 创建 `SKILL.md`

2. **定义 Skill 规范**
   ```yaml
   ---
   name: skill-name
   description: 此 Skill 的用途和触发条件
   ---
   ```

3. **编写 Skill 内容**
   - 输入（Inputs）
   - 输出（Outputs）
   - 执行步骤（Instructions）
   - 禁止事项（禁止）

4. **更新文档**
   - 在 `docs/03-implementation/skills/` 下创建对应文档

### Skill 分类

- **阶段 Skills**：`stage-skills/`（req、plan、audit、work、review、archive）
- **底座 Skills**：`foundation-skills/`（index-manager、plan-manager、experience-*）
- **工具 Skills**：`utility-skills/`（service-loader、context-engineering、rules-creator）

## 新增 Rule

### 步骤

1. **确定 Rule 类型和 Scope**
   - 参考 `.cursor/rules/quality-standards-schema.md`
   - 选择 Type（always/fs/i/m）和 Scope

2. **使用 rules-creator Skill**
   - 遵循 `rules-creator` Skill 的指引
   - 选择正确的模板和 frontmatter

3. **创建 Rule 文件**
   - 位置：`.cursor/rules/qs-{type}-{scope}/RULE.md`
   - 格式：遵循现有 Rule 的格式

4. **更新索引**
   - 更新 `.cursor/rules/quality-standards-schema.md`
   - 标记规则状态

### Rule 类型

- **always**：始终应用（alwaysApply: true），必须极精炼
- **fs**：文件模式匹配（需配置 globs）
- **i**：AI 智能判断（需配置 description）
- **m**：手动引用（@qs-m-xxx）

## 新增 Hook

### 步骤

1. **创建 Hook 脚本**
   - 在 `.cursor/hooks/` 下创建 `.mjs` 文件
   - 使用 `_hook-utils.mjs` 中的工具函数

2. **注册 Hook**
   - 在 `.cursor/hooks.json` 中注册
   - 指定触发时机（beforeSubmitPrompt/beforeShellExecution/afterShellExecution/stop）

3. **实现 Hook 逻辑**
   - 读取输入（使用 `readStdinJson()`）
   - 执行逻辑
   - 输出结果（使用 `writeStdoutJson()`）

4. **更新文档**
   - 在 `docs/03-implementation/hooks/` 下创建对应文档

### Hook 类型

- **beforeSubmitPrompt**：提交提示前
- **beforeShellExecution**：Shell 执行前
- **afterShellExecution**：Shell 执行后
- **stop**：对话结束时

## 最佳实践

### Skill 设计

- **单一职责**：每个 Skill 只做一件事
- **清晰输入输出**：明确输入来源和输出目标
- **可复用性**：设计时考虑复用场景
- **文档完善**：提供清晰的文档和示例

### Rule 设计

- **精炼**：always 类型规则必须极精炼
- **明确 Scope**：确保规则适用范围清晰
- **可执行**：规则应该是可执行的约束

### Hook 设计

- **不阻塞主流程**：Hook 应该快速执行，不阻塞主流程
- **错误处理**：妥善处理错误，不影响主流程
- **工具函数**：使用 `_hook-utils.mjs` 中的工具函数

## 参考

- [Skill 创建模板](../../.cursor/skills/skill-creator/SKILL.md)
- [Rule 创建流程](../../.cursor/skills/rules-creator/SKILL.md)
- [Hook 系统架构](../03-implementation/hooks/hook-system.md)
