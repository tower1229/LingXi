# Init Checklists (SSoT)

> 用途：`init-executor` 的单一事实源。按项目类型（A-H）提供“收集清单 → 建议草稿记忆文件”的映射，遵循渐进式披露（Must → Should → Optional）。

## 类型枚举（A-H）

- **A) Web 应用**：SPA / SSR / 全栈 Web
- **B) 后端服务**：API / Worker / 微服务
- **C) 移动端**：iOS / Android / 跨端
- **D) 数据&ETL**：指标 / 报表 / 数仓 / 调度
- **E) 库&SDK**：对外/对内 SDK、组件库、框架封装
- **F) CLI 工具**：命令行、开发者工具
- **G) 基建&平台**：K8s / 网关 / IAM / IaC / 平台工程
- **H) AI 应用**：LLM/多模态/Agent/评测与护栏

> 允许多选：例如“全栈”通常 = A + B；“AI Web 应用”通常 = A + H。

---

## 通用骨架（所有类型必收）

### Must

- **common.goal**：一句话说明“这个项目解决什么问题”，并列出 1-3 条**非目标**（明确不做什么）。
  - **可抽取来源建议**：README（Why/What）、价值或原则类文档、req 的「目标与非目标」。
  - **Draft targets**：`MEM-project-goals-and-nongoals` (business)
- **common.users**：核心用户/角色是谁？每个角色最关键的 1 个诉求是什么？
  - **可抽取来源建议**：README 受众、架构/角色描述、命令或功能说明的受众。
  - **Draft targets**：`MEM-domain-glossary-and-core-entities` (business)
- **common.flows**：写出 1-3 条“关键链路”（按步骤），并注明每条链路的失败兜底。
  - **可抽取来源建议**：README 流程/命令表、架构文档、req/plan 中的关键步骤与兜底。
  - **Draft targets**：`MEM-critical-user-flows` (business)
- **common.risks**：风险优先级排序（安全/稳定性/成本/性能/合规），并说明“最不可接受的失败”。
  - **可抽取来源建议**：设计原则、评价准则、req 中的风险与约束。
  - **Draft targets**：`MEM-project-goals-and-nongoals` (business)
- **common.releaseEnv**：有哪些环境（dev/staging/prod）？发布方式与回滚方式是什么？
  - **可抽取来源建议**：README 安装/发布、架构中的部署与分发、req 中的环境与回滚。
  - **Draft targets**：`MEM-release-and-environment-contract` (tech)

### Should

- **common.glossary**：列出 10-20 个领域词汇（含同义词/禁用词），以及 3-8 个核心实体（实体间关系一句话即可）。
  - **Draft targets**：`MEM-domain-glossary-and-core-entities` (business)
- **common.arch**：用 5-10 行描述“请求/任务如何流经系统”（入口 → 边界 → 依赖 → 数据源）。
  - **Draft targets**：`MEM-architecture-overview` (tech)
- **common.localDev**：本地开发需要运行哪些进程/端口/代理/构建产物？
  - **Draft targets**：`MEM-local-dev-mental-model` (tech)

### Optional

- **common.constraints**：明确“硬约束/禁忌”（例如必须用某云、必须兼容某版本、不能引入某依赖）。
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

