---
name: rules-creator
description: 此 Skill 用于创建或更新 Cursor Rules（qs-* 质量准则）。当用户确认采纳质量准则建议、需要创建新的 qs-{type}-{scope} 规则、或需要向现有规则追加内容时激活，或在 /init 命令初始化项目过程中用户选择将质量准则存入规则库时激活，负责配置 frontmatter（alwaysApply/globs/description）并更新索引。
---

# Rules Creator

## Inputs（从上下文获取）

- 准则内容（建议描述）
- 推荐的 Type 和 Scope（若无则需推导）
- 来源经验（如有）
- **预处理配置**（从 experience-depositor 调用时）：type/scope/globs/description（已在上一步确认）

## Outputs

- 创建或更新 `.cursor/rules/qs-{type}-{scope}.mdc`（项目级质量准则）
- 更新 `.cursor/rules/quality-standards-index.md`
- 更新 `.cursor/rules/quality-standards-schema.md`（状态变更）

**注意**：本 Skill 只创建项目级质量准则。workflow 工具约束已在 Skills/Commands 中实现，不在此 Skill 管理。

---

## Instructions

### 0) 检查调用来源

**如果从 experience-depositor 调用**（已提供预处理配置）：
- 跳过步骤 0.5、1-2（需求收集、类型和范围已确定）
- 直接使用预处理配置（type/scope/globs/description）
- 简化交互确认（配置已在上一步确认）
- 从步骤 3 开始执行

**如果是独立调用**（用户直接创建规则）：
- 正常执行所有步骤

### 0.5) 需求收集（独立调用时）

**核心原则**：从上下文推断优先，避免冗余提问。

#### 1. 从上下文推断（优先）

分析对话历史，提取已讨论的信息：
- **Purpose**：规则要解决什么问题？要约束或指导什么？
- **Scope**：应该应用到哪些文件或场景？
- **File patterns**：如果是文件相关，具体的 globs 模式是什么？

如果上下文已提供完整信息，直接使用，不重复提问。

#### 2. 缺失信息收集（使用 AskQuestion tool）

如果未指定 scope，询问：
- "Should this rule always apply, or only when working with specific files?"

如果提到特定文件但未提供 globs，询问：
- "Which file patterns should this rule apply to?" (e.g., `**/*.ts`, `backend/**/*.py`)

**重要**：必须明确文件模式，不能模糊。如果用户回答模糊，继续追问直到获得具体的 globs 模式。

#### 3. 验证 globs 配置（File-scoped 类型）

如果确定为 File-scoped 类型：
1. 先分析项目结构（使用 `list_dir` 或 `glob_file_search`）
2. 验证 globs 模式是否匹配实际文件
3. 如果 globs 不匹配，提示用户并提供建议
4. 如果匹配到过多无关文件，提示用户缩小范围

### 1) 确定规则类型（Type）[核心]

**Type 是关键**：决定规则如何应用（always/fs/i/m），必须准确选择。

使用以下决策树：

```
这条准则必须始终遵守吗？（安全红线/合规底线）
├─ 是 → always
└─ 否 → 这条准则与特定文件类型/路径绑定吗？
         ├─ 是 → fs (file-scoped)
         └─ 否 → 这条准则有明确的领域/场景吗？
                  ├─ 是 → i (intelligent)
                  └─ 否 → m (manual)
```

### 2) 确定规则范围（Scope）[可选]

**Scope 只是分类标签**：不准确不影响规则功能，AI 根据上下文自行选择合适的 scope。

参考 scope 列表（可根据项目需要扩展）：

| Scope | 适用领域 |
|-------|---------|
| `security` | 安全合规/权限/密钥 |
| `design` | 设计规范/UI/UX |
| `frontend` | 前端开发/组件/状态 |
| `backend` | 后端开发/API/服务 |
| `database` | 数据库/SQL/迁移 |
| `general` | 通用规范/代码风格 |
| `ops` | 运维/部署/CI/CD |

**选择原则**：根据上下文和项目类型自行判断，无需强制匹配标准列表。

### 3) 检查目标规则是否存在

目标规则名：`qs-{type}-{scope}`

- **规则已存在** → 在现有 `qs-{type}-{scope}.mdc` 中追加新准则内容
- **规则不存在** → 按模板创建新规则

### 3.5) 获取创建日期

在创建新规则时，获取当前日期用于元数据：

- **方式**：使用系统命令 `date +%Y-%m-%d` 获取当前日期（格式：`YYYY-MM-DD`）
- **存储**：优先在 frontmatter 中添加 `created` 字段（方案A），如果 Cursor 不支持则使用方案B（文件末尾）

### 4) 配置 Frontmatter

> ⚠️ **MDC 格式要求**：所有规则文件必须包含 `description` 字段（Cursor MDC 格式必需）。

根据类型配置 frontmatter：

**Always 类型**：
```yaml
---
description: "{规则描述，用英文描述规则提供什么}"
alwaysApply: true
created: "{created_date}"
---
```

**File-scoped 类型**：
```yaml
---
description: "{规则描述，用英文描述规则提供什么}"
globs:
  - "{根据项目实际目录结构配置}"
alwaysApply: false
created: "{created_date}"
---
```
> ⚠️ globs 必须根据项目实际目录结构配置，先分析项目结构确定实际路径。

**Intelligent 类型**：
```yaml
---
description: "This rule provides {domain} standards for {specific areas}"
alwaysApply: false
created: "{created_date}"
---
```
> ⚠️ description 用**英文**描述规则**提供什么**，而非触发条件。好的：`"Security guidelines for authentication"`，差的：`"当涉及安全问题时"`

**Manual 类型**：
```yaml
---
description: "{规则描述，用英文描述规则提供什么}"
alwaysApply: false
created: "{created_date}"
---
```

> **注意**：如果 Cursor 不支持 frontmatter 中的 `created` 字段，则在文件末尾添加 `Created: {created_date}`。

### 5) 应用规则模板

**Always 模板**：`# {Scope} Redlines` → `## Prohibited` / `## Required`

**File-scoped 模板**：`# {Scope} Standards` → `## {Section}`

**Intelligent 模板**：`# {Scope} Guidelines` → `## {Section}`

**Manual 模板**：`# {Checklist Name}` → `> Usage: @qs-m-{scope}` → `## {Check Dimension}` → `- [ ] {检查项}`

所有模板需包含：frontmatter（见步骤 4）+ 标题 + 内容 + `---` + `Source: {来源}` + `Created: {created_date}`

### 6) 更新索引

更新 `.cursor/rules/quality-standards-index.md`：

1. **规则统计**：更新各类型数量
2. **已创建规则清单**：新增/更新行
3. **准则溯源**：新增行（准则描述、规则文件、来源、采纳日期）
4. **变更记录**：追加行

同时更新 `.cursor/rules/quality-standards-schema.md`：
- 将对应规则的状态从 `⏳ 按需` 改为 `✅ 已创建`

---

## Best Practices

> 参考：https://cursor.com/cn/docs/context/rules

### 核心原则

1. **保持简洁（Keep Rules Concise）**
   - **Under 50 lines**：规则应该简洁明了，控制在 50 行以内
   - **One concern per rule**：每条规则只解决一类问题
   - 超过 50 行应拆分为多个可组合的规则

2. **可操作性（Actionable）**
   - 像写清晰的内部文档那样写规则
   - 提供具体示例，而不是抽象描述
   - 差："写好的代码"
   - 好："函数不超过 50 行，单一职责"

3. **具体示例（Concrete Examples）**
   - 使用代码示例说明正确和错误的做法
   - 使用 `@filename.ts` 引用模板文件
   - 提供可复制的代码片段

4. **复用已有规则**
   - 优先扩展现有规则而不是创建新规则

### Always 类型特殊约束

> ⚠️ **重要**：Always 规则会占用每次对话的上下文，必须极精炼

- **每个 Always 规则 < 50 行**（严格限制）
- **所有 Always 规则总计 < 150 行**
- **只放"红线/底线"类内容**（安全、合规、核心原则）

### 规则长度检查

创建规则时自动检查：
- Always 类型：如果超过 50 行，警告并建议拆分
- 其他类型：如果超过 500 行，警告并建议拆分

### Intelligent 类型 description 写法

description 用于让 AI 判断规则是否相关，应当：

- 用英文编写
- 描述规则**提供什么**，而不是触发条件
- 具体、可匹配

| ✅ 好的 description | ❌ 差的 description |
|---------------------|---------------------|
| `Security guidelines for authentication, authorization, and secure coding` | `安全相关` |
| `Frontend standards for React components, state management, and testing` | `前端开发时` |
| `Database standards for schema design, query optimization, and migrations` | `数据库操作` |

### File-scoped 类型 globs 配置

1. **分析项目结构**：使用 `list_dir` 或 `glob_file_search` 确定实际路径
2. **确定 globs 模式**：根据实际目录结构配置，不套用固定模式
3. **验证匹配**：使用 `glob_file_search` 验证 globs 是否匹配实际文件
4. **提供建议**（可选）：基于项目结构提供建议，展示匹配文件列表

示例（需根据实际调整）：`**/components/**/*.tsx`、`**/api/**/*.ts`、`**/*.sql`

---

## 禁止

- 自动创建规则（必须有用户确认）
- 在 Always 规则中放入非红线内容
- 使用中文编写 Intelligent 规则的 description
- 套用固定 globs 而不检查项目结构

---

## 交互确认

### 如果从 experience-depositor 调用

- 跳过交互确认（配置已在上一步确认）
- 直接执行创建流程
- 输出创建结果摘要

### 如果是独立调用

**步骤 1：展示配置预览**

```
准备创建质量准则规则：

目标规则：qs-{type}-{scope}
状态：{已存在/尚未创建}

配置预览：
- Type: {type} ({type 说明})
- Scope: {scope} ({scope 说明})
- Description: {description}
- Globs: {globs 或 "N/A (Always)"}
- 规则长度预估: {预估行数} 行

将执行：
1. {创建/更新} .cursor/rules/qs-{type}-{scope}.mdc
2. 配置 frontmatter（{frontmatter 预览}）
3. {插入新准则/追加到现有规则}
4. 更新 .cursor/rules/quality-standards-index.md
5. 更新 .cursor/rules/quality-standards-schema.md

确认？ A) 确认 / B) 调整 / C) 取消
```

**步骤 2：Globs 验证**（File-scoped 类型）

如果用户确认，且类型为 File-scoped：
1. 验证 globs 模式是否匹配项目中的实际文件
2. 如果匹配失败，提示：
   ```
   ⚠️ 警告：globs 模式 "{pattern}" 未匹配到任何文件
   
   建议：
   - 检查项目结构
   - 调整 globs 模式
   - 或选择其他类型（如 Intelligent）
   
   继续创建？ Y/N
   ```

---

## Checklist（创建后验证）

创建规则后，自动检查：

- [ ] 文件是 `.mdc` 格式，位于 `.cursor/rules/`
- [ ] Frontmatter 配置正确（description 必填）
- [ ] Always 类型：内容 < 50 行
- [ ] 其他类型：内容 < 500 行
- [ ] File-scoped 类型：globs 已验证匹配实际文件
- [ ] Intelligent 类型：description 用英文描述"提供什么"
- [ ] 包含具体示例（代码片段或参考文件）
- [ ] 索引文件已更新（quality-standards-index.md）
- [ ] Schema 文件已更新（quality-standards-schema.md）

如果检查失败，输出警告并提示修复。

---

## 示例规则

**File-scoped**：`qs-fs-typescript.mdc` - TypeScript 标准（globs: `**/*.ts`, `**/*.tsx`），包含错误处理和类型安全示例

**Always**：`qs-always-security.mdc` - 安全红线（alwaysApply: true），包含 Prohibited/Required 两部分

参考现有规则：`.cursor/rules/qs-always-general.mdc`
