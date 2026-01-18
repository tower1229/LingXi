# Experience Index

> 这里存放"会让下次更快/更稳"的经验沉淀。每条经验必须包含：触发条件、解决方案、校验方式、关联指针。
>
> 重要：本索引的 Trigger 不仅用于检索，也用于“认知触发”。建议为每条经验补齐：
>
> - Surface signal：表层信号（我闻到了熟悉的风险味道）
> - Hidden risk：隐含风险（真正会出问题的点）

| Tag | Title | Trigger (when to load) | Surface signal | Hidden risk | Status | Scope | Strength | Replaces | ReplacedBy | File |
|---|---|---|---|---|---|---|---|---|---|---|
| command-design-separation | 低频命令应独立化，与高频命令分离 | 当需要设计新命令时，特别是需要判断是创建独立命令还是扩展现有命令的子命令时 | 需要设计新命令，不确定应该创建独立命令还是子命令 | 低频命令与高频命令混在一起会增加用户心智负担，导致命令系统复杂难用 | active | broad | hypothesis |  |  | `.cursor/.lingxi/context/experience/command-design-separation.md` |
| workflow-optimization-silent-success | Workflow 优化应遵循静默成功原则，但保留用户决策权 | 当需要优化 workflow 的输出行为，特别是需要判断哪些输出可以精简或静默时 | 需要优化 workflow 输出，不确定应该静默哪些输出、保留哪些输出 | 过度精简会侵犯用户决策权，用户需要完整信息才能做出判断 | active | broad | validated |  |  | `.cursor/.lingxi/context/experience/workflow-optimization-silent-success.md` |
| ai-native-design | AI Native 设计原则 - 依赖大模型自然语言理解能力 | 设计 workflow 功能、命令或 Skill 时，需要处理用户的自然语言输入，或考虑是否要添加规则匹配逻辑时 | 设计中出现关键词列表、正则表达式或复杂的规则匹配逻辑 | 用传统编程思维（硬编码规则）限制了大模型的理解能力，导致设计复杂且难以维护 | active | broad | validated |  |  | `.cursor/.lingxi/context/experience/ai-native-design.md` |

