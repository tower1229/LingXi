# Vet Checklist

## Scope Selection

- 简单功能：只审 D1 + D2
- 前端中等：审 D1-D4
- 前端复杂：审 D1-D5
- 后端/全栈中等及以上：审 D1-D5
- 文档为主或库/SDK 标签：在 D4 追加对应分支检查

## D1 需求完整性

- 目标是否清晰且不空泛
- scope 是否有边界，是否需要拆分
- 非简单任务是否有非目标和用户故事
- goal / problem / scope 是否互相一致

## D2 可验证性

- success criteria 是否覆盖 goals
- acceptance criteria 是否可二值判定
- scope 与 acceptance checklist 是否明显脱节
- verification method 是否与需求性质匹配

## D3 方案合理性

- solution overview 是否解释了方向而不是重复 goal/problem
- 非简单任务的方案是否足够支撑实现
- 是否存在明显缺失的 framing 导致后续实现高风险

## D4 规范完整性

- 功能需求是否都有 verification / edge cases / evidence
- 前端：是否写了 loading / empty / error / state 类场景
- 后端：是否写了接口、schema、contract、request/response 边界
- 文档为主：是否写了读者/受众与交付对象
- 库/SDK：是否写了 public surface / contract / compatibility 预期

## D5 风险识别

- 约束和风险是否足够显式
- 集成类任务是否写了依赖、兼容、回滚或行为边界
- 非简单任务是否只有一条功能需求，导致粒度过粗

## Output Expectations

- 审查范围：类型、复杂度、标签、维度
- 总结：blocking/high/warning 数量和 readiness
- 仅输出有问题的维度
- 改进优先级必须可直接转成下一步动作
