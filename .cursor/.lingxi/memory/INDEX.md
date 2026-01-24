# Memory Index

> 统一记忆库索引（SSoT - Single Source of Truth）
>
> - 索引只存“最小元数据”，用于治理与快速定位
> - 真实内容在 `memory/notes/*.md`，用于语义检索与注入

## Memories

| Id | Kind | Title | When to load | Status | Strength | Scope | Supersedes | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MEM-ai-native-design | principle | AI Native：依赖大模型自然语言理解能力 | 你在设计 workflow / command / skill / rule，需要处理用户自然语言输入时；你想引入关键词/正则/复杂分支去“识别意图”或“辅助理解”时 | active | validated | broad |  | `memory/notes/MEM-ai-native-design.md` |
| MEM-silent-success | principle | 静默成功：没有消息就是好消息 | 你准备输出“成功确认/无匹配提示/过程汇报”这类非决策信息时；你在设计任何自动流程（检索、治理、校验、写入），需要控制噪声与 token 时 | active | validated | broad |  | `memory/notes/MEM-silent-success.md` |
| MEM-workflow-lifecycle | business | Workflow 生命周期（业务上下文） | 讨论灵犀工作流（req/plan/build/review）职责边界与阶段可跳过策略时；讨论记忆库（capture/curate/retrieve）的业务目的与门控原则时 | active | hypothesis | medium |  | `memory/notes/MEM-workflow-lifecycle.md` |
