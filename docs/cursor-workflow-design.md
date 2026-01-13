# cursor-workflow 设计文档（基于 Cursor Nightly：Rules × Commands × Skills × Hooks）

> **定位**：这是一个“技能优先（Skills-first）”的 Cursor 工作流模板仓库，用**单入口**命令 `/flow <REQ-xxx|描述>` 驱动需求全生命周期（req → plan → audit → work → review → compound），并通过 **人工闸门（human gates）** 与 **确认式沉淀（confirm-only knowledge capture）** 保证过程可控、产物可追溯、知识可复用、质量可持续改进。

## 1. 背景与设计理念

本仓库的设计核心是把 AI 辅助研发做成一套“可长期复用、可持续改进”的工程系统，重点解决两类根问题：

- **上下文工程（Context Engineering）**：在正确的时刻给到**最小高信号**信息（先指针后细节、分层加载、按需展开），避免上下文膨胀导致偏航。
- **知识沉淀与自动化改进（Knowledge Capture & Automation）**：把执行过程中的“缺陷模式/隐性约束/排查结论/验证方法/决策依据”沉淀为可检索、可执行的系统资产，用于降低重复错误与返工。

为让上述理念可落地，本仓库采用 Cursor 可用的能力组合出一个工程化闭环：

- **Rules**：提供常驻约束（红线、规范、写作风格）
- **Commands**：提供极简入口（`/flow`），把复杂度隐藏在系统内部
- **Skills**：承载阶段 Playbook（高质量模板、检查清单、落盘规范）
- **Subagents**：隔离上下文的辅助执行者（经验收集/落盘），减少主对话干扰
- **Hooks**：提供自动门控、候选提醒、归档等自动化能力

## 2. 目标与非目标

### 2.1 目标

- **入口极简**：用户只需表达意图（`/flow <描述>` 或 `/flow REQ-xxx`），无需记忆一堆子命令。
- **可观测、可纠偏、可回退**：用索引（SSoT）+ 账本（plan）+ review 形成闭环；关键推进点必须人工确认。
- **最小高信号上下文**：强调“指针优先、按需加载、避免文档膨胀”。
- **知识沉淀与可执行约束**：把“返工原因/隐性约束/排查结论/可自动拦截点”转成长期资产（经验库、规则、技能、服务上下文），并在后续会话的恰当节点自动加载。

### 2.2 非目标

- **不追求全自动推进**：阶段切换不自动完成，必须通过“菜单 + 明确确认”。
- **不将 session 当知识库**：`.workflow/context/session/` 只用于续航与交接（checkpoint、暂存），不是长期知识。
- **不在未确认时写入经验库**：任何 `.workflow/context/experience/` 写入必须走 `/flow 沉淀 ...` 的明确确认路径。
- **不在主对话复制长日志**：依赖 EXP-CANDIDATE 结构化捕获高信号判断，子代理落盘，避免为“传递上下文”写冗长叙述。

## 3. 总体架构（分层）

### 3.1 分层概览

```text
User
  |
  |  /flow <REQ|描述>
  v
Command Layer (.cursor/commands)
  - flow.md: 单入口 + 状态机路由 + 人工闸门协议
  - remember.md: 可选即时沉淀入口（兼容）
  |
  v
Decision/Orchestration (Agent)
  - 读取索引/产物，选择阶段
  - 每阶段进入前：经验检索（experience-index）
  - 调用对应 Skill 执行并落盘
  |
  v
Execution Layer (.cursor/skills)
  - req/plan/audit/work/review/compound 等阶段 Playbook
  - index-manager/plan-manager/experience-* 等“底座能力”
  |
  v
Artifacts & Long-term Context (.workflow/**)
  - requirements: REQ 三件套 + INDEX（SSoT）
  - context: experience / services / business / quality-standards
  - session: checkpoint / 暂存候选
  |
  v
Hooks (.cursor/hooks + hooks.json)
  - 提交前门控（/flow 形态校验 + REQ 存在性检查）
  - 输出后候选抽取 + stop 时 followup 提醒
  - completed 自动归档（in-progress -> completed + INDEX Links 修正）
```

### 3.2 “位置即语义”的目录约定

```text
.cursor/
  commands/              # 入口命令（单入口 /flow）
  rules/                 # 规则（常驻约束，部分 alwaysApply）
  skills/                # 阶段 Playbook（Nightly Agent Skills）
  hooks.json             # Hook 注册
  hooks/                 # Hook 脚本（Node.js）

.workflow/
  requirements/
    INDEX.md             # 需求状态索引（SSoT）
    in-progress/         # 进行中的 REQ 三件套（.md/.plan.md/.review.md）
    completed/           # 已完成归档三件套
  context/
    experience/          # 长期经验库 + INDEX（confirm-only）
    tech/services/       # 服务/模块上下文（长期可复用的服务说明）
    tech/quality-standards-*.md  # 质量准则 Schema 与 Index
    business/            # 业务边界/协作上下文（可选）
    session/             # 会话暂存（checkpoint、pending candidates）
  workspace/             # 临时工作区（默认 gitignore）
```

## 4. 核心约束（护栏）

本工作流的硬约束：

- **Single entrypoint**：只使用 `/flow <REQ-xxx|描述>` 驱动生命周期。
- **Human gates**：任何阶段切换都不能静默自动推进；每轮必须输出菜单，等待用户选择。
- **Confirm-only knowledge capture**：未收到 `/flow 沉淀 ...` 明确确认前，不得写入 `.workflow/context/experience/`。
- **第一现场捕获，分层处理**：经验候选在 req/plan/work/review 的现场输出结构化 EXP-CANDIDATE，由后台 subagent 收集、前台 subagent 落盘。
- **质量准则采纳也需确认**：未收到 `/flow 采纳质量准则 ...` 明确确认前，不得写入 `.cursor/rules/qs-*`。

## 5. 关键状态与产物模型

### 5.1 Requirements Index（SSoT）

`\.workflow/requirements/INDEX.md` 是需求状态的**单一事实源**，表头固定为：

```text
| ID | Title | Status | Current Phase | Next Action | Blockers | Links |
```

- **Status**：典型值 `in-progress` / `planned` / `in-review` / `needs-fix` / `completed`
- **Current Phase**：`req|plan|audit|work|review|compound`
- **Links**：指向三件套路径（in-progress 或 completed）

与之配套的自动化：

- **归档一致性**：当索引行 `Status=completed`，hooks 会尝试把 `requirements/in-progress/REQ-xxx.*` 自动移动到 `requirements/completed/`，并同步替换 INDEX 的 Links 路径。

### 5.2 Plan 作为“执行账本”（可交接、可回放）

`REQ-xxx.plan.md` 不只是计划，也是“执行 ledger”：

- **Status Summary**：阶段/进度/当前任务/阻塞项/上次更新
- **Files to Change**：需要创建/修改的文件清单（含测试文件）
- **Tasks**：可勾选、可拆分为最小步；任务需标注依赖关系
- **Test Specifications / Validation**：验证方式必须可复现；中等以上复杂度需包含“可测试行为清单 + 输入/输出/边界条件”的测试规格，并将测试任务作为必选分类
- **Worklog**：记录做了什么、为什么、如何验证、结果、指针
- **Compounding Candidates**：持续输出“待沉淀候选”，供 hooks 抽取与后续确认沉淀（仅在用户确认后进入长期知识库或规则/技能）

`plan-manager` Skill 明确规定了这些字段必须持续回写。

#### 5.2.1 测试设计与执行链路（概览）

工作流中与测试相关的职责分配如下：

- **plan 阶段**：定义“可测试行为清单”和对应的测试规格（输入/输出/边界条件），并将测试任务显式加入任务清单与文件变更清单。
- **audit 阶段**：审查计划中的测试任务与测试规格是否完整，测试缺失可作为阻塞项处理。
- **work 阶段**：在任务开始前、每个任务完成后、进入 review 前执行测试并记录结果；单元测试要求隔离依赖、按行为编写、使用 AAA（Arrange–Act–Assert）结构。
- **review 阶段**：审查测试覆盖情况与测试质量，测试覆盖不足应作为需要修正的问题回写到 plan。

### 5.3 Experience Index（长期经验库索引）

`\.workflow/context/experience/INDEX.md` 用于“可检索、可治理、可谱系化”的经验库管理。

经验索引表头建议如下：

```text
| Tag | Title | Trigger (when to load) | Surface signal | Hidden risk | Status | Scope | Strength | Replaces | ReplacedBy | File |
```

- **Status**：`active` / `deprecated`（禁止删除文件，只做 deprecated）
- **Scope**：`narrow < medium < broad`
- **Strength**：`hypothesis < validated < enforced`（enforced 通常意味着已转为自动拦截/规则化）
- **Replaces / ReplacedBy**：经验谱系链（新 → 旧 / 旧 → 新）

两类 Trigger 的分工：

- **Trigger (when to load)**：偏工程检索（关键词/场景），用于在正确时刻加载
- **Surface signal / Hidden risk**：偏风险提示，用于在相似信号出现时提醒关注潜在问题

### 5.4 Quality Bar（质量准则）

`\.workflow/context/tech/quality-bar.md` 是“从经验中蒸馏出来、团队共识采纳后”的质量门槛（质量准则）。

- **写入方式**：只能通过 `/flow 采纳质量准则 <序号>` 落盘
- **目的**：把“质量准则建议”从一次性对话，升级为长期、可执行的质量约束

## 6. /flow 的状态机与推进协议

### 6.1 路由输入形态

`/flow` 支持四类意图：

- **创建新需求**：`/flow <需求描述>` → 进入 `req`
- **继续既有需求**：`/flow REQ-xxx` → 读取 SSoT / plan 状态决定阶段
- **确认沉淀**：`/flow 沉淀 1,3` / `/flow 沉淀 全部` / `/flow 忽略沉淀`
- **采纳质量准则**：`/flow 采纳质量准则 1,3` / `/flow 忽略质量准则`

### 6.2 状态来源优先级（flow-router）

阶段判断的优先级（从高到低）：

1. `requirements/INDEX.md` 的 `Status/Current Phase/Next Action`
2. `REQ-xxx.plan.md` 的 `Status Summary`
3. 文件存在性推断（REQ 三件套是否齐全）

### 6.3 每阶段进入前的“强制前置”

在进入 req/audit/plan/work/review/compound 任一阶段之前：

- **必须**调用 `experience-index`：按 Trigger 匹配 active 经验，输出“最小高信号”的风险提醒与指针。
- **按需**调用 `index-manager`：做 Fail Fast（索引与文件一致性）。
- **推荐**调用 `service-loader`：当涉及存量/多服务系统时，先补齐服务上下文，降低理解与定位成本。
- **按需**调用外部知识工具（如 WebSearch、MCP）：在 req/plan 阶段用于补齐外部最佳实践与方案信息（结果不单独落盘，需融入产物表述）。

### 6.3.1 阶段职责概览

| 阶段 | 目标 | 关键活动 | 主要产物 |
|---|---|---|---|
| req | 明确需求边界与验收标准 | 项目上下文分析、类型/复杂度判断、必要信息一次性澄清、外部参考（按需） | `REQ-xxx.md` |
| plan | 形成可执行、可验证的计划 | 任务拆解（含依赖与文件清单）、外部参考（按需）、测试设计（行为提取/规格） | `REQ-xxx.plan.md` |
| audit | 降低进入 work 的风险 | 审查技术风险、任务完整性、测试规格、规范符合度，给出是否可推进判据 | 对话输出（不落盘） |
| work | 按计划实现并持续验证 | 按任务推进、按节奏执行测试、记录验证结果与证据、必要时 checkpoint | 回写 `REQ-xxx.plan.md` + 可选 checkpoint |
| review | 多维度验收与回归风险控制 | 功能/安全/性能/架构/可维护性/回归风险 + 测试覆盖审查 | `REQ-xxx.review.md` + 回写 plan |
| compound | 复利沉淀编排与归档 | 确认沉淀 → 调用 experience-depositor → 触发 curator → 归档 | `experience/*` + `requirements/completed/*` |

### 6.4 人工闸门（循环菜单）

每轮阶段输出必须给出菜单，禁止静默推进：

```text
你要怎么做？
A) 继续本阶段（例如再 audit 一次 / 继续 work 下一个 task）
B) 进入下一阶段（我会先复述推进判据，等待你确认）
C) 回退到上一阶段（说明原因与影响）
D) 退出
```

并且在阶段切换点给出“可推进判据”（例如 audit→work：Blockers=0 且风险已评估）。

## 7. Hooks 自动化链路（关键差异：把“流程质量”系统化）

hooks 在 `.cursor/hooks.json` 注册，脚本位于 `.cursor/hooks/`。

### 7.1 beforeSubmitPrompt：输入门控（/flow 形态校验 + Fail Fast）

脚本：`.cursor/hooks/before-submit-prompt.mjs`

- **/flow 空参数拦截**：`/flow` 必须带参数，否则给出用法提示。
- **指定 REQ 不存在则拦截**：用户输入 `/flow REQ-xxx` 但本地找不到对应 requirement 文件，直接 fail fast，避免无效执行。

> **注意**：workflow 不负责敏感信息检测等用户偏好相关的事项，这些应由用户自行管理或通过其他工具处理。

### 7.2 beforeShellExecution：占位符（已移除用户偏好检查）

脚本：`.cursor/hooks/before-shell-execution.mjs`

- 该 hook 仅作为占位符保留，不执行任何检查。
- workflow 不负责包管理器选择、命令风险判断、git 操作确认等用户偏好相关的事项。

> **注意**：如需包管理器统一、危险命令拦截等功能，应由项目级规则或用户自行配置，而非 workflow 职责。

### 7.3 afterAgentResponse：候选抽取（兼容路径）

脚本：`.cursor/hooks/after-agent-response.mjs`

用途：兼容旧的“复利候选”小节抽取。主路径改为在阶段技能中输出 `EXP-CANDIDATE` 注释，由 subagent 处理；若未输出注释但仍有小节，则本 hook 兜底抽取。

抽取逻辑（兼容小节）：

- 当输出包含 `沉淀候选` / `复利候选` 或 `Compounding Candidates` 小节时：
  - 识别 `- ...` / `- [ ] ...` / `- [x] ...` 行作为候选，遇到下一个 `##`/`###` 标题停止
  - 最多保留 8 条
- 写入暂存文件（若不存在则创建目录）：
  - `.workflow/context/session/pending-compounding-candidates.json`
  - 结构包含 `asked: false`（尚未提示用户确认）

### 7.4 stop：对话结束时 followup（提醒用户是否沉淀）

脚本：`.cursor/hooks/stop.mjs`

- 仅在 `input.status === "completed"` 的“完整循环结束”时触发，避免中途插入。
- 若存在 pending candidates 且尚未 asked，则输出 followup 提示：
  - 候选列表（1-based）
  - 引导用户使用 `/flow 沉淀 ...` 或 `/flow 忽略沉淀`
- 同时做清理工作：把 `Status=completed` 的 REQ 产物归档到 `requirements/completed/` 并修正 INDEX Links。

### 7.5 afterShellExecution：审计日志（可选）

脚本：`.cursor/hooks/audit-after-shell-execution.mjs`

- 将每次 shell 执行的 `command/duration/output_head` 追加记录到系统临时目录日志（不影响主流程）。

## 8. 知识沉淀（Compounding）与治理（Curate）

### 8.1 第一现场捕获 → Subagent 暂存 → 确认沉淀

1. 在 req/plan/work/review 现场，当出现纠正/取舍/根因/覆盖缺口等判断时，输出 `EXP-CANDIDATE` 注释（结构化 JSON，含 stage/trigger/decision/...）。
2. 后台 subagent `experience-collector`：
   - 解析注释
   - 应用“成长过滤器”（一年后跨项目仍有价值才保留）
   - 结合最小高信号上下文（REQ id/title/一行描述、stage、行为/验收摘要、关键决策、文件指针）暂存到 `.workflow/context/session/pending-compounding-candidates.json`
3. stop hook 在对话结束时提醒有待沉淀候选（若尚未确认）。
4. 用户明确回复：
   - `/flow 沉淀 1,3` 或 `/flow 沉淀 全部`：进入落盘
   - `/flow 忽略沉淀`：清空待处理项

> 兼容：若未输出注释但仍有 `复利候选` 小节，afterAgentResponse hook 兜底抽取。

### 8.2 沉淀分流（Experience Depositor + Compound 编排）

`experience-depositor` 的核心不是“只写经验文档”，而是先做**沉淀分流**（将知识与改进点放到最合适的载体）：

- **经验文档**（默认）：写入 `.workflow/context/experience/`
- **规则/自动拦截**：高频且可自动判定 → 优先 hook/lint/CI
- **Skill/流程升级**：重复执行的流程 → 优先固化为 skill
- **长期上下文补齐**：与存量系统理解相关的信息 → `.workflow/context/tech/services/` 或 `.workflow/context/business/`

在写入 experience 之前，必须先做一个“长期资产筛选”判断：

- **可迁移性**：该信息是否能在不同项目/不同时间点复用，用于提前识别风险或指导决策？
  - 否 → 不进 experience（保留在 session/worklog 作为项目记录）
  - 是 → 进入 experience（长期可复用知识）

> 目的：控制长期知识库的噪声密度，优先沉淀可复用、可检索、可执行的内容。

### 8.3 治理流程（Experience Curator，自动执行）

当本轮沉淀**实际新增**经验文件后，`experience-depositor` 必须自动触发 `experience-curator`：

- **先备份**：`experience/INDEX.md` → `experience/INDEX.md.bak`
- **治理动作（自动执行）**：
  - **合并组**：Trigger 关键词重叠 ≥ 60%（或 Tag 相同等高优先规则）
  - **取代链**：新经验覆盖旧经验 → 旧经验 `deprecated`，建立谱系关系（Replaces/ReplacedBy）
- **输出治理报告**：动作/理由/影响/回滚方式
- **输出质量准则建议（只建议）**：1-3 条，等待用户 `/flow 采纳质量准则` 或 `/flow 忽略质量准则`

治理过程的抽象要求：

- 质量准则建议应优先基于经验中的“决策记录摘要”（决策点/备选方案/选择理由/关键判据）抽象，而不是复述案例步骤

## 9. 安装与复刻（作为模板仓库）

仓库提供三种安装方式：

- **远程安装脚本**：`install-remote.sh`（bash）与 `install.ps1`（PowerShell）
- **本地安装脚本**：`install.sh`（bash）与 `install.js`（node）
- **手动复制**：复制 `.cursor` 与 `.workflow` 的骨架与索引

安装脚本主要做：

- 创建 `.cursor/{commands,rules,skills,hooks}` 并复制文件
- 写入 `.cursor/hooks.json`
- 创建 `.workflow` 目录骨架并复制 `requirements/INDEX.md` 与 `experience/INDEX.md`
- 更新 `.gitignore`（忽略 `.workflow/workspace/` 与 `.workflow/context/session/`）

## 10. 扩展点（如何演进而不破坏体系）

- **新增阶段能力**：优先新增/扩展 `.cursor/skills/*`，而不是增加新的命令入口。
- **增强自动化拦截**：把高频错误从“经验”升级为 hook/lint/CI（Strength → enforced）。
- **服务上下文建设**：当项目复杂度上升，优先补齐 `tech/services/*` 作为长期可复用的服务说明，并在 plan 阶段强制引用指针。
- **经验治理策略**：合并/取代规则保持可解释、可回滚，避免引入不可控的黑盒聚类。
