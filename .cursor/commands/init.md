# /init - 项目初始化命令

## 命令用途

引导式初始化 workflow 到新项目，快速建立项目上下文（技术栈、常用模式、开发规则、业务流程），并将这些信息沉淀到经验库（`.workflow/context/experience/`）、规则（`.cursor/rules/qs-*`）、业务上下文（`.workflow/context/business/`）和服务上下文（`.workflow/context/tech/services/`）中。

**设计原则**：
- **低频命令独立化**：init 作为低频命令（仅在项目初始化时使用），与高频的 `/flow` 命令分离，降低用户心智负担
- **引导式收集**：通过对话式引导收集项目信息，而非自动分析
- **人工确认**：所有沉淀操作需要用户确认，遵循 workflow 的"确认机制"

---

## 前置要求（必须）

- **Cursor Nightly**：本工作流依赖 Agent Skills（仅 Nightly 渠道可用）
- **项目已安装 workflow**：确保 `.workflow/` 目录结构已存在

---

## 依赖的 Agent Skills

- `service-loader`：生成服务上下文文档
- `experience-depositor`：沉淀经验到经验库
- `rules-creator`：创建质量规则（如需要）
- `context-engineering`：上下文工程指导

---

## 使用方式

```
/init
```

命令无需参数，通过对话式引导收集项目信息。

---

## 产物（必须写入）

- `.workflow/context/business/<topic>.md`（业务上下文文档，至少 1 个）
- `.workflow/context/tech/services/<service>.md`（服务上下文文档，如适用）
- `.workflow/context/experience/<tag>-<title>.md`（经验文档，如触发沉淀）
- `.workflow/context/session/pending-compounding-candidates.json`（经验候选暂存，如生成 EXP-CANDIDATE）
- `.workflow/context/experience/INDEX.md`（经验索引，如写入经验）
- `.cursor/rules/qs-*`（质量规则，如用户采纳质量准则建议）

---

## 执行要点

### 1) 引导式收集项目信息

通过对话式引导，分步骤收集以下信息：

#### 1.1 技术栈信息

- **编程语言**：项目使用的主要编程语言（如：TypeScript、Python、Go 等）
- **框架/库**：主要使用的框架和库（如：React、Express、Django 等）
- **数据库**：使用的数据库类型（如：PostgreSQL、MySQL、MongoDB 等）
- **其他技术栈**：其他重要的技术组件（如：Redis、消息队列、配置中心等）

#### 1.2 项目结构信息

- **项目类型**：前端项目、后端项目、全栈项目、工具库等
- **目录结构**：主要目录和模块的组织方式
- **入口文件**：项目的主要入口文件

#### 1.3 开发规范信息

- **代码规范**：代码风格、命名约定、文件组织方式
- **测试规范**：测试框架、测试组织方式
- **提交规范**：Git 提交信息格式、分支策略
- **文档规范**：文档组织方式、API 文档位置

#### 1.4 业务流程信息（如适用）

- **核心业务领域**：项目涉及的主要业务领域
- **关键业务流程**：主要的业务流程（简要描述）
- **业务规则**：重要的业务规则和约束

#### 1.5 服务/模块信息（如适用）

- **服务列表**：项目包含的主要服务/模块
- **服务职责**：每个服务的主要职责
- **服务依赖**：服务之间的依赖关系

### 2) 生成上下文文档

根据收集的信息，生成相应的上下文文档：

#### 2.1 业务上下文文档

- 使用 [Business Context 模板](../../.workflow/context/business/references/business-context-template.md) 创建业务上下文文档
- 至少生成 1 个业务上下文文档示例
- 文档应包含：业务定位、边界、流程、规则、协作、FAQ

#### 2.2 服务上下文文档（如适用）

- 使用 `service-loader` 生成服务上下文文档
- 如果项目有多个服务/模块，可以生成多个服务上下文文档
- 文档应包含：服务定位、边界、入口、依赖、配置、数据、常见坑

### 3) 识别并输出经验候选

在初始化过程中，识别可沉淀的知识点，输出 EXP-CANDIDATE：

- **技术栈选择理由**：为什么选择某个技术栈
- **架构决策**：重要的架构决策和取舍
- **开发规范**：项目特定的开发规范
- **常见坑点**：项目中的常见问题和解决方案

输出格式：

```html
<!-- EXP-CANDIDATE
{
  "stage": "init",
  "trigger": "当在新项目中使用 workflow 时",
  "decision": "技术栈/架构/规范的取舍",
  "alternatives": ["备选方案（放弃，因为...）"],
  "signal": "判断依据/风险信号",
  "solution": "最终选择的技术栈/架构/规范",
  "verify": "如何验证这一选择",
  "pointers": ["path/to/file 或相关文档"],
  "notes": "可选补充"
}
-->
```

### 4) 生成初始化报告

初始化完成后，输出初始化报告，包含：

- **生成的文档列表**：所有生成的上下文文档路径
- **识别的经验候选**：所有 EXP-CANDIDATE 的摘要
- **待确认项**：需要用户确认的经验候选（通过 `/flow 沉淀 ...` 确认）
- **后续建议**：后续如何使用 workflow 的建议

---

## 执行流程

### 阶段 1：信息收集

1. 引导用户提供技术栈信息
2. 引导用户提供项目结构信息
3. 引导用户提供开发规范信息
4. 引导用户提供业务流程信息（如适用）
5. 引导用户提供服务/模块信息（如适用）

### 阶段 2：文档生成

1. 生成业务上下文文档（至少 1 个）
2. 生成服务上下文文档（如适用）
3. 输出经验候选（EXP-CANDIDATE）

### 阶段 3：确认与沉淀

1. 展示识别的经验候选
2. 提示用户执行 `/flow 沉淀 ...` 确认沉淀
3. 生成初始化报告

---

## 输出要求

- 必须生成至少 1 个业务上下文文档
- 必须输出初始化报告
- 如果识别到可沉淀知识点，必须输出 EXP-CANDIDATE
- 最后用 3-6 行简短说明：生成了哪些文档、识别了哪些经验候选、下一步操作建议

---

## 与 `/flow` 的区别

| 维度 | `/init` | `/flow` |
|-----|---------|---------|
| **使用频率** | 低频（仅项目初始化时） | 高频（日常需求推进） |
| **使用场景** | 项目初始化、上下文建立 | 需求全生命周期推进 |
| **产物** | 上下文文档、经验候选 | 需求三件套、经验沉淀 |
| **用户交互** | 引导式收集项目信息 | 需求推进、阶段流转 |

两者互补，不冲突。

---

## 示例场景

### 场景 1：前端项目初始化

```
用户：/init
AI：开始项目初始化，请提供以下信息：
1. 项目使用的主要技术栈（如：React、TypeScript、Vite）
2. 项目的目录结构（如：src/components、src/services）
3. 开发规范（如：ESLint 配置、代码风格）
...

AI：（收集信息后）
- 生成业务上下文文档：`.workflow/context/business/frontend-project.md`
- 输出经验候选：技术栈选择理由、开发规范等
- 生成初始化报告
```

### 场景 2：全栈项目初始化

```
用户：/init
AI：开始项目初始化，请提供以下信息：
...

AI：（收集信息后）
- 生成业务上下文文档：`.workflow/context/business/user-management.md`
- 生成服务上下文文档：`.workflow/context/tech/services/user-service.md`
- 输出经验候选：架构决策、服务边界等
- 生成初始化报告
```

---

## 参考

- [Business Context 模板](../../.workflow/context/business/references/business-context-template.md) - 业务上下文模板规范
- [Service Loader SKILL.md](../.cursor/skills/service-loader/SKILL.md) - 服务上下文加载机制
- [Experience Depositor SKILL.md](../.cursor/skills/experience-depositor/SKILL.md) - 经验沉淀机制
- [Flow 命令](./flow.md) - 主工作流命令
