---
name: questions-interaction
description: 灵犀内部统一可复用的交互式问询方法。在需要单选/多选（如 init、remember、记忆治理）时使用，约定 questions 工具的 options 格式（仅 label）、结果校验与重试/取消语义。
---

# Questions Interaction

## 目标

为高频 `questions` 交互提供统一协议，避免各处重复定义与语义漂移。该 Skill 仅负责“怎么问、怎么收敛结果”，不负责业务决策本身。

## 适用场景

- 需要单选/多选交互（如继续/跳过、写入策略、候选勾选）
- 需要统一异常处理（无选择、无效选择、取消、重试）

## 交互契约（统一）

1. 始终使用 `questions` 交互收集选择。
2. **`options` 仅使用 `label` 展示选项**，选项内容在 `label` 中直接表达（如「确认」「取消」或「选项1」「选项2」）。
3. `question` 写提问语，不重复列举选项内容。
4. 多选场景必须显式设置 `allow_multiple: true`。
5. 无有效选择时只重试当前问题，不回放整段流程。
6. 取消语义由业务方根据返回的 label 或选项顺序定义。

## 标准格式

### 模板 A：单选决策

```json
{
  "tool": "questions",
  "parameters": {
    "question": "请选择下一步",
    "options": [{ "label": "确认继续" }, { "label": "取消" }]
  }
}
```

### 模板 B：多选候选勾选

```json
{
  "tool": "questions",
  "parameters": {
    "question": "请选择候选项（可多选）",
    "options": [{ "label": "选项1" }, { "label": "选项2" }],
    "allow_multiple": true
  }
}
```

### 模板 C：治理确认（含查看对比）

```json
{
  "tool": "questions",
  "parameters": {
    "question": "治理方案待确认：是否执行？",
    "options": [
      { "label": "确认执行" },
      { "label": "取消" },
      { "label": "新建替代" },
      { "label": "查看对比" }
    ]
  }
}
```

## 结果处理规范

- **单选**：返回值为用户选中的 `label` 文本；若返回值不在当前 `options[].label` 内，提示“无效选择”并原问题重试。
- **多选**：返回值为选中的 `label` 文本列表；过滤无效值后若为空，提示“请至少选择一项”并原问题重试。
- **取消**：由业务方根据返回的 label 判断取消语义，不隐式改写为其他动作。
- **环境不支持 questions**：给出等价选项与 label 说明，并解析用户回复；是否允许文本兜底由业务方决定。

## 边界

- 本 Skill 不做记忆候选生成、不做治理判定、不做写入动作。
- 本 Skill 不定义领域术语，只定义交互协议与结果校验。
