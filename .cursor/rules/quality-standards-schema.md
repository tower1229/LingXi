# Quality Standards Schema（质量准则目录）

> 本文件定义所有可能的规则组合，作为智慧沉淀时的"选择菜单"。
> 规则文件按需创建，不预先生成。
>
> **创建规则时**，请使用 Skill `rules-creator`，它包含类型选择、模板、最佳实践等操作指南。
>
> **注意**：
>
> - workflow 工具规则使用 `AGENTS.md`（根目录或嵌套）实现，不在此目录管理。
> - workflow 只默认提供 `qs-always-general` 作为最基本的初始规则，其他规则由项目通过 `/remember` 和 `rules-creator` Skill 按需创建。
> - 本目录仅用于项目级质量准则（`.cursor/rules/qs-*`）。

---

## 命名规则

```
qs-{type}-{scope}/RULE.md

type:
  - always: 始终应用（alwaysApply: true）
  - fs: 文件模式匹配（需配置 globs）
  - i: AI 智能判断（需配置 description）
  - m: 手动引用（@qs-m-xxx）

scope:
  - security: 安全合规
  - design: 设计规范
  - frontend: 前端开发
  - backend: 后端开发
  - database: 数据库
  - general: 通用规范
  - ops: 运维部署
```

---

## 规则目录

### Always（始终应用）

> 约束：必须极精炼，每个规则 < 50 行，总计 < 150 行

| 规则名             | 状态      | 用途                 |
| ------------------ | --------- | -------------------- |
| qs-always-security | ⏳ 按需   | 安全红线             |
| qs-always-general  | ✅ 已创建 | 核心开发原则         |
| qs-always-design   | ⏳ 按需   | 设计红线（如有必要） |

### File-scoped（文件模式匹配）

> ⚠️ globs 必须根据项目实际目录结构配置，表格中仅为示例。

| 规则名         | 状态    | globs（示例）                    | 用途           |
| -------------- | ------- | -------------------------------- | -------------- |
| qs-fs-design   | ⏳ 按需 | `**/design/**`, `**/styles/**`   | 设计文件规范   |
| qs-fs-frontend | ⏳ 按需 | `**/components/**/*.tsx`         | 前端文件规范   |
| qs-fs-backend  | ⏳ 按需 | `**/api/**`, `**/routes/**`      | 后端文件规范   |
| qs-fs-database | ⏳ 按需 | `**/*.sql`, `**/migrations/**`   | 数据库文件规范 |
| qs-fs-ops      | ⏳ 按需 | `**/Dockerfile`, `**/.github/**` | 运维配置规范   |

### Intelligent（AI 智能判断）

> description 用英文描述规则提供什么，如 `"This rule provides standards for..."`

| 规则名        | 状态    | description                                                                            | 用途           |
| ------------- | ------- | -------------------------------------------------------------------------------------- | -------------- |
| qs-i-security | ⏳ 按需 | Security guidelines for authentication, authorization, and secure coding practices     | 安全场景建议   |
| qs-i-design   | ⏳ 按需 | Design system standards for UI/UX patterns, visual consistency, and accessibility      | 设计场景建议   |
| qs-i-frontend | ⏳ 按需 | Frontend development standards for component architecture and state management         | 前端场景建议   |
| qs-i-backend  | ⏳ 按需 | Backend development standards for API design, service architecture, and error handling | 后端场景建议   |
| qs-i-database | ⏳ 按需 | Database standards for schema design, query optimization, and transaction handling     | 数据库场景建议 |
| qs-i-ops      | ⏳ 按需 | DevOps standards for CI/CD pipelines, deployment strategies, and monitoring            | 运维场景建议   |

### Manual（手动引用）

| 规则名               | 状态    | 引用方式              | 用途                 |
| -------------------- | ------- | --------------------- | -------------------- |
| qs-m-code-review     | ⏳ 按需 | @qs-m-code-review     | Code Review 检查清单 |
| qs-m-design-review   | ⏳ 按需 | @qs-m-design-review   | 设计评审检查清单     |
| qs-m-troubleshooting | ⏳ 按需 | @qs-m-troubleshooting | 故障排查指南         |
