# cursor-workflow

一个可直接复刻“Plan → Work → Review → Compound”闭环的 **Cursor 项目模板仓库**：显式命令驱动、产物落盘、上下文工程与复合沉淀（复利）。

> 核心理念来自你提供的公众号文章（上下文工程 + 复合工程 + 工具隐形化/入口极简化）：[文章链接](https://mp.weixin.qq.com/s?__biz=MjM5ODYwMjI2MA==&mid=2649798388&idx=1&sn=e0312f3b4b60675a40411281e86c4469&chksm=bfe5a54d8a2afd9db884eec432759a63267ab38626bccefabbfddf6af888e7cbe5d599defa9f&mpshare=1&srcid=0111ehqH3VLnSGsgFXkhbzyZ&sharer_shareinfo=c9158e608e7bf32688b4ce4546cb04f9&sharer_shareinfo_first=af9111366c52d30a0a791cbebb5d69d5&from=singlemessage&scene=1&subscene=317&sessionid=1768108880&clicktime=1768110543&enterid=1768110543&ascene=1&fasttmpl_type=0&fasttmpl_fullversion=8077397-zh_CN-zip&fasttmpl_flag=0&realreporttime=1768110543550&devicetype=android-36&version=28004153&nettype=WIFI&abtest_cookie=AAACAA%3D%3D&lang=zh_CN&countrycode=CN&exportkey=n_ChQIAhIQ5Th7WC0yB0DQElVCDbmUnRLrAQIE97dBBAEAAAAAADQROcfKi3kAAAAOpnltbLcz9gKNyK89dVj0HaF%2B5MoCppD6of7L%2Fnay7FIgej3QLVcdCjZN7d0Aep4tRg%2B3YPtoKrETAQwQA2r%2BMfim9BqNWYrhnWepx66aEGdGYfaCjkcqKZuNV6k0RN8Qk9be2Cx3fhOU%2BYzCEVY0ILfEgPGLubn8geTWoRDTkusdBaWW3Eo4pqRzcpG8s9yy1p7ZggROEDD3l7NUPYbIAMbmibmgHTTOnUSyMGNJLKgylmWplcCMhYq9gf6TioCLVEmLkVtpwBi62DFE%2F2QUT84Xwpw%3D&pass_ticket=uxlTWTN0HMjxaV2dDYG1ay%2B9qDAh9mY1G5l1btTsehTvePCVHHhVpLHzvltMe2w1&wx_header=3)

## 你能得到什么

- **显式命令**：`/req`、`/review-req`、`/plan`、`/work`、`/review`、`/compound`、`/remember`
- **产物落盘**：每一步输出写入固定目录，形成可交接、可回放、可复用的状态文件
- **上下文工程**：只沉淀"最小高信号"上下文（概要 + 指针），避免文档膨胀
- **复合沉淀（复利）**：把踩坑/流程/可自动化拦截点转为 `ai/context/` 资产，让下一次更快
- **即时沉淀**：`/remember` 让你在解决问题当下立即沉淀经验，无需等 `/compound`
- **经验自动加载**：在 `/req`、`/plan`、`/work` 执行前自动检索匹配的历史经验，主动提醒相关风险与背景文档（复刻原文的 experience-index Skill）
- **结构化状态文件**：状态文件包含当前阶段、下一步动作、阻塞项等信息，便于 Subagent 快速理解状态
- **阶段性笔记保存**：Work 阶段支持阶段性保存 checkpoint，避免上下文占满，支持长时间任务和跨会话恢复
- **Context7 集成**：在 Plan 和 Work 阶段自动查询技术文档，确保实现的准确性和最佳实践

## 快速开始（建议路径）

### 1) 用 `/req` 创建需求

在 Cursor 中运行：

```
/req <需求描述>
```

会生成/更新：

- `ai/requirements/in-progress/REQ-xxx.md`
- `ai/requirements/INDEX.md`

### 2) 用 `/review-req` 审查需求（建议执行）

在进入 Plan 前，先审查 Requirement 的执行风险和不足之处：

```
/review-req REQ-xxx
```

会输出到对话中（不保存文档）：

- 执行风险总结（技术/业务/执行三维度）
- 需求完整性分析（缺失信息清单、信息模糊点）
- 不足之处与改进建议
- 总体评估（可执行性评分、是否可以开始 Plan）

**如果发现阻塞性问题，建议先更新 Requirement（使用 `/req REQ-xxx`），再进入 Plan。**

### 3) 用 `/plan` 生成可执行计划

```
/plan REQ-xxx
```

会生成/更新：

- `ai/requirements/in-progress/REQ-xxx.plan.md`
- `ai/requirements/INDEX.md`（状态更新）

### 4) 用 `/work` 按计划实现并持续验证

```
/work REQ-xxx
```

会持续更新：

- `ai/requirements/in-progress/REQ-xxx.plan.md`（勾选任务 + 验证记录）
- `ai/context/session/<REQ-xxx>-checkpoint-{timestamp}.md`（阶段性保存，避免上下文占满）

**特性**：

- 支持阶段性保存 checkpoint，避免上下文占满
- 支持跨会话恢复，下次执行 `/work REQ-xxx` 时自动加载最近的 checkpoint
- 自动调用 Context7 查询技术文档，确保实现准确性

### 5) 用 `/review` 分级审查并产出 TODO

```
/review REQ-xxx
```

会生成/更新：

- `ai/requirements/in-progress/REQ-xxx.review.md`
- `ai/requirements/INDEX.md`（状态更新）

### 6) 用 `/compound` 做复利沉淀

```
/compound REQ-xxx
```

会生成/更新：

- `ai/context/experience/<tag>-<title>.md`
- `ai/context/experience/INDEX.md` -（按需）`ai/context/tech/services/<service-or-module>.md`
- `ai/requirements/INDEX.md`（可将状态推进为 completed）

### 7) 用 `/remember` 即时沉淀（可选，低摩擦）

刚解决一个问题或踩到一个坑后，立即沉淀：

```
/remember <问题/坑的简要描述>
```

会生成/更新：

- `ai/context/experience/<tag>-<title>.md`（一条经验文件）
- `ai/context/experience/INDEX.md`

**与 `/compound` 的区别**：`/remember` 不需要 REQ-xxx，适合即时沉淀单条经验；`/compound` 围绕一个 REQ 做系统性复利收尾。

## 目录结构（位置即语义）

```
.
├── .cursor/
│   ├── commands/                 # 显式命令：/req /review-req /plan /work /review /compound /remember
│   └── rules/                    # 工作流规则与编码规范（自动生效）
├── ai/
│   ├── requirements/             # 需求产物（索引/进行中/已完成）
│   │   ├── INDEX.md              # 状态索引（包含当前阶段、下一步动作、阻塞项）
│   │   ├── in-progress/
│   │   └── completed/
│   ├── context/                  # 长期上下文（业务/技术/经验）
│   │   ├── business/
│   │   ├── tech/
│   │   │   └── services/
│   │   ├── experience/
│   │   └── session/              # 会话临时信息（checkpoint、临时笔记等）
│   └── workspace/                # 临时工作区（默认忽略）
```

## 核心规则（务必读一遍）

- `.cursor/rules/workflow.mdc`
- `.cursor/rules/development-specifications.mdc`

## Skill 型 rules（能力库）

本模板把可复用流程拆成 **skill rules**（模拟原文的 Skills）。Commands 只负责入口与路由，Skill rules 负责“如何落盘/如何约束/如何回写索引”：

- `.cursor/rules/skill-index-manager.mdc`：索引与状态（SSoT）
- `.cursor/rules/skill-experience-depositor.mdc`：Experience 沉淀与索引
- `.cursor/rules/skill-experience-index.mdc`：经验自动检索与加载（在需求分析/方案设计/代码编写前自动匹配与提醒）
- `.cursor/rules/skill-context-engineering.mdc`：最小高信号上下文原则
