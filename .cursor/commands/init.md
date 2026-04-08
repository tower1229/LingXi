---
name: init
description: 引导式理解现有项目并生成可选记忆候选（内含骨架预检，默认不写入）
args: []
---

# /init - 项目初始化

**用途**：面向**已有一定开发进度**的项目，在安装使用灵犀前先理解项目背景，生成可选记忆候选清单，帮助后续迭代开发提升质量；默认不写入，需用户明确选择后才写入。

---

**用法**：`/init`（无参数）。优先从现有文档与仓库结构整理；仅对缺失或不确定项提问补齐。所有选择环节统一使用 ask-questions 协议；写入经 taste-recognition + lingxi-memory-write 完成。

**关键约定**：

- 写入门控不可侵犯：仅当用户明确选择写入时才写盘
- 交互统一：所有选择均通过 ask-questions 协议
- 最小高信号：只展示用户决策所需信息，不输出过程旁白
- 骨架预检是内部实现步骤：用于兼容安装方式，不作为对外解释重点

**委托**：先执行 workspace-bootstrap 进行最小预检，再按 Step 1-7 执行；完整类型清单见下方 `init-checklists`。

---

## 附录：完整执行流程与 init-checklists

### Step 0) 最小预检与骨架初始化（内部步骤）

- 委托 `workspace-bootstrap` 检测并补齐 `.lingxi/` 必需骨架。
- 该步骤仅为兼容安装方式的内部实现；对用户不作为主信息展开。

### Step 1) 静默理解项目（Must 优先）

在提问前先静默整理 `common Must` 五项草稿（每项为结论或“未找到”）：

1. 项目目标与非目标（goal + non-goals）
2. 核心用户/角色与关键诉求（users）
3. 关键链路及失败兜底（flows）
4. 风险优先级与不可接受失败（risks）
5. 环境/发布/回滚方式（releaseEnv）

同时做项目类型推断（A-H，可多选）用于内部补充清单与草稿，但**不向用户展示类型结果**。

推断规则：

- 仅读取足够信号（如 `README`、`package.json`、`pyproject.toml`、根目录与少量关键配置）
- 不扫全仓，不做重型分析
- 低置信度时自动降级为 `common-only`，避免误推断带偏流程

### Step 2) 展示校对摘要（先确认，再追问）

将已整理信息按 4 块输出供确认：

- 项目结构信息
- 技术栈信息
- 开发规范信息
- 业务/模块信息（如适用）

若 Must 五项都已充分，直接进入候选生成；仅在“缺失或明显不确定”时再进入补齐问询。

### Step 3) 缺失项补齐（ask-questions-first）

所有用户选择统一通过 ask-questions 协议执行（参见 `.cursor/skills/ask-questions/SKILL.md`）：

- 先问 `next_action`：`confirm` / `supplement` / `deep_dive`
- `supplement`：仅列出当前缺失的 Must 项，多选后逐项收集（每次只问一项，1-3 行）
- `deep_dive`：在 Must 完整后，按当前类型列出 Should 项多选补齐；Optional 默认不主动追问

统一异常处理：

- 无效选择或空选择：只重试当前问题，不回放整段流程
- 若 UI 不可用：使用 ask-questions 文本兜底模板，并将用户输入归一化为 `selected_option_ids`

### Step 4) 生成记忆候选清单（不写入）

生成 `0-6` 条高信号草稿候选，并按类型补 `0-2` 条特化候选（少而准）。不为凑数而生成低价值候选；若暂无法提炼高置信候选，可返回 0 条并说明原因：

- **优先覆盖的候选主题（可提炼时）**：
  - `project_goals_and_nongoals`
  - `domain_glossary_and_core_entities`
  - `architecture_overview`
- **建议补齐的候选主题（按需）**：
  - `critical_user_flows`
  - `local_dev_mental_model`
  - `release_and_environment_contract`

输出一个连续编号的候选清单（标题 + 简述），便于用户选择是否写入。

### Step 5) 写入门控（默认跳过）

候选生成后，单独提问 `write_strategy`：

- `skip`：不写入
- `all`：全部写入
- `partial`：多选指定候选后写入

`partial` 规则：

- 必须通过 ask-questions 多选返回有效 `option id`
- 无有效候选时仅重试当前多选问题
- UI 不可用时沿用统一文本兜底并归一化，不切换到另一套编号协议

### Step 6) 可选写入执行（仅 all / partial）

仅在用户明确选择写入时执行：

- 仅提交用户确认后的候选项，不做隐式扩写
- 交由记忆系统按既有协议完成写入（taste-recognition → lingxi-memory-write）
- 最终编号与命名由 lingxi-memory-write 统一治理

### Step 7) 初始化结果输出（最小高信号）

输出 3-6 行：

- 生成的候选概览
- 写入策略（skip / all / partial）
- 若写入：写入文件与 INDEX 更新结果

---

## 附录：init-checklists（SSoT）

> 用途：init 命令的单一事实源。按项目类型（A-H）提供"收集清单 → 候选主题"的映射，遵循渐进式披露（Must → Should → Optional）。
>
> 说明：`Draft targets` 仅表示候选主题标签，用于引导草稿覆盖面；不等同于最终记忆文件名。实际写入时由 lingxi-memory-write 统一治理并分配编号/命名。

## 类型枚举（A-H）

- **A) Web 应用**：SPA / SSR / 全栈 Web
- **B) 后端服务**：API / Worker / 微服务
- **C) 移动端**：iOS / Android / 跨端
- **D) 数据&ETL**：指标 / 报表 / 数仓 / 调度
- **E) 库&SDK**：对外/对内 SDK、组件库、框架封装
- **F) CLI 工具**：命令行、开发者工具
- **G) 基建&平台**：K8s / 网关 / IAM / IaC / 平台工程
- **H) AI 应用**：LLM/多模态/Agent/评测与护栏

> 允许多选：例如"全栈"通常 = A + B；"AI Web 应用"通常 = A + H。

---

## 通用骨架（所有类型必收）

### Must

- **common.goal**：一句话说明"这个项目解决什么问题"，并列出 1-3 条**非目标**（明确不做什么）。
  - **可抽取来源建议**：README（Why/What）、价值或原则类文档、task 的「目标与非目标」。
  - **Draft targets**：`MEM-project-goals-and-nongoals` (business)
- **common.users**：核心用户/角色是谁？每个角色最关键的 1 个诉求是什么？
  - **可抽取来源建议**：README 受众、架构/角色描述、命令或功能说明的受众。
  - **Draft targets**：`MEM-domain-glossary-and-core-entities` (business)
- **common.flows**：写出 1-3 条"关键链路"（按步骤），并注明每条链路的失败兜底。
  - **可抽取来源建议**：README 流程/命令表、架构文档、task/plan 中的关键步骤与兜底。
  - **Draft targets**：`MEM-critical-user-flows` (business)
- **common.risks**：风险优先级排序（安全/稳定性/成本/性能/合规），并说明"最不可接受的失败"。
  - **可抽取来源建议**：设计原则、评价准则、task 中的风险与约束。
  - **Draft targets**：`MEM-project-goals-and-nongoals` (business)
- **common.releaseEnv**：有哪些环境（dev/staging/prod）？发布方式与回滚方式是什么？
  - **可抽取来源建议**：README 安装/发布、架构中的部署与分发、task 中的环境与回滚。
  - **Draft targets**：`MEM-release-and-environment-contract` (tech)

### Should

- **common.glossary**：列出 10-20 个领域词汇（含同义词/禁用词），以及 3-8 个核心实体（实体间关系一句话即可）。
  - **Draft targets**：`MEM-domain-glossary-and-core-entities` (business)
- **common.arch**：用 5-10 行描述"请求/任务如何流经系统"（入口 → 边界 → 依赖 → 数据源）。
  - **Draft targets**：`MEM-architecture-overview` (tech)
- **common.localDev**：本地开发需要运行哪些进程/端口/代理/构建产物？
  - **Draft targets**：`MEM-local-dev-mental-model` (tech)

### Optional

- **common.constraints**：明确"硬约束/禁忌"（例如必须用某云、必须兼容某版本、不能引入某依赖）。
  - **Draft targets**：`MEM-architecture-overview` (tech)

---

## A) Web 应用（SPA/SSR/全栈）

### Must

- **web.rendering**：渲染模式是什么（SPA/SSR/SSG/混合）？是否需要 SEO/OG/分享卡片？
  - **Draft targets**：`MEM-web-routing-and-rendering-mode` (tech), `MEM-web-seo-og-strategy` (tech)
- **web.routes**：路由结构与页面地图（关键页面/受保护路由/重定向/404 策略）。
  - **Draft targets**：`MEM-web-routing-and-rendering-mode` (tech)
- **web.state**：状态与缓存策略（全局状态/请求缓存/失效规则/错误边界/重试）。
  - **Draft targets**：`MEM-web-local-dev-mental-model` (tech)

### Should

- **web.perfBudget**：性能预算（首屏/关键交互/包体）与性能监控点。
  - **Draft targets**：`MEM-web-local-dev-mental-model` (tech)
- **web.i18nTenancy**：是否需要 i18n / 多租户？隔离策略与边界是什么？
  - **Draft targets**：`MEM-domain-glossary-and-core-entities` (business)

---

## B) 后端服务（API/Worker/微服务）

### Must

- **svc.entrypoints**：入口与路由：公开 API 列表、鉴权点、错误码/错误模型。
  - **Draft targets**：`MEM-api-contract-and-versioning` (tech), `MEM-auth-and-permissions` (tech)
- **svc.timeoutRetry**：超时/重试边界：上游超时、下游超时、重试上限、熔断/降级策略。
  - **Draft targets**：`MEM-idempotency-retry-timeout-contract` (tech)
- **svc.idempotency**：哪些操作必须幂等？幂等键怎么定义？重试语义是什么？
  - **Draft targets**：`MEM-idempotency-retry-timeout-contract` (tech)
- **svc.dataModel**：核心数据模型与迁移策略（含回滚策略）。
  - **Draft targets**：`MEM-data-model-and-migrations` (tech)
- **svc.observability**：可观测性最小集合（日志字段、关键指标、告警阈值、排障路径）。
  - **Draft targets**：`MEM-observability-and-debug-playbook` (tech)

### Should

- **svc.asyncJobs**：是否存在异步任务/队列/定时任务？补偿/对账如何做？
  - **Draft targets**：`MEM-observability-and-debug-playbook` (tech)
- **svc.ratelimitQuota**：是否需要限流/配额/成本控制？触发阈值与降级路径是什么？
  - **Draft targets**：`MEM-idempotency-retry-timeout-contract` (tech)

---

## C) 移动端（iOS/Android/跨端）

### Must

- **mobile.matrix**：系统版本/机型/网络条件覆盖矩阵（最低版本 + 目标覆盖）。
  - **Draft targets**：`MEM-mobile-compatibility-matrix` (tech)
- **mobile.offlineWeakNet**：离线/弱网策略：哪些功能必须可用？数据同步/冲突策略是什么？
  - **Draft targets**：`MEM-mobile-offline-weak-network-policy` (tech)
- **mobile.permissionsPrivacy**：权限与隐私：权限申请时机、拒绝后的降级路径、合规要点。
  - **Draft targets**：`MEM-mobile-permissions-and-privacy` (tech)
- **mobile.release**：发布与 CI：签名/证书、灰度、回滚、商店审核注意点。
  - **Draft targets**：`MEM-mobile-release-ci-signing` (tech)

---

## D) 数据&ETL（指标/报表/数仓）

### Must

- **data.metricsSSoT**：指标口径（SSoT）：每个核心指标的定义、维度、过滤条件与示例。
  - **Draft targets**：`MEM-metrics-definition-ssot` (business)
- **data.latency**：时效要求（T+0/T+1/小时级）与可接受的延迟/缺失范围。
  - **Draft targets**：`MEM-etl-backfill-and-retry-policy` (tech)
- **data.pipeline**：数据链路：源 → 中间层 → 存储（湖/仓）→ 消费层；增量/全量策略。
  - **Draft targets**：`MEM-etl-backfill-and-retry-policy` (tech)
- **data.backfill**：回填/重跑/迟到数据策略与对下游影响控制。
  - **Draft targets**：`MEM-etl-backfill-and-retry-policy` (tech)

### Should

- **data.quality**：数据质量：校验规则、异常处理、告警与修复流程。
  - **Draft targets**：`MEM-observability-and-debug-playbook` (tech)

---

## E) 库&SDK

### Must

- **sdk.users**：目标用户与最小示例（Hello World）是什么？
  - **Draft targets**：`MEM-sdk-examples-and-doc-structure` (reference)
- **sdk.apiErrorModel**：核心 API 形态（sync/async）、错误模型、扩展点与边界。
  - **Draft targets**：`MEM-sdk-api-design-and-error-model` (tech)
- **sdk.compat**：兼容范围（平台/语言版本/运行时/依赖边界）。
  - **Draft targets**：`MEM-sdk-compatibility-support-policy` (tech)
- **sdk.versioning**：版本策略（SemVer）、breaking 变更流程、迁移指南要求。
  - **Draft targets**：`MEM-sdk-versioning-and-migration-policy` (tech)
- **sdk.tests**：测试矩阵与发布门槛（兼容性回归如何执行）。
  - **Draft targets**：`MEM-sdk-test-matrix` (tech)

---

## F) CLI 工具

### Must

- **cli.commands**：命令面（子命令/参数/默认值/示例）。
  - **Draft targets**：`MEM-cli-command-surface-and-defaults` (tech)
- **cli.output**：输出契约：静默成功、错误码、stdout/stderr 分离、可解析输出（json/text）。
  - **Draft targets**：`MEM-cli-output-contract-and-exit-codes` (tech)
- **cli.config**：配置约定：配置文件位置与优先级、环境变量覆盖规则。
  - **Draft targets**：`MEM-cli-config-precedence` (tech)
- **cli.platform**：跨平台兼容：路径/编码/shell 差异与约束。
  - **Draft targets**：`MEM-cli-cross-platform-pitfalls` (tech)
- **cli.distribution**：安装/更新/回滚策略（发布渠道与兼容策略）。
  - **Draft targets**：`MEM-cli-install-update-release` (tech)

---

## G) 基建&平台（平台工程/IaC/IAM/网关）

### Must

- **infra.tenancy**：租户模型/资源模型：隔离边界是什么？谁能创建/修改什么？
  - **Draft targets**：`MEM-infra-change-management-and-audit` (tech)
- **infra.changeMgmt**：变更流程：审批/审计/回滚/漂移治理（drift）。
  - **Draft targets**：`MEM-infra-change-management-and-audit` (tech)
- **infra.secretsIdentity**：身份与密钥：密钥管理、轮换、最小权限原则落点。
  - **Draft targets**：`MEM-secrets-and-identity-boundaries` (tech)
- **infra.sloDr**：SLO/灾备/容量：SLO 指标、演练频率、容量规划与告警。
  - **Draft targets**：`MEM-observability-and-debug-playbook` (tech)

---

## H) AI 应用（LLM/多模态/Agent）

### Must

- **ai.successMetrics**：成功指标：准确性/成本/延迟的优先级与目标值。
  - **Draft targets**：`MEM-ai-cost-latency-budget-and-fallbacks` (tech)
- **ai.eval**：评测：评测集来源、离线评测方法、线上 A/B 或回归策略。
  - **Draft targets**：`MEM-ai-eval-and-guardrails` (tech)
- **ai.guardrails**：护栏：不可接受输出、注入防护、敏感信息与审计策略。
  - **Draft targets**：`MEM-ai-eval-and-guardrails` (tech)
- **ai.fallbacks**：降级与兜底：模型不可用/超时/成本超预算时如何降级？
  - **Draft targets**：`MEM-ai-cost-latency-budget-and-fallbacks` (tech)

### Should

- **ai.promptOps**：Prompt/工具调用/上下文策略：提示词放哪里、如何版本化与回滚？
  - **Draft targets**：`MEM-ai-eval-and-guardrails` (tech)
