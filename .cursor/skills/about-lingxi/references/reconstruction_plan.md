# 灵犀（LingXi）文档重构与体系化规划

基于 `architecture.md` 确立的 **AgentOS 四层架构** 骨架，本计划旨在重构整个 `about-lingxi/references/` 目录，将其打造为一套从顶层设计、核心机制到工程方案的详实文档库。

## 🎯 最终目标
形成一个**结构化、去冗余、强关联**的文档生态，使开发者和 AI 模型能够通过“骨架 -> 血肉 -> 羽毛”的路径快速掌握灵犀全貌。

---

## 🏗️ 第一阶段：核心骨架与心智模型 (The Core)

| 文档名称 | 状态 | 重写/规划要点 | 对应层级 |
| :--- | :--- | :--- | :--- |
| **`architecture.md`** | ✅ 已完成 | 系统顶层四层架构解释 (调度/执行/记忆/守护) | 全局 |
| **`core-values.md`** | 📅 待优化 | 明确灵犀的 **Why** (心有灵犀、AI Native、称心如意) 与上述架构的关系。 | 全局 |
| **`design-principles.md`** | 📅 待优化 | 提炼设计准则（如：状态文件化、主从完全解耦、后置闭环语义）。 | 调度层 |

## 🧠 第二阶段：机制与协议 (The Blood & Flesh)

主要描述系统是如何“运作”的，以及组件间交流的“语言”。

| 文档名称 | 状态 | 重写/规划要点 | 对应层级 |
| :--- | :--- | :--- | :--- |
| **`memory-system.md`** | 📅 需重写 | 详述情节记忆 (HOT_RAM/TRACE) vs 语义记忆 (USER/Memory) 的运作机理及记忆固化流程。 | 记忆层 |
| **`ipc-protocols.md`** | 📅 需重写 | 统一定义 HOT_RAM 结构、Execution Summary 契约、Megaprompt 组装标准。 | 记忆/执行层 |
| **`lifecycle-flow.md`** | ✨ 新增 | 详细展开 Tiers (1/2/3) 决策树及“三段夹层式”生命周期的每一步技术细节。 | 调度层 |

## 🛠️ 第三阶段：组件与工程实现 (The Feathers)

主要描述具体的工具实现、工程边界和调优指导。

| 文档名称 | 状态 | 重写/规划要点 | 对应层级 |
| :--- | :--- | :--- | :--- |
| **`component-guides.md`** | 📅 需重写 | 解释 Commands、Skills、Hooks、Subagents 在 AgentOS 下的具体实现角色。 | 执行/守护层 |
| **`engineering-practices.md`** | 📅 待优化 | 收敛心跳 (Watchdog)、自动提炼、并发安全等具体工程实现规范。 | 守护层 |
| **`cursor-agent-tools.md`** | 📅 待优化 | 灵犀如何调用/扩展 Cursor 原生能力 (如 read_file vs fast-path)。 | 执行层 |

## 📏 第四阶段：评估与调优 (The Radar)

| 文档名称 | 状态 | 重写/规划要点 |
| :--- | :--- | :--- |
| **`evaluation-criteria.md`** | 📅 待优化 | 架构合理性、价值对齐、工程一致性的评估清单。 |
| **`optimization-guide.md`** | 🔄 合并 | 将目前的 checklist 整合为针对不同层级的性能与效果调优指南。 |

---

## 📝 待执行动作清单
1. [ ] 更新 `SKILL.md` 中的文档引用路径（将 `architecture-blueprint.md` 指向 `architecture.md`）。
2. [ ] 按照阶段顺序，依次启动文档的重写任务。
3. [ ] 每一篇文档末尾建立“关联导航”，增强文档间的连接性。
