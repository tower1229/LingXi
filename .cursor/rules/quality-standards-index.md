# Quality Standards Index（质量准则索引）

> 本文件记录所有已创建的质量准则规则及其溯源。
> 由 `/flow 采纳质量准则` 命令更新。

---

## 规则统计

| 类型 | 数量 | 上下文占用 |
|------|------|------------|
| Always | 3 | ~90 行（每次对话） |
| File-scoped | 1 | 按需加载 |
| Intelligent | 1 | 按需加载 |
| Manual | 0 | 显式引用 |
| **合计** | **5** | - |

---

## 已创建规则清单

| 规则 | 类型 | Scope | 准则数 | 最后更新 |
|------|------|-------|--------|----------|
| qs-always-workflow | always | workflow | 3 | 2026-01-13 |
| qs-always-security | always | security | 3 | 2026-01-13 |
| qs-always-general | always | general | 5 | 2026-01-13 |
| qs-fs-workflow-artifacts | fs | workflow | 3 | 2026-01-13 |
| qs-i-security | i | security | 2 | 2026-01-13 |

---

## 准则溯源

| 准则描述 | 规则文件 | 来源 | 采纳日期 |
|----------|----------|------|----------|
| 单入口 /flow 驱动工作流 | qs-always-workflow | 迁移自 workflow-core | 2026-01-13 |
| 人工闸门禁止静默推进 | qs-always-workflow | 迁移自 workflow-core | 2026-01-13 |
| 确认沉淀才能写入 experience | qs-always-workflow | 迁移自 workflow-core | 2026-01-13 |
| 禁止硬编码密钥 | qs-always-security | 迁移自 safety-guardrails | 2026-01-13 |
| 用户输入必须校验 | qs-always-security | 迁移自 safety-guardrails | 2026-01-13 |
| 外部调用设置超时 | qs-always-security | 迁移自 safety-guardrails | 2026-01-13 |
| 保持简洁拒绝过度设计 | qs-always-general | 迁移自 development-specifications | 2026-01-13 |
| 类型安全避免 any | qs-always-general | 迁移自 development-specifications | 2026-01-13 |
| Fail Fast 尽早报错 | qs-always-general | 迁移自 development-specifications | 2026-01-13 |
| 完整实现禁止占位 | qs-always-general | 迁移自 development-specifications | 2026-01-13 |
| 复用优先全局搜索 | qs-always-general | 迁移自 development-specifications | 2026-01-13 |
| INDEX.md 是单一事实源 | qs-fs-workflow-artifacts | 迁移自 ai-artifacts | 2026-01-13 |
| 高信号写作边界+指针 | qs-fs-workflow-artifacts | 迁移自 ai-artifacts | 2026-01-13 |
| session 临时 experience 长期 | qs-fs-workflow-artifacts | 迁移自 ai-artifacts | 2026-01-13 |
| 危险命令需要确认 | qs-i-security | 迁移自 safety-guardrails | 2026-01-13 |
| 使用 yarn 作为包管理器 | qs-i-security | 迁移自 safety-guardrails | 2026-01-13 |

---

## 变更记录

| 日期 | 操作 | 规则 | 内容 |
|------|------|------|------|
| 2026-01-13 | 初始化 | - | 从现有 rules 迁移，建立新的 qs-* 规则体系 |
