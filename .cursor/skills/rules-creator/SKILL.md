---
name: rules-creator
description: 此 Skill 用于创建或更新 Cursor Rules（qs-* 质量准则）。当用户确认采纳质量准则建议、需要创建新的 qs-{type}-{scope} 规则、或需要向现有规则追加内容时激活，负责配置 frontmatter（alwaysApply/globs/description）并更新索引。
---

# Rules Creator

## Inputs（从上下文获取）

- 准则内容（建议描述）
- 推荐的 Type 和 Scope（若无则需推导）
- 来源经验（如有）

## Outputs

- 创建或更新 `.cursor/rules/qs-{type}-{scope}/RULE.md`（项目级质量准则）
- 更新 `.cursor/rules/quality-standards-index.md`
- 更新 `.cursor/rules/quality-standards-schema.md`（状态变更）

**注意**：本 Skill 只创建项目级质量准则。workflow 工具规则使用 `AGENTS.md`（根目录或嵌套）实现，不在此 Skill 管理。

---

## Instructions

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

- **规则已存在** → 在现有 RULE.md 中追加新准则内容
- **规则不存在** → 按模板创建新规则

### 3.5) 获取创建日期

在创建新规则时，获取当前日期用于元数据：

- **方式**：使用系统命令 `date +%Y-%m-%d` 获取当前日期（格式：`YYYY-MM-DD`）
- **存储**：优先在 frontmatter 中添加 `created` 字段（方案A），如果 Cursor 不支持则使用方案B（文件末尾）

### 4) 配置 Frontmatter

根据类型配置正确的 frontmatter：

**Always 类型**：
```yaml
---
alwaysApply: true
created: "{created_date}"
---
```

**File-scoped 类型**：
```yaml
---
globs:
  - "{根据项目实际目录结构配置}"
alwaysApply: false
created: "{created_date}"
---
```

> ⚠️ globs 必须根据项目实际目录结构配置，不要套用固定模式。
> 先分析项目结构，确定相关文件的实际路径。

**Intelligent 类型**：
```yaml
---
description: "This rule provides {domain} standards for {specific areas}"
alwaysApply: false
created: "{created_date}"
---
```

> ⚠️ description 必须用**英文**描述规则**提供什么**，而不是触发条件。
> 好的 description：`"Security guidelines for authentication and authorization"`
> 差的 description：`"当涉及安全问题时"`

**Manual 类型**：
```yaml
---
alwaysApply: false
created: "{created_date}"
---
```

> **注意**：如果 Cursor 不支持 frontmatter 中的 `created` 字段（解析错误），则使用方案B：在文件末尾添加 `Created: {created_date}` 字段（与现有的 `Source:` 和 `Adopted:` 保持一致）。

### 5) 应用规则模板

#### Always 模板

```markdown
---
alwaysApply: true
created: "{created_date}"
---

# {Scope} Redlines

## Prohibited
- {禁止的行为}

## Required
- {必须的行为}

---
Source: {来源经验或"手动创建"}
Created: {created_date}
```

#### File-scoped 模板

```markdown
---
globs:
  - "{glob1}"
  - "{glob2}"
alwaysApply: false
created: "{created_date}"
---

# {Scope} Standards

## {Section 1}
- {准则内容}

---
Source: {来源经验}
Created: {created_date}
```

#### Intelligent 模板

```markdown
---
description: "This rule provides {domain} standards for {specific areas}"
alwaysApply: false
created: "{created_date}"
---

# {Scope} Guidelines

## {Section 1}
- {准则内容}

---
Source: {来源经验}
Created: {created_date}
```

#### Manual 模板

```markdown
---
alwaysApply: false
created: "{created_date}"
---

# {Checklist Name}

> Usage: @qs-m-{scope}

## {Check Dimension 1}
- [ ] {检查项}

---
Source: {来源经验}
Created: {created_date}
```

### 6) 更新索引

更新 `.cursor/rules/quality-standards-index.md`：

1. **规则统计**：更新各类型数量
2. **已创建规则清单**：新增/更新行
3. **准则溯源**：新增行（准则描述、规则文件、来源、采纳日期）
4. **变更记录**：追加行

同时更新 `.cursor/rules/quality-standards-schema.md`：
- 将对应规则的状态从 `⏳ 按需` 改为 `✅ 已创建`

---

## Best Practices（来自 Cursor 官方文档）

> 参考：https://cursor.com/cn/docs/context/rules

### 规则编写原则

1. **聚焦、可操作、范围明确**
   - 每条规则解决一类问题，不要面面俱到
   
2. **控制在 500 行以内**
   - 超过 500 行应拆分为多个可组合的规则
   
3. **提供具体示例或参考文件**
   - 使用 `@filename.ts` 引用模板文件
   - 用代码示例说明而不是抽象描述

4. **避免模糊指导**
   - 像写清晰的内部文档那样写规则
   - 差："写好的代码"
   - 好："函数不超过 50 行，单一职责"

5. **复用已有规则**
   - 优先扩展现有规则而不是创建新规则

### Always 类型约束

> 约束：Always 规则会占用每次对话的上下文，必须极精炼

- 每个 Always 规则 < 50 行
- 所有 Always 规则总计 < 150 行
- 只放"红线/底线"类内容

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

globs 必须根据项目实际目录结构配置：

1. 先分析项目结构（`ls` / `tree`）
2. 确定相关文件的实际路径模式
3. 不要套用固定模式

示例（需根据实际调整）：
- 前端组件：`**/components/**/*.tsx`、`src/ui/**`
- 后端 API：`**/api/**`、`server/routes/**`
- 数据库：`**/*.sql`、`prisma/**`

---

## 禁止

- 自动创建规则（必须有用户确认）
- 在 Always 规则中放入非红线内容
- 使用中文编写 Intelligent 规则的 description
- 套用固定 globs 而不检查项目结构

---

## 交互确认

创建新规则前，必须向用户确认：

```
准备创建质量准则规则：

目标规则：qs-{type}-{scope}
状态：{已存在/尚未创建}

将执行：
1. {创建/更新} .cursor/rules/qs-{type}-{scope}/RULE.md
2. 配置 {frontmatter 说明}
3. 插入准则内容
4. 更新 .cursor/rules/quality-standards-index.md

确认？ A) 确认 / B) 调整 / C) 取消
```
