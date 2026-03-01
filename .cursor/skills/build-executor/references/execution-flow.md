# Build Executor — 完整执行流程

本文档为 build-executor 的详细步骤、模式差异、测试规范与注意事项；SKILL.md 仅保留意图与关键约束。

## 1. 模式检测（自动）

- **taskId**：指定则用该编号；省略则取 `.cursor/.lingxi/tasks/` 下 `*.req.*.md` 最大编号。
- **检测 plan**：查找 `<taskId>.plan.*.md`。存在 → Plan-driven；不存在 → Req-driven。

## 2. 执行逻辑（统一流程）

### 2.1 读取输入

- 必读：`<taskId>.req.<标题>.md`
- Plan-driven：另读 plan、testcase。
- Req-driven：若有 testcase 则读；若无则调用 testcase-designer 生成并写入后再继续。

### 2.2 任务与单元顺序、测试框架

- Plan-driven：任务与顺序来自 plan；测试框架沿用 plan 阶段结果。
- Req-driven：Agent 基于 req 拆解子任务（≥3 或明显依赖时用结构化任务列表并标注依赖）；检测测试框架，无则可选安装 vitest（同 plan 阶段）。

### 2.3 先测再实现（TDD）

仅用于验证方式为 `unit` 或 `integration` 的可测单元。四步：1）仅编写该单元测试（基于 testcase/req 输入/输出/边界）；2）运行测试，确认失败或基线；3）只通过修改实现使测试通过，不改测试；4）通过后再进入下一单元。不为尚不存在的功能写 mock。e2e 需求在 2.6 或 review 阶段用 Browser 验证；manual/rubric 产出可执行清单与证据占位。

### 2.4 按单元循环：代码实现与测试

对每个 unit/integration 单元：A 仅编写该单元测试；B 运行确认失败/基线；C 实现该单元不改测试；D 运行，失败则只改实现直到通过。先探索再修改：不熟悉模块先语义搜索或读关键文件再实现。manual/rubric：产出可执行清单（步骤+预期结果；rubric 含评分维度）与证据占位，交付前完成并保留证据。

### 2.5 文档同步

Plan-driven：按 plan 文档同步清单更新相关文档。Req-driven：Agent 识别受影响文档（docs/、design/、architecture/ 等）并更新。

### 2.6 快速 E2E 冒烟（可选）

对 e2e 需求：语义判断是否涉及前端交互/关键流程；满足则环境准备（检测/启动 dev 服务器）、选 1–2 个关键用例、Browser 执行；通过静默，失败输出详情并标记 High。浏览器不可用或服务器无法启动则降级静默或输出建议。

## 3. 降级方案

测试框架无法执行 → 输出手动测试清单（基于 testcase 或 req）。文档同步无法执行 → 输出文档更新清单。

## 4. 模式选择建议

复杂任务/需明确测试策略/需文档同步计划/生产功能 → Plan-driven。简单任务/快速原型 → Req-driven。

## 5. 执行质量保证

功能完整性、验收标准、代码规范（记忆+sessionStart+memory-retrieve）、测试覆盖、文档一致性。

## 5.5 下一步建议（有产物时必须输出）

只要产生代码或测试变更，必须在当轮回复末尾输出「**下一步可尝试（选一项）**」+ 四项 A/B/C/D。允许集合：`/review <taskId>`、`/remember` 沉淀、先改代码再 review、其他/跳过。自检通过且冒烟通过 → A = `/review`；冒烟失败 → A = 修复后继续 build；自检不通过 → A = 先改代码再 review。

## 6. 测试执行规范

- **时机**：任务开始前运行现有测试；编写完当前单元测试后运行该单元测试；每完成一实现任务后运行相关测试；进入 review 前运行全部测试。
- **编写规范**：先测再实现、隔离测试（Mock 外部依赖）、一行为一测试、AAA、只测 plan/testcase/req 中定义的行为。
- **结果**：通过静默；失败输出详情并循环修复直到通过。

记忆写入通过显式调用 lingxi-memory；本 Skill 不包含写入逻辑。

---

## 使用场景

- **Plan-driven**：`/build 001`（存在 plan）→ 读 req+plan+testcase → 按 plan 任务与顺序 → TDD 循环 → 文档同步（plan 清单）→ E2E 冒烟可选。
- **Req-driven**：`/build 001`（无 plan）→ 读 req → Agent 拆解任务 + 测试框架检测 → TDD 循环 → 文档同步（Agent 识别）→ E2E 冒烟可选。

---

## 注意事项

1. 记忆写入仅通过显式调用 lingxi-memory。
2. 测试循环：必须直到当前单元全部通过才进入下一单元。
3. 模式由是否存在 plan 文件自动选择。
4. 文档同步确保代码与文档一致。

---

## 与 Commands 的协作

由 `/build` 命令自动激活（taskId 可选）；Commands 只负责参数解析和产物说明。
