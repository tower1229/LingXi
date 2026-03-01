---
name: init
description: 引导式初始化灵犀工作流（创建 .cursor/.lingxi/ 骨架与可选记忆草稿，用户门控写入）
args: []
---

# /init - 项目初始化

**用途**：初始化灵犀工作流到项目（创建 `.cursor/.lingxi/` 骨架），建立项目上下文并生成记忆候选清单；默认不写入，需用户在交互中选择写入。

---

**用法**：`/init`（无参数）。优先从现有文档整理，仅对缺失或不确定项通过 ask-questions 收集；所有选择环节均用 ask-questions 协议。写入经 taste-recognition、lingxi-memory 完成。


**关键约定**：写入门控不可侵犯（仅当用户明确选择写入时才写盘）；用户选择均通过 ask-questions skill；执行遵循 workflow-output-principles（最小高信号）。

**委托**：先执行 workspace-bootstrap 确保骨架存在，再按 Step 0.5–8 执行；完整步骤与 init-checklists 见下方附录。

---

## 附录：完整执行流程与 init-checklists

### Step 0.5) Agent 静默推断项目类型（不展示、不确认、不修正）

仅用于提高收集清单与草稿的准确率，**不向用户展示推断结果，也不接受用户确认或修正**。根据工作区内容推断项目类型（A–H，可多选）：

1. **读取**（工作区根）：`package.json`（若有）、`README`/`README.md`（若有）、`pyproject.toml`（若有）、根目录及一层子目录名列表；必要时扫 1～2 个关键配置文件（如 `next.config.*`、`vite.config.*`、`Dockerfile`）。不扫全仓，只取足以推断类型的信号。
2. **推断**：结合文件内容与目录结构做语义判断，从下表选取适用的类型（可多选）。推断结果仅内部使用，用于 Step 1 选取收集清单与 Step 3 类型特化草稿；若无法得到有效信号，按「通用（common 仅）」处理。

**类型推断信号参考**（非穷举，用于辅助语义判断）：

| 类型        | 可参考信号示例                                                                                                          |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| A Web       | `next.config.*` / `vite.config.*` / `nuxt.config.*`，`pages/`、`app/`（App Router），前端框架依赖（react、vue、svelte） |
| B 后端      | `express`/`fastify`/`koa`、`server/`/`api/` 目录、`Dockerfile` 暴露服务端口、README 中「API/微服务」                    |
| C 移动端    | `app.json`（Expo）、`android/`/`ios/`、`react-native`、Xcode/Android 工程结构                                           |
| D 数据&ETL  | `dbt_project.yml`、`dagster`/`airflow`、数据/ETL 相关依赖、调度脚本目录                                                 |
| E 库&SDK    | `package.json` 的 `main`/`exports` 且无 `bin`、`packages/*`（monorepo 库）、名称带 `-sdk`/`-lib`/`-core`                |
| F CLI       | `package.json` 的 `bin` 字段、名称/描述含「cli」「命令行」、根目录 `src/cli`/`commands`                                 |
| G 基建&平台 | `terraform/`、`k8s/`/`helm/`、多服务 `docker-compose.*`、README 中「平台/网关/IaC」                                     |
| H AI 应用   | 依赖中含 `openai`/`langchain`/`@anthropic` 等、README 中「LLM/Agent/评测」                                              |

类型枚举（仅 Agent 内部使用）：A) Web 应用 B) 后端服务 C) 移动端 D) 数据&ETL E) 库&SDK F) CLI 工具 G) 基建&平台 H) AI 应用。规则：全栈/前后端一体优先按 A+B；AI + Web/服务按 H +（A 或 B）。

### Step 1) 带着 common Must 五项理解项目，再按缺失决定是否提问

在向用户提问前，**带着下面 5 个问题理解整个项目**（如何读仓库、读哪些文件由你自主决定），得到一份 common 草稿（每项为一小段结论或"未找到"）。理解过程静默完成，不向用户输出。

**5 个问题**（与附录 init-checklists 的 common Must 对应）：(1) 项目解决什么问题、不做什么（goal + 非目标）；(2) 核心用户/角色与关键诉求（users）；(3) 1–3 条关键链路及失败兜底（flows）；(4) 风险优先级与最不可接受的失败（risks）；(5) 环境、发布与回滚方式（releaseEnv）。

**行为契约**：仅对草稿中**未找到或明显不确定**的项在后续 Step 4.2 中通过 **ask-questions 多选**让用户选择要补充的项，再逐项请求 1-3 行内容；若五项均已填满且置信度足够，**不要先问这五个问题**，直接进入 Step 2，将"项目结构/技术栈/规范/业务模块"整理成一段供用户确认（可标注「根据项目文档整理，请确认或修正」）。用户确认或补充完 Must 后，再按需进入 Should；Optional 默认不追问，除非用户在 Step 4.1 选择 `deep_dive` 并在 Step 4.2 中通过 ask-questions 多选勾选要补齐的项。从附录 init-checklists 读取通用骨架与**推断出的类型**的 Must → Should；类型不向用户询问。**所有“选哪一项/选哪些项”的环节均使用 `/ask-questions` skill 的 ask-questions 协议，不采用自然语言菜单或手输编号。**

### Step 2) 展示"项目结构/技术栈/规范/业务模块"供确认

把收集到的信息整理成以下区块（用于校对）：

- 项目结构信息
- 技术栈信息
- 开发规范信息
- 业务/模块信息（如适用）

### Step 3) 生成初始化记忆笔记草稿（不写入）

生成 3-6 条草稿项（采用让用户理解的格式，如标题 + 简短描述/要点，无需按 note 模板），并与额外候选项合并为一份"记忆候选清单"（连续编号，不写入）：

- **最少必须包含**：
  - `MEM-project-goals-and-nongoals`（business）
  - `MEM-domain-glossary-and-core-entities`（business）
  - `MEM-architecture-overview`（tech）
- **强烈建议再补齐**：
  - `MEM-critical-user-flows`（business）
  - `MEM-local-dev-mental-model`（tech）
  - `MEM-release-and-environment-contract`（tech）

并根据**推断出的类型**，从附录 init-checklists 的 Draft targets 里补齐 0-2 份最关键的类型特化草稿（保持"少而准"）。

候选清单输出格式：

- **一个清单**：`## 记忆候选清单（含草稿项）`
- **连续编号**：从 1 开始递增（例如 1-10）
- **每条候选**：标题 + 简短描述或要点，便于用户理解与选择；写入时经 taste-recognition 转为 payload 后由 lingxi-memory 按 note 模板生成

### Step 4) 交互式推进（ask-questions-first，统一走 ask-questions 工具）

所有需用户选择的环节**统一通过 `/ask-questions` skill** 发起（参见 `.cursor/skills/ask-questions/SKILL.md`）：先确认是否继续，再按需用 ask-questions 多选补齐项，最后再做写入门控。

#### 4.1 Q1：确认是否继续生成候选清单（必答）

**必须**通过 ask-questions 工具发起单选（若环境不支持 ask-questions UI，按 `/ask-questions` skill 的文本兜底模板执行）：

```json
{
  "questions": [
    {
      "question_id": "next_action",
      "question": "已整理项目结构与上下文，下一步如何继续？",
      "options": [
        { "id": "a", "label": "确认，生成候选清单" },
        { "id": "b", "label": "先补充缺失项" },
        { "id": "c", "label": "深入补齐 Should 项" }
      ]
    }
  ]
}
```

#### 4.2 缺失项交互补齐（仅在 supplement 或 deep_dive 时，均用 ask-questions 驱动）

- **supplement**：先通过 **ask-questions 多选**让用户选择要补充的 common Must 项（**仅列出当前未找到或不确定的项**），再逐项请求 1-3 行内容。示例（选项需按实际缺失项动态生成）：

```json
{
  "questions": [
    {
      "question_id": "supplement_fields",
      "question": "请选择需要补充的项（可多选）",
      "allow_multiple": true,
      "options": [
        { "id": "a", "label": "补充项目目标" },
        { "id": "b", "label": "补充核心用户" },
        { "id": "c", "label": "补充关键流程" },
        { "id": "d", "label": "补充风险与优先级" },
        { "id": "e", "label": "补充发布与环境" }
      ]
    }
  ]
}
```

根据用户勾选结果，**一次只问一个缺失项**，每次输出 1-3 行上下文，不重复展示整段菜单。

- **deep_dive**：Must 完整后，通过 **ask-questions 多选**让用户选择要补齐的 Should 项（选项来自 init-checklists 中当前类型的 Should 清单，`label` 直接写项名如「术语表」「架构概览」「本地开发心智」），再逐项收集。Optional 不主动列入选项，除非业务需要。

- 追问策略：一次只问一个缺失项；禁止重复展示整段菜单。

#### 4.3 兼容输入与异常处理（对齐 ask-questions）

- 兼容旧输入：若用户输入为选项序号、option id 或部分 label 文本，可映射为对应选项 id。
- **无有效选择时**：仅提示一次简短澄清并**再次发起当前问题的 ask-questions**，不回放长段说明（遵循 ask-questions 的“只重试当前问题”）。
- 若当前运行环境不支持 ask-questions UI，按 `/ask-questions` skill 的文本兜底模板执行；不采用手输编号等非结构化兜底，除非业务明确允许。

### Step 5) 写入策略门控（默认跳过，必须用 ask-questions 发起）

候选清单生成后，**必须**通过 ask-questions 工具单独询问写入策略（与 Q1 解耦）：

```json
{
  "questions": [
    {
      "question_id": "write_strategy",
      "question": "是否将候选条目写入记忆库？",
      "options": [
        { "id": "a", "label": "跳过，不写入" },
        { "id": "b", "label": "全部写入" },
        { "id": "c", "label": "部分写入" }
      ]
    }
  ]
}
```

- 选择「跳过，不写入」或未明确回答写入策略：仅展示候选清单，不写入磁盘。
- 选择「全部写入」：全量写入候选清单。
- 选择「部分写入」：**必须**再次通过 ask-questions 多选收集待写入候选（禁止手输编号）。

`partial` 规则（ask-questions-only）：

- **必须**通过 ask-questions 多选返回有效候选（参见 `/ask-questions` skill 模板 B）；不再支持自然语言编号写入。
- 若未选择任何候选、或返回值不在当前候选的 option id 列表中，**重新发起同一 ask-questions 多选**，仅追问选择本身。
- 若当前运行环境不支持 ask-questions 交互，提示用户改为「全部写入」或「跳过，不写入」（不走编号文本兜底）。

推荐使用以下 ask-questions 多选格式收集 `selected_candidates`（协议细则见 `/ask-questions` skill）：

```json
{
  "questions": [
    {
      "question_id": "selected_candidates",
      "question": "请选择要写入记忆库的候选（可多选）",
      "allow_multiple": true,
      "options": [
        { "id": "a", "label": "候选1：项目目标与非目标" },
        { "id": "b", "label": "候选2：领域术语与核心实体" }
      ]
    }
  ]
}
```

- `options[].id` 与候选清单条目建立稳定映射，返回值即用户选中的 option id（或 id 列表），用于确定待写入条目。

### Step 6) 可选写入执行（仅当用户选择「全部写入」或「部分写入」时）

当且仅当用户在写入策略中选择「全部写入」或「部分写入」时，执行写入：

- 从"记忆候选清单"确定待写入条目（用户确认后的草稿）。
- **先**调用 taste-recognition skill（`.cursor/skills/taste-recognition/SKILL.md`），将每条确认后的草稿转为 7 字段品味 payload（source=init；可按附录 init-checklists 类型化字段生成 scene、principles、choice 等）；每条草稿对应一条 payload，可产出多条。
- 对每条 payload **显式调用** lingxi-memory 子代理（传入 payload 及 conversation_id、可选 generation_id）；禁止将草稿或 selected_candidates 等旧结构直接传给 lingxi-memory。
- 子代理在独立上下文完成校验 → 映射 → 治理与门控 → 直接读写 `.cursor/.lingxi/memory/notes/` 与 `.cursor/.lingxi/memory/INDEX.md`。

主对话仅展示一句结果或静默；失败时输出明确错误与解决建议。

### Step 7) 初始化报告（最小高信号）

输出 3-6 行摘要：

- 生成的草稿列表
- 写入策略（跳过不写入 / 全部写入 / 部分写入）
- 若写入：写入文件列表 + 是否更新 INDEX

（不展示推断的项目类型；类型仅用于内部收集与草稿生成。）

---

## 附录：init-checklists（SSoT）

> 用途：init 命令的单一事实源。按项目类型（A-H）提供"收集清单 → 建议草稿记忆文件"的映射，遵循渐进式披露（Must → Should → Optional）。

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
  - **可抽取来源建议**：README（Why/What）、价值或原则类文档、req 的「目标与非目标」。
  - **Draft targets**：`MEM-project-goals-and-nongoals` (business)
- **common.users**：核心用户/角色是谁？每个角色最关键的 1 个诉求是什么？
  - **可抽取来源建议**：README 受众、架构/角色描述、命令或功能说明的受众。
  - **Draft targets**：`MEM-domain-glossary-and-core-entities` (business)
- **common.flows**：写出 1-3 条"关键链路"（按步骤），并注明每条链路的失败兜底。
  - **可抽取来源建议**：README 流程/命令表、架构文档、req/plan 中的关键步骤与兜底。
  - **Draft targets**：`MEM-critical-user-flows` (business)
- **common.risks**：风险优先级排序（安全/稳定性/成本/性能/合规），并说明"最不可接受的失败"。
  - **可抽取来源建议**：设计原则、评价准则、req 中的风险与约束。
  - **Draft targets**：`MEM-project-goals-and-nongoals` (business)
- **common.releaseEnv**：有哪些环境（dev/staging/prod）？发布方式与回滚方式是什么？
  - **可抽取来源建议**：README 安装/发布、架构中的部署与分发、req 中的环境与回滚。
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
