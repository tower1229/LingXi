# Quality Standards Index（质量准则索引）

> 本文件记录所有已创建的质量准则规则及其溯源。
> 由 `/flow 采纳质量准则` 命令更新。

---

## 规则统计

| 类型 | 数量 | 上下文占用 |
|------|------|------------|
| Always | 1 | ~30 行（每次对话） |
| File-scoped | 0 | 按需加载 |
| Intelligent | 1 | 按需加载 |
| Manual | 0 | 显式引用 |
| **合计** | **2** | - |

---

## 已创建规则清单

| 规则 | 类型 | Scope | 准则数 | 最后更新 |
|------|------|-------|--------|----------|
| qs-always-general | always | general | 5 | 2026-01-13 |
| qs-i-workflow | i | workflow | 1 | 2025-01-14 |

---

## 准则溯源

| 准则描述 | 规则文件 | 来源 | 采纳日期 |
|----------|----------|------|----------|
| 保持简洁拒绝过度设计 | qs-always-general | 迁移自 development-specifications | 2026-01-13 |
| 类型安全避免 any | qs-always-general | 迁移自 development-specifications | 2026-01-13 |
| Fail Fast 尽早报错 | qs-always-general | 迁移自 development-specifications | 2026-01-13 |
| 完整实现禁止占位 | qs-always-general | 迁移自 development-specifications | 2026-01-13 |
| 复用优先全局搜索 | qs-always-general | 迁移自 development-specifications | 2026-01-13 |
| 设计 workflow 功能时优先使用自然语言描述而非硬编码规则匹配 | qs-i-workflow | 经验 ai-native-design | 2025-01-14 |

---

## 变更记录

| 日期 | 操作 | 规则 | 内容 |
|------|------|------|------|
| 2026-01-13 | 初始化 | - | 从现有 rules 迁移，建立新的 qs-* 规则体系 |
| 2026-01-13 | 架构调整 | - | workflow 工具规则迁移到 AGENTS.md（根目录和嵌套），rules 目录仅用于项目级质量准则 |
| 2026-01-XX | 架构调整 | - | 移除 AGENTS.md，workflow 工具约束已在 Skills/Commands 中实现，rules 目录仅用于项目级质量准则 |
| 2026-01-13 | 简化初始规则 | - | 移除 security 相关规则，workflow 只默认提供 qs-always-general 作为最基本的初始规则 |
| 2025-01-14 | 创建 | qs-i-workflow | AI Native 设计原则：优先使用自然语言描述而非硬编码规则（仅用于本项目开发，不安装到用户项目） |
| 2025-01-14 | 流程重构 | - | 统一质量标准沉淀机制：放弃"经验"与"质量标准"的概念区分，用户在沉淀时自主选择存储目标（经验库或规则库），AI 推荐规则应用方式，降低自动化判断的不可靠性 |
