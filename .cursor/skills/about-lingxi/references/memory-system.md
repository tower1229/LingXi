# 记忆系统机制

## 概述

记忆系统是灵犀实现"心有灵犀"的核心能力，通过自动捕获、评估、沉淀、治理和匹配，让 AI 具备项目级记忆。记忆系统统一管理所有持久化记忆，包括经验记忆（Experience）、技术记忆（Tech）和业务记忆（Business）。

## 核心流程

### 1. 记忆捕获（experience-capture）

**触发时机**：任务完成时，由 stop hook 引导调用

**检测策略**：对话历史优先 + 文件验证补充
- L1（主要来源）：从对话历史检测当前阶段和任务编号
- L2（辅助来源）：通过文件存在性验证任务状态
- L3（兜底）：对话历史缺失时要求用户明确指定

**捕获流程**：
1. stop hook 在任务完成时（`status === "completed"`）触发，引导调用 `experience-capture` skill
2. 扫描整个对话历史，识别经验信号（判断、取舍、边界、约束等）
3. 生成 EXP-CANDIDATE JSON 格式
4. 执行评估（结构完整性、判断结构质量、可复用性、知识可获得性、经验类型、Level 判断）
5. 过滤明显不通过的候选
6. 在会话中展示候选列表，供用户选择

**EXP-CANDIDATE 格式**：
```json
{
  "taskId": "001",
  "stage": "plan",
  "trigger": "当任务 T2 依赖从A改为B",
  "decision": "任务/验收/测试策略的取舍",
  "alternatives": ["原方案A（放弃，因为...）"],
  "signal": "判断依据/风险信号",
  "solution": "新的任务拆解/验收/测试策略",
  "verify": "后续如何验证该决策",
  "pointers": ["path/to/plan-file 或相关模块"],
  "reqFile": ".cursor/.lingxi/requirements/001.req.<标题>.md",
  "level": "team/project",
  "type": "standard/knowledge"
}
```

### 2. 记忆沉淀（experience-depositor）

**触发时机**：用户在 experience-capture 展示的候选列表中选择候选时，或通过 `/remember` 命令提取新经验时

**沉淀流程**：
1. 从会话上下文获取候选（由 experience-capture 传递，包含评估结果）
2. 冲突检测（语义搜索 + 关键词匹配双重验证，读取 INDEX.md）
3. 生成治理方案（方案模式）：使用语义搜索查找相似经验，结合关键词匹配进行综合判断，生成治理方案
4. 展示治理方案，用户确认
5. 执行治理动作（执行模式）：备份索引、执行合并/替代、更新统一索引、清理备份
6. 用户选择存储目标（团队级标准/经验或项目级经验）
7. 写入前执行治理（最终检查）：再次执行治理动作，确保知识库质量
8. 写入对应位置
9. 更新统一索引 `memory/INDEX.md`

**沉淀分流**：
- 团队级标准（`memory/experience/team/standards/`）：强约束、执行底线
- 团队级经验（`memory/experience/team/knowledge/`）：复杂判断、认知触发
- 项目级经验（`memory/experience/project/`）：项目特定、长期复用

**技术记忆和业务记忆**：
- 技术记忆（`memory/tech/services/`）：服务上下文，由 `service-loader` 生成
- 业务记忆（`memory/business/`）：业务上下文，由 `/init` 命令生成

### 4. 记忆治理（集成在 experience-depositor 中）

**触发时机**：在 experience-depositor 沉淀记忆过程中自动执行

**治理机制**：
- **语义搜索 + 关键词匹配双重验证**：使用 Cursor 语义搜索查找相似经验，结合关键词匹配进行综合判断
- **方案模式**：生成治理方案（建议的合并/取代动作），不执行，供用户确认
- **执行模式**：执行治理动作（备份索引、执行合并/替代、更新统一索引、清理备份），输出变更报告

**治理范围**：支持所有记忆类型（Experience/Tech/Business）的统一治理

**治理动作**：
- 合并：检测到相似记忆，建议合并
- 取代：检测到冲突记忆，建议取代

### 5. 记忆索引和匹配（memory-index）

**触发时机**：在执行 `/req`、`/plan 001`、`/build 001`、`/review 001` 等命令时自动激活

**匹配流程**：
1. 从命令参数推断任务编号和阶段
2. 读取对应的 req 文件作为匹配上下文
3. 读取统一索引 `memory/INDEX.md`，根据命令决定匹配范围：
   - `/init` → 只匹配 Experience 中 Level = team 的记忆（团队级标准和经验）
   - `/req`、`/plan`、`/build`、`/review` → 匹配所有维度（Experience/Tech/Business）
4. 只匹配 Status = `active` 的记忆（过滤 `deprecated`）
5. LLM 语义匹配：基于 Trigger、阶段、风险、信号进行跨维度匹配
6. 按需加载细节：仅在需要详细内容时，才加载对应的记忆文件

**匹配优先级**：
1. 命令匹配（最高优先级）：根据当前命令决定匹配范围
2. 文件匹配（中等优先级）：如果当前有打开文件，匹配文件相关的标准和经验
3. 语义匹配（最低优先级）：Trigger 匹配、Surface signal 匹配、Hidden risk 匹配

**跨维度匹配**：
- Experience：基于 Trigger、Surface signal、Hidden risk 匹配
- Tech：基于 Service、Trigger 匹配
- Business：基于 Topic、Trigger 匹配

**输出规则**（遵循静默成功原则）：
- 无匹配时：完全静默，不输出任何内容
- 有匹配时：仅输出关键信息（风险级别 + 指针），省略冗长的结构化格式

## 记忆存储结构

```
.cursor/.lingxi/memory/
├── INDEX.md                  # 统一索引（SSoT）
├── experience/                # 经验记忆
│   ├── team/                  # 团队级标准和经验
│   │   ├── standards/         # 团队级标准（强约束、执行底线）
│   │   │   └── EXP-*.md
│   │   └── knowledge/         # 团队级经验（复杂判断、认知触发）
│   │       └── EXP-*.md
│   └── project/               # 项目级经验
│       └── EXP-*.md
├── tech/                      # 技术记忆
│   └── services/              # 服务上下文
│       └── <service>.md
└── business/                  # 业务记忆
    ├── <topic>.md
    └── references/            # 业务上下文参考资料
        └── ...
```

## 统一索引格式

统一索引 `memory/INDEX.md` 包含三个表格：

### Experience（经验记忆）

| Tag | Type | Title | Trigger | Surface signal | Hidden risk | Status | Scope | Strength | Level | Replaces | ReplacedBy | File |

### Tech（技术记忆）

| Tag | Title | Service | Trigger | Status | File |

### Business（业务记忆）

| Tag | Title | Topic | Trigger | Status | File |

## 记忆文档格式

### Experience（经验记忆）

经验文档必须包含以下字段：

- **Decision Shape**（判断结构）：
  - Decision being made：正在做的决策
  - Alternatives rejected：被拒绝的备选方案
  - Discriminating signal：区分信号

- **Judgment Capsule**（认知蒸馏）：
  - I used to think：过去的想法
  - Now I believe：现在的信念
  - Because the decisive variable is：决定性变量

- **Trigger**：触发条件（何时应用此经验）
- **Surface signal**：表面信号（熟悉的风险味道）
- **Hidden risk**：隐藏风险（真正会出问题的点）

### Tech（技术记忆）

技术记忆文档包含：
- 服务定位（What / Why）
- 边界（Scope）
- 关键入口（Pointers）
- 依赖关系（Dependencies）
- 配置与开关（Config）
- 数据与模型（Data）
- 常见坑与排障（Troubleshooting）

### Business（业务记忆）

业务记忆文档包含：
- 业务定位（What / Why）
- 业务边界（Scope）
- 关键流程（Processes）
- 业务规则（Rules）
- 协作上下文（Collaboration）

## 关键原则

1. **人工门控**：记忆沉淀必须用户确认，禁止未确认写入记忆库
2. **SSoT**：统一索引 `memory/INDEX.md` 是所有记忆的单一事实来源，其他文件引用而非复制
3. **静默成功**：无匹配时完全静默，有匹配时仅输出关键信息
4. **分层加载**：先索引与概要，按需加载细节，避免 context rot
5. **统一治理**：所有记忆类型使用相同的匹配策略和治理机制

## 参考

- **记忆捕获**：`.cursor/skills/experience-capture/SKILL.md`
- **记忆索引**：`.cursor/skills/memory-index/SKILL.md`
- **记忆沉淀和治理**：`.cursor/skills/experience-depositor/SKILL.md`（包含治理功能）
- **服务上下文**：`.cursor/skills/service-loader/SKILL.md`
