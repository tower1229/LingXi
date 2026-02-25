---
name: questions-interaction
description: Standardizes questions-based interactive selection for workflows like remember, init, and memory governance. Use when building single-select or multi-select choices, validating selections, and handling retries/cancel behavior with consistent option value contracts.
---

# Questions Interaction

## 目标

为高频 `questions` 交互提供统一协议，避免各处重复定义与语义漂移。该 Skill 仅负责“怎么问、怎么收敛结果”，不负责业务决策本身。

## 适用场景

- 需要单选/多选交互（如继续/跳过、写入策略、候选勾选）
- 需要稳定 `value` 约定（避免把展示文本当主键）
- 需要统一异常处理（无选择、无效选择、取消、重试）

## 交互契约（统一）

1. 始终使用 `questions` 交互收集选择。
2. `options[].value` 必须是稳定标识，不使用自然语言句子或序号文本作为主键。
3. 多选场景必须显式设置 `allow_multiple: true`。
4. 无有效选择时只重试当前问题，不回放整段流程。
5. 取消语义由业务方定义，但必须有明确 `cancel` 值。

## 标准值命名

- 策略/动作类：`confirm`、`cancel`、`skip`、`all`、`partial`、`supplement`、`deep_dive`
- 候选选择类：`cand_<n>`（如 `cand_1`、`cand_2`）

## 标准模板

### 模板 A：单选决策

```json
{
  "tool": "questions",
  "parameters": {
    "question": "请选择下一步",
    "options": [
      { "label": "确认执行", "value": "confirm" },
      { "label": "取消", "value": "cancel" }
    ]
  }
}
```

### 模板 B：多选候选勾选

```json
{
  "tool": "questions",
  "parameters": {
    "question": "请选择候选项",
    "options": [
      { "label": "候选 1：<标题>", "value": "cand_1" },
      { "label": "候选 2：<标题>", "value": "cand_2" }
    ],
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
      { "label": "确认执行", "value": "confirm" },
      { "label": "取消", "value": "cancel" },
      { "label": "改为新增", "value": "new_instead" },
      { "label": "查看对比", "value": "show_diff" }
    ]
  }
}
```

## 结果处理规范

- **单选**：若返回值不在 `options[].value` 内，提示“无效选择”并原问题重试。
- **多选**：过滤无效值后若为空，提示“请至少选择一项”并原问题重试。
- **取消**：返回业务方定义的取消结果，不隐式改写为其他动作。
- **环境不支持 questions**：给出等价动作与重试建议；是否允许文本兜底由业务方决定。

## 边界

- 本 Skill 不做记忆候选生成、不做治理判定、不做写入动作。
- 本 Skill 不定义领域术语，只定义交互协议与结果校验。
