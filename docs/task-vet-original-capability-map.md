# Task/Vet 原版能力对照

## 目的

这份文档不按“场景枚举”拆原版能力，而按横向能力轴对照原版与当前 2.0。

目标是回答三个问题：

- 原版 `task` 和 `vet` 真正强在哪里
- 当前 2.0 已经继承了哪些能力
- 下一步应该优先补哪些“能力缺口”，而不是机械回放旧模板

---

## 总判断

原版的核心价值不是“模板多”，而是：

1. `task` 能把模糊需求提纯成工程师可直接开工的任务文档。
2. `task` 不只整理需求，还会把偏弱方案放大到更稳的最佳实践方向。
3. `vet` 不是 checklist lint，而是帮助人类质疑 `task` 产出的审查助手。

对应原版依据见：

- [.cursor/skills/task/SKILL.md](/mnt/c/Workspace/tower1229/LingXi/.cursor/skills/task/SKILL.md)
- [.cursor/skills/vet/SKILL.md](/mnt/c/Workspace/tower1229/LingXi/.cursor/skills/vet/SKILL.md)
- [.cursor/skills/task/references/task-doc-template-full.md](/mnt/c/Workspace/tower1229/LingXi/.cursor/skills/task/references/task-doc-template-full.md)
- [.cursor/skills/task/references/task-doc-template-simple.md](/mnt/c/Workspace/tower1229/LingXi/.cursor/skills/task/references/task-doc-template-simple.md)

---

## Task 能力轴

### 1. 需求提纯能力

原版表现：

- 明确要求先做项目上下文分析，再做需求提纯。
- 对模糊需求按 5W1H 澄清。
- 通过一次性澄清把目标、边界、成功标准收敛出来。

当前 2.0 状态：`已部分继承`

- 已有 project context 探测、fail-fast、goal/scope/constraints/acceptance 收紧。
- 但“系统性 5W1H 提纯”还没有真正成为独立能力层。
- 当前更多是 deterministic fail-fast，而不是完整的提纯式理解。

下一步重点：

- 不增加更多僵硬必填项。
- 增强 `TaskSpec` 生成前的“提纯层”，让模糊需求先被整理成：
  - 为什么做
  - 给谁做
  - 真正边界是什么
  - 成功意味着什么

### 2. 方案放大能力

原版表现：

- 明确写了“需求提纯与放大 + 核心技术方案”。
- 对复杂/不确定场景会主动做调研、方案对比、典型坑点识别。
- 模板中的“解决方案概述”要求体现：
  - 为什么选这个方向
  - 技术选型
  - 架构思路
  - 关键技术点

当前 2.0 状态：`已起步，但仍偏弱`

- 已能对 docs/sdk/frontend/backend 场景做一定程度的默认增强。
- 已能把较弱方案往 contract、状态、交付面方向拉。
- 但还没有稳定达到“核心技术方案”那种信息密度。
- 当前更多是“避免太差”，还不是“把方案放大成明显更优”。

下一步重点：

- 增强 `solution_overview` 和 `functional_requirements[].implementation_scheme` 的质量。
- 引入“为什么这个方向更稳”的说明，而不只是“做什么”。
- 对复杂任务补更强的最佳实践提示：
  - 前端：状态、交互、响应式、信息反馈
  - 后端：contract、依赖边界、验证、回滚
  - 文档：读者路径、交付面、信息架构
  - SDK：public surface、compatibility、migration

### 3. 开发指导能力

原版表现：

- 原版 full template 明确要求 task 文档既写需求，也写开发指导。
- 功能需求表中的“实现方案”列要求提供：
  - 关键文件指针
  - 推荐实现模式
  - 简洁实现方向
- 还提供类型化指导章节：
  - UI 交互规范
  - API 规范
  - 数据模型
  - 依赖与集成
  - 技术可行性

当前 2.0 状态：`能力存在，但信息密度不足`

- 当前文档已经能指导开发，不再只是 vague summary。
- 但“指导开发”的深度仍主要集中在 F 行级别。
- 缺少原版那种更明确的类型化指导层。

下一步重点：

- 不直接恢复“全量旧模板”。
- 改为补一种按信号触发的 guidance layer：
  - 前端任务：UI/交互/状态指导块
  - 后端任务：API/contract/集成指导块
  - 中高复杂度后端：数据模型/风险/可行性指导块
  - docs/sdk：交付与对外接口指导块

### 4. Fail-Fast 与信息汇总能力

原版表现：

- 在写 task 前先做信息汇总与 fail-fast。
- 重要缺失项要求一次性列出并澄清。

当前 2.0 状态：`已明显继承`

- 这一层目前是 2.0 的强项之一。
- schema validator、contract tests、repair-loop、structured errors 都已比原版更清晰。

下一步重点：

- 保持这部分稳定，不要再无节制加规则。
- 后续重点应转向“提纯质量”和“方案增强质量”，而不是继续堆 rejection 条件。

### 5. 类型适配能力

原版表现：

- 原版不是简单按场景套模板，而是按类型和复杂度决定：
  - 模板
  - 应有章节
  - 应有审题重点

当前 2.0 状态：`已具备雏形`

- 当前已有：
  - task type / complexity 推断
  - docs/sdk tags
  - frontend/backend/docs 场景默认增强
- 但还没有形成更完整的“类型驱动 guidance”能力。

下一步重点：

- 类型信号只用来调整重点，不要变成硬编码模板分支。
- 目标是“动态强调”，不是“恢复旧版章节清单”。

---

## Vet 能力轴

### 1. 多维质疑能力

原版表现：

- 原版 `vet` 非常强调维度矩阵。
- 不同类型/复杂度下审查维度不同。
- D1–D5 不是形式化展示，而是人类审查视角：
  - 需求完整性
  - 可验证性
  - 方案合理性
  - 规范完整性
  - 风险识别

当前 2.0 状态：`已较好继承`

- 当前已经有 review dimensions、dimension summaries、readiness、priority buckets。
- 也能按类型补 docs/sdk/frontend/backend 的针对性质疑。

下一步重点：

- 保持维度结构稳定。
- 更加强化 D3/D4/D5 的“高质量质疑”，而不只是字段完整性检查。

### 2. 对方案本身提出质疑

原版表现：

- 原版 D3 明确审“技术选型是否合理、架构思路是否清晰、选型理由是否充分”。
- 这说明原版 vet 审的不是字段齐没齐，而是方案质量本身。

当前 2.0 状态：`部分继承，但仍偏保守`

- 现在已经会抓：
  - solution too thin
  - solution repeats problem
  - sdk/docs/frontend/backend 的专项问题
- 但“方案为什么不够稳、应该往哪种更优方向走”还不够强。

下一步重点：

- 增强 D3 findings 的解释力。
- 让 `revision_targets` 更像“方案修订包”，不是平铺直叙提醒。

### 3. 对 task 是否足以指导开发提出质疑

原版表现：

- 原版 vet 的 D4/D5 本质是在问：
  - 这份 task 能不能真的拿去做
  - 规范是否足够完整
  - 风险是否已暴露

当前 2.0 状态：`已起步`

- 当前已经会抓 requirement completeness、acceptance coverage、frontend runtime constraints、risk framing 等。
- 但还没有非常直接地表达：
  - “这份文档是否足以指导开发”
  - “缺的不是字段，而是工程执行所需的指导信息”

下一步重点：

- 增加更强的“guidance sufficiency”类 findings。
- 例如：
  - 前端缺少交互/状态说明导致无法稳妥开工
  - 后端缺少 contract / integration / rollback 信息导致实现风险不透明

### 4. 改进建议与优先级表达

原版表现：

- 原版输出明确要求：
  - 总体评价
  - 实施准备度
  - 详细问题清单
  - 改进优先级

当前 2.0 状态：`结构已到位，表达仍可加强`

- 已有：
  - readiness
  - improvement_priority
  - revision_targets
  - next_step_options
- 但 revision package 的聚合度还不够高。

下一步重点：

- 把多个相近 findings 聚成更强的修订主题。
- 让 `recommended_next_action` 和 `revision_targets` 更像人类 reviewer 的“优先修这三件事”。

---

## 当前不建议做的事

- 不建议按前端/后端/SDK/文档穷举出大量固定模板分支。
- 不建议为了贴近原版而直接恢复 full template 的所有章节。
- 不建议继续优先扩大 schema 字段或外围安装/分发改动。

这些做法会把系统推向“模板回放器”，而不是“有判断力的 task/vet”。

---

## 下一阶段建议

### 优先级 1：增强 `task` 的 guidance layer

目标：

- 让 task 文档更接近原版“需求 + 方案 + 开发指导”三合一质量。

具体方向：

- 为不同类型/复杂度补动态 guidance blocks
- 强化 solution 放大能力
- 提升 implementation_scheme 的工程含量

### 优先级 2：增强 `vet` 的方案质疑与修订包表达

目标：

- 让 vet 更像人类审查助手，而不是字段检查器。

具体方向：

- 增强 D3/D4/D5 的高质量质疑
- 聚合 revision targets
- 更直接判断 task 是否足以指导开发

### 优先级 3：用少量 golden samples 做能力校准

目标：

- 不是穷举场景，而是用少量高代表样例校准关键能力。

建议样例：

- 一个前端复杂任务
- 一个后端中高复杂任务
- 一个 docs 任务
- 一个 SDK 任务

这些样例只用于验证能力，不用于驱动硬编码模板。

---

## 结论

如果按原版能力来衡量，当前 2.0 最主要的短板已经不是结构层，而是：

1. `task` 还需要更强的“方案放大 + 开发指导”能力。
2. `vet` 还需要更强的“方案质疑 + 修订聚合”能力。

这两件事补好之后，2.0 的 `task/vet` 才会真正达到“原版精神被继承，但没有退化成僵硬模板系统”的状态。
