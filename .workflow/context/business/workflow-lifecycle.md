# Workflow 生命周期（业务上下文）

## 1) 业务定位（What / Why）

- **业务目标**：提供 AI workflow 的项目级成长能力，让 AI 在项目工作中持续积累经验，并将经验提炼为可复用的质量准则
- **核心价值**：
  - 解决同类问题反复发生的问题（AI 每次都像第一次遇到）
  - 解决判断不稳定的问题（形成"这个项目里我们长期相信的判断"）
  - 解决过程知识难沉淀的问题（排查路径、验证方式、关键取舍能够被系统化记录）
  - 解决重复任务不变快的问题（同样的任务做 100 次会越来越快）
- **业务背景**：传统方案（硬编码提示词、会话级上下文、人工总结）存在局限，需要机制化的知识沉淀与自动化改进系统

## 2) 业务边界（Scope）

- **负责什么**：
  - 需求全生命周期管理（req → plan → audit → work → review → archive）
  - 经验沉淀机制（EXP-CANDIDATE 捕获、experience-collector 收集、experience-depositor 沉淀）
  - 经验治理机制（experience-curator 合并/取代、质量准则建议）
  - 规则管理（rules-creator 创建质量规则）
  - 上下文管理（service-loader 服务上下文、business context 业务上下文）
- **不负责什么**：
  - 不负责代码实现（由 AI 根据 plan 执行）
  - 不负责项目部署（由项目自身负责）
  - 不负责外部系统集成（仅提供机制，不实现具体集成）
- **与其他业务模块的边界**：
  - 与 Cursor Editor：依赖 Cursor Nightly 的 Skills 机制，但不控制 Cursor 本身
  - 与项目代码：通过 `.workflow/` 目录管理 workflow 相关文件，不侵入项目代码

## 3) 关键流程（Processes）

- **需求推进流程**：
  1. 用户输入 `/flow <需求描述>` 或 `/flow REQ-xxx`
  2. flow-router 解析意图，判断当前阶段
  3. experience-index 匹配相关经验并提醒
  4. 进入对应阶段（req/plan/audit/work/review/archive）
  5. 阶段 Skill 执行，生成产物
  6. 输出循环选项菜单，等待用户确认
  7. 用户选择下一步（继续本阶段/进入下一阶段/回退/退出）
  - **关键决策点**：
    - 阶段推进需要人工闸门确认（不能自动推进）
    - 经验沉淀需要用户确认（`/flow 沉淀 ...`）
    - 质量准则采纳需要用户确认（`/flow 采纳质量准则 ...`）
  - **指针**：`.cursor/commands/flow.md`、`.cursor/skills/flow-router/SKILL.md`

- **经验沉淀流程**：
  1. 在工作过程中输出 EXP-CANDIDATE 注释
  2. experience-collector（后台）自动收集并暂存到 `.workflow/context/session/pending-compounding-candidates.json`
  3. 用户执行 `/flow 沉淀 ...` 确认沉淀
  4. experience-depositor 展示候选，执行沉淀分流
  5. 写入经验到 `.workflow/context/experience/`
  6. experience-curator 自动触发治理（合并/取代、质量准则建议）
  - **关键决策点**：
    - 成长过滤器：判断是否进入长期知识库
    - 沉淀分流：判断应沉淀到哪里（experience/rules/skills/context）
    - 冲突检测：检查与现有经验的冲突
  - **指针**：`.cursor/skills/experience-depositor/SKILL.md`、`references/knowledge-compounding.md`

- **项目初始化流程**：
  1. 用户执行 `/init` 命令
  2. 引导式收集项目信息（技术栈、项目结构、开发规范、业务流程、服务/模块）
  3. 生成业务上下文文档（`.workflow/context/business/`）
  4. 生成服务上下文文档（`.workflow/context/tech/services/`，如适用）
  5. 识别并输出经验候选（EXP-CANDIDATE）
  6. 生成初始化报告
  - **关键决策点**：
    - 信息收集方式：引导式收集，而非自动分析
    - 文档生成：基于模板生成，确保一致性
  - **指针**：`.cursor/commands/init.md`、`.cursor/commands/references/business-context-template.md`

## 4) 业务规则（Rules）

- **业务约束**：
  - 阶段推进必须通过人工闸门（不能自动推进）
  - 经验沉淀必须用户确认（禁止未确认写入 `.workflow/context/experience/`）
  - 质量准则采纳必须用户确认（禁止未确认写入 `.cursor/rules/qs-*`）
  - INDEX.md 是需求状态的单一事实源（SSoT）
  - 经验必须包含 Decision Shape 和 Judgment Capsule
- **业务逻辑要点**：
  - 成长过滤器：判断经验是否进入长期知识库（"一年后，在完全不同的项目里，这条信息还能帮我提前做出正确判断吗？"）
  - 沉淀分流：将知识放到最合适的载体（experience/rules/skills/context）
  - 经验治理：自动合并/取代，保持经验库精炼
  - 指针：`.cursor/skills/experience-depositor/SKILL.md`、`references/knowledge-compounding.md`

## 5) 协作上下文（Collaboration）

- **涉及团队/角色**：
  - 使用 workflow 的工程师：通过 `/flow` 命令推进需求，通过 `/flow 沉淀` 确认经验沉淀
  - workflow 维护者：维护 Skills、Rules、Hooks，扩展 workflow 能力
- **协作方式**：
  - 通过 Skills 机制扩展能力（`.cursor/skills/`）
  - 通过 Rules 机制定义质量准则（`.cursor/rules/qs-*`）
  - 通过 Hooks 机制扩展行为（`.cursor/hooks/`）
- **关键接口/契约**：
  - Skills 接口：Skills 必须包含 frontmatter（name、description），遵循 Skill 规范
  - Rules 接口：Rules 必须遵循命名规范（`qs-{type}-{scope}/RULE.md`），包含 frontmatter
  - 数据模型接口：INDEX.md 必须遵循表头结构，经验文档必须包含必要字段

## 6) 常见问题（FAQ）

- **常见误解**：
  - 误解：workflow 会自动实现代码
  - 澄清：workflow 只提供机制和流程，代码实现由 AI 根据 plan 执行
  - 误解：经验沉淀是自动的
  - 澄清：经验沉淀需要用户确认（`/flow 沉淀 ...`），遵循"确认机制"
- **常见坑点**：
  - 坑点：忘记执行 `/flow 沉淀 ...`，导致经验候选未被沉淀
  - 解决方案：stop hook 会在对话结束时提醒有待沉淀候选
  - 指针：`.cursor/hooks/stop.mjs`
  - （候选）可沉淀为 experience：经验沉淀确认的重要性
  - 坑点：阶段推进时忘记人工闸门确认，导致自动推进
  - 解决方案：flow-router 必须在每轮结束输出循环选项菜单
  - 指针：`.cursor/skills/flow-router/SKILL.md`
  - （候选）可沉淀为 experience：人工闸门在阶段推进中的重要性
