# 静默成功：没有消息就是好消息

## Meta

- **Id**: MEM-silent-success
- **Kind**: principle
- **Status**: active
- **Strength**: validated
- **Scope**: broad

## When to load

- 你准备输出“成功确认/无匹配提示/过程汇报”这类非决策信息时
- 你在设计任何自动流程（检索、治理、校验、写入），需要控制噪声与 token 时

## One-liner (for injection)

成功/无匹配/无问题时保持静默；只在需要用户做判断或存在阻塞/风险时输出高信号信息。

## Context / Decision

- **Decision**: 什么时候该输出、什么时候该静默
- **Signals**:
  - 输出内容不影响用户下一步决策
  - 输出只是“执行过程自言自语”或重复摘要
- **Counter-signals**（必须保留输出的情况）:
  - 用户决策权相关：候选列表、确认/选择菜单、审查报告
  - 失败/阻塞/高风险：必须清晰解释原因与解决方案

## Pointers

- `.cursor/commands/*.md`（各阶段 command 的“静默成功”输出规则）

