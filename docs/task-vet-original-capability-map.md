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

当前 2.0 状态：`已实现第一版提纯层`

- 已有 project context 探测、fail-fast、goal/scope/constraints/acceptance 收紧。
- 已在 `TaskSpec` 生成前显式收敛：
  - 为什么做
  - 给谁做
  - 真正边界是什么
  - 成功意味着什么
- 当前仍更偏 deterministic refinement，而不是开放式调研型提纯。

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

当前 2.0 状态：`已起步并有明确增强`

- 已能对 docs/sdk/frontend/backend 场景做一定程度的默认增强。
- 已能把较弱方案往 contract、状态、交付面方向拉。
- 现在 `solution_overview` 已明确要求给出“为什么这个方向更稳”的理由。
- 但复杂任务上的技术选型深度仍然不如原版最强形态。

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

当前 2.0 状态：`第一版动态 guidance layer 已落地`

- 当前文档已经能指导开发，不再只是 vague summary。
- 已新增 `guidance_blocks[]`，并在 markdown 中编译为 `开发指导` 区块。
- 已支持：
  - 前端实现指导
  - 契约与边界指导
  - 集成与回滚指导
  - 文档交付指导
  - SDK / Surface 指导
  - 风险与收口指导
- 当前短板不在“有没有 guidance”，而在复杂任务上的信息密度还能继续提升。

下一步重点：

- 继续增强 guidance block 的工程密度，而不是增加更多 kind。
- 重点提高：
  - 复杂前端任务的交互/状态覆盖质量
  - 复杂后端任务的 contract / rollback / dependency 顺序表达
  - docs/sdk 任务的对外交付与兼容说明强度

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

当前 2.0 状态：`已增强到会主动质疑方案理由`

- 现在已经会抓：
  - solution too thin
  - solution repeats problem
  - sdk/docs/frontend/backend 的专项问题
- 现在已经会抓 `solution_rationale_thin`，会直接指出“方向说了，但为什么这样更稳还没说明”。
- `revision_targets` 也开始按修订主题聚合，而不是只平铺单条提醒。

下一步重点：

- 增强 D3 findings 的解释力。
- 让 `revision_targets` 更像“方案修订包”，不是平铺直叙提醒。

### 3. 对 task 是否足以指导开发提出质疑

原版表现：

- 原版 vet 的 D4/D5 本质是在问：
  - 这份 task 能不能真的拿去做
  - 规范是否足够完整
  - 风险是否已暴露

当前 2.0 状态：`已进入 guidance sufficiency 审查`

- 当前已经会抓 requirement completeness、acceptance coverage、frontend runtime constraints、risk framing，以及 guidance sufficiency / guidance missing 这类问题。
- 已能直接指出：
  - 哪类 guidance 缺失
  - 为什么这会阻碍工程师安全开工

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

当前 2.0 状态：`结构已到位，聚合表达已落地第一版`

- 已有：
  - readiness
  - improvement_priority
  - revision_targets
  - next_step_options
- `revision_targets` 已按修订主题聚合第一版。
- `recommended_next_action` 已会优先提示前 2-3 件最值得先修的事情。

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

### 优先级 1：继续增强 `task` guidance 的信息密度

目标：

- 让 task 文档更接近原版“需求 + 方案 + 开发指导”三合一质量。

具体方向：

- 在现有 dynamic guidance blocks 上继续增强信息密度
- 强化 solution 放大能力
- 提升 implementation_scheme 的工程含量

### 优先级 2：继续增强 `vet` 的方案质疑与修订聚合能力

目标：

- 让 vet 更像人类审查助手，而不是字段检查器。

具体方向：

- 继续增强 D3/D4/D5 的高质量质疑
- 继续优化 revision targets 的聚合质量
- 继续降低 guidance sufficiency 类 findings 的误报

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

如果按原版能力来衡量，当前 2.0 的主要工作重心已经从“结构缺失”转成“内容密度提升”：

1. `task` 还需要继续增强“方案放大 + 开发指导”的内容强度。
2. `vet` 还需要继续增强“方案质疑 + 修订聚合”的判断质量。

这两件事补好之后，2.0 的 `task/vet` 才会真正达到“原版精神被继承，但没有退化成僵硬模板系统”的状态。
