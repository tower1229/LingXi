# AI Native：依赖大模型自然语言理解能力

## Meta

- **Id**: MEM-ai-native-design
- **Kind**: principle
- **Status**: active
- **Strength**: validated
- **Scope**: broad

## When to load

- 你在设计 workflow / command / skill / rule，需要处理用户自然语言输入时
- 你想引入关键词/正则/复杂分支去“识别意图”或“辅助理解”时

## One-liner (for injection)

优先用自然语言描述期望行为，让模型基于上下文判断；避免硬编码规则去限制模型的语义理解能力。

## Context / Decision

- **Decision**: 设计中是依赖硬编码规则匹配，还是依赖大模型的自然语言理解能力
- **Signals**:
  - 出现关键词列表、正则表达式、复杂 if-else 的“意图识别”逻辑
  - 需要维护一套永远覆盖不全的模式列表
- **Alternatives**:
  - 关键词/正则匹配把输入硬分流
  - 枚举所有可能输入并分别处理
- **Counter-signals**:
  - 需要强安全门控/合规审计时，可用 Hooks 做阻断与审计（不是用规则去替代模型理解）

## Pointers

- `.cursor/rules/memory-injection.mdc`（每轮检索注入的强保证触发器：规则只做触发，不做语义匹配）
- `scripts/validate-memory-index.js`（索引一致性校验与自动更新）

