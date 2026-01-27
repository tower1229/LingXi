---
name: memory-capture
description: 尽力而为捕获对话中的“判断/取舍/边界/排障路径”，生成记忆候选（MEM-CANDIDATE）供用户选择写入。无候选静默。
---

# Memory Capture

## 核心原则

- **记忆的目的**：为了未来更好的检索与注入（不是为了分类本身）。
- **用户门控**：任何持久化写入必须经过用户确认（写入与治理由 `memory-curator` 负责）。
- **AI Native**：依赖语义理解，不做关键词/正则匹配。

## 触发机制（尽力而为）

当对话中出现以下信号时，尽力自动触发本 Skill：

- 判断与取舍：架构/方案选择、风险权衡、默认约束的确定
- 边界与约束：团队/项目约定、必须遵守的原则、禁忌操作
- 问题解决：定位路径、根因、修复策略、验证方式
- 用户确认：用户明确采纳/否决某个建议，并给出理由

也可通过命令手动触发（建议）：`/remember <一句话>` 或 `/remember capture`

## 去重机制（静默）

避免重复处理同一轮对话：

- key: `conversation_id + generation_id`
- 记录文件：`.cursor/.lingxi/workspace/processed-sessions.json`
- 若已处理：**完全静默**返回

## 候选模型：MEM-CANDIDATE

每条候选应尽量包含以下字段（越完整越利于检索/治理）：

```json
{
  "title": "一句话标题",
  "kind": "principle|heuristic|decision|pattern|business|tech|other",
  "audience": "team|project|personal",
  "portability": "cross-project|project-only",
  "source": "<packName>@<version>|manual|init",
  "tags": ["tag1", "tag2"],
  "whenToLoad": ["触发条件 1", "触发条件 2"],
  "oneLiner": "一句可执行提醒（用于注入）",
  "decision": "当时在判断什么（不是做了什么）",
  "signals": ["区分信号/可观测证据"],
  "alternatives": ["被拒绝的方案（可选）"],
  "counterSignals": ["什么时候不适用（可选）"],
  "pointers": ["相关文件/模块指针（可选）"],
  "recommendation": {
    "strength": "hypothesis|validated|enforced",
    "scope": "narrow|medium|broad"
  }
}
```

建议默认值（在无法判断时）：

- `audience=project`
- `portability=project-only`
- `source=manual`（若来自 `/init` 则为 `init`）

## 写入目标建议（project vs share）

当候选满足以下条件时，建议把该记忆沉淀为**跨项目复用资产**，写入共享目录（需人工门控确认）：

- `audience=team`
- `portability=cross-project`
- `recommendation.strength in [validated, enforced]`

建议输出中附带一条高信号提醒（示例）：

> 该候选符合团队共享条件，建议写入 `.cursor/.lingxi/memory/notes/share/`（share 是 git submodule 的硬约定目录）。如果你确认要共享，我会按该目标写入。

## 过滤规则（静默）

以下情况直接过滤，不展示：

- 只是知识解释（随手可查），不含项目判断
- 还未验证的猜测（没有 verify/信号支撑）
- 一次性细节（很难在未来复用、也不影响决策）

## 展示与用户选择（必须高信号）

若有候选，展示格式（示例）：

```markdown
## 记忆候选列表

### 候选 1：<title> [<kind>]

- **何时加载**：...
- **一句话提醒**：...
- **判断**：...
- **区分信号**：...
- **指针**：...

请选择要写入的候选编号：

- **全部**：`全部` 或 `all` 或 `All`
- **选择编号**：`1,3` 或 `1 3`（逗号或空格分隔）

我会进入治理与写入流程（合并优先、冲突否决），并更新 `memory/INDEX.md`。
```

**无候选**：完全静默。

## 输出规则（静默成功 + 最小高信号）

### 禁止的输出

- ❌ 不要输出"正在识别记忆候选..."、"分析对话内容..."等过程性描述
- ❌ 不要输出"委托给 memory-curator..."等委托过程描述（委托应静默进行）
- ❌ 不要输出中间步骤的工具调用信息（如"[2 tools called]"等）
- ❌ 不要输出去重检查的过程（已处理时完全静默）
- ✅ 只输出候选列表（如有）或完全静默（如无）
