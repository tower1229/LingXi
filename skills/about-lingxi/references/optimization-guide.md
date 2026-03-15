# 灵犀调优指南 (Optimization Guide)

本文档将 `optimization-checklist.md` 中的检查项按**四层架构**组织为调优视角：调度层、执行层、记忆层、守护层各自关注点与常见调优动作。做效果或性能调优时，可先定位层级再对照本指南与价值对齐、工程实践准则。

> **轻量速查**：仅需勾选式清单时，可继续使用 `optimization-checklist.md`；其内容已与本指南对齐。

---

## 一、按层级调优

### 调度层

- **双轨决策**：确认 task/vet/plan/review 走 Fast-Path、仅 build 走 Strict OS；若发现简单请求被委派或复杂请求未委派，检查 `agentos-kernel.mdc` 与 `lifecycle-flow.md` 中的决策树。
- **后处理队列**：确认每轮子代理返回后必先同步状态再消费 `[POST-PROCESSING QUEUE]`；若有遗漏义务，检查 HOT_RAM 模板与 Law 3。
- **静默与高信号**：输出是否符合 `workflow-output-principles.md`；是否减少过程旁白与冗余确认。

### 执行层

- **主从解耦**：主 Agent 是否只做派发与后处理，不直接写代码或重度 I/O；Subagent 是否返回规范 `<Execution_Summary>`。
- **Megaprompt 与契约**：是否按 `ipc-protocols.md` 四层组装；Payload 与下一跳是否清晰。
- **工具与边界**：是否合理使用 Cursor 内置工具，避免重复造轮或越界假设；官方能力边界见 Cursor 文档。

### 记忆层

- **情节与语义分离**：HOT_RAM/TRACE 与会话内状态、USER/memory/INDEX 与长期资产是否分离清晰；提炼路径是否只经 memory-write 写入。
- **检索与注入**：Pre/Post 检索是否在正确时机、是否造成多余 token；INDEX 与实体文件是否 SSoT。
- **WAL 消费**：主 Agent 后处理是否消费未勾选任务（如 SESSION_DISTILL）；勾选是否仅在完成路径后执行。

### 守护层

- **心跳与插件**：入队与消费是否分离、是否只写 WAL 与 control；watchdog 型任务是否仅在成功时勾选。新增应用是否只通过 `heartbeat-plugins/` 注册，未改 heartbeat-check 主循环。
- **并发与顺序**：每轮是否至多处理一条 watchdog 任务；30min 完成路径是否由主 Agent 调用 distill-done 并勾选。
- **契约**：WAL 格式与解析是否以 wal-schema、wal-utils 为准；插件 id 与 TYPE 是否一致。

---

## 二、价值与工程检查

调优时与价值对齐、工程实践准则配合：

- **价值对齐**：心有灵犀（沉淀与复用）、AI Native（信任模型、短说明、门控于人）、称心如意（认知负担、静默成功）。
- **工程实践**：SSoT、SoC、DRY、KISS、YAGNI、Fail Fast、显式优于隐式等见 `engineering-practices.md`；具体实现约定见 `architecture.md` 守护层。

---

## 三、调优输出建议

- **通过项**：已满足的检查项
- **需要调整项**：如何调整（参考 core-values、design-principles、engineering-practices）
- **技术边界问题**：超出能力边界时的替代方案
- **权衡分析**：按项目阶段做取舍（如简单性 vs 完整性、性能 vs 可维护性）

完整输出结构（含工程实践问题、风险评估等）见 `optimization-checklist.md`「调优建议输出」。

---

## 关联导航

- **上游**：`architecture.md`、`lifecycle-flow.md`、`core-values.md`、`design-principles.md`
- **下游**：`engineering-practices.md`、`ipc-protocols.md`、`core-values.md`、`design-principles.md`
- **同层**：`optimization-checklist.md`（轻量速查清单）
