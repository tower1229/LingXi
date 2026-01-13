---
name: context-engineering
description: 此 Skill 提供最小高信号上下文原则（分层、指针优先、避免上下文膨胀）。当任意阶段（req/audit/plan/work/review/compound）需要补充/组织上下文时激活，指导如何组织信息。
---

# Context Engineering

## Instructions

- **先指针后细节**：先给入口文件/关键函数/配置入口路径，再读细节
- **最小高信号**：避免复制大段代码/文档；输出结论时附"如何验证"
- **分层加载**：先索引与概要，按需加载细节，避免 context rot
