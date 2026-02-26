---
name: ask-questions
description: 灵犀内部统一可复用的交互式问询方法。在需要单选/多选（如 init、remember、记忆治理）时使用，统一 questions/answers 协议、结果校验与重试/取消语义。
---

# Ask Questions

## 目标

为高频 ask-questions 交互提供统一协议，避免各处重复定义与语义漂移。该 Skill 仅负责“怎么问、怎么收敛结果”，不负责业务决策本身。

## 适用场景

- 需要单选/多选交互（如继续/跳过、写入策略、候选勾选）
- 需要统一异常处理（无选择、无效选择、取消、重试）

## 交互契约（统一）

1. 始终使用 ask-questions 交互收集选择。
2. 输入统一使用 `questions[]`，每题必须有稳定的 `question_id`。
3. 每个选项必须使用 `{ "id": "...", "label": "..." }`；业务判断只依赖 `id`，`label` 仅用于展示。
4. 多选场景必须显式设置 `allow_multiple: true`。
5. 无有效选择时只重试当前问题，不回放整段流程。
6. 取消语义由显式选项 id 定义（如 `cancel`、`skip`），不依赖选项顺序。

## 标准格式

### 输入模板（单题/多题统一）

```json
{
  "questions": [
    {
      "question_id": "next_step",
      "question": "请选择下一步",
      "options": [
        { "id": "continue", "label": "确认继续" },
        { "id": "cancel", "label": "取消" }
      ]
    }
  ]
}
```

### 输入模板（多选）

```json
{
  "questions": [
    {
      "question_id": "pick_candidates",
      "question": "请选择候选项（可多选）",
      "allow_multiple": true,
      "options": [
        { "id": "candidate_1", "label": "选项1" },
        { "id": "candidate_2", "label": "选项2" }
      ]
    }
  ]
}
```

### 输入模板（连续多问）

```json
{
  "questions": [
    {
      "question_id": "question1",
      "question": "请选择第一个问题",
      "allow_multiple": true,
      "options": [
        { "id": "question1_a", "label": "选项1-1" },
        { "id": "question1_b", "label": "选项1-2" }
      ]
    },
    {
      "question_id": "question2",
      "question": "请选择第二个问题",
      "options": [
        { "id": "question2_a", "label": "选项2-1" },
        { "id": "question2_b", "label": "选项2-2" }
      ]
    }
  ]
}
```

### 输出模板（最小返回）

#### answered

```json
{
  "status": "answered",
  "answers": [
    {
      "question_id": "question1",
      "selected_option_ids": ["question1_a", "question1_b"]
    },
    {
      "question_id": "question2",
      "selected_option_ids": ["question2_b"]
    }
  ]
}
```

#### cancelled

```json
{
  "status": "cancelled",
  "answers": [],
  "cancelled_by": {
    "question_id": "question1",
    "option_id": "cancel"
  }
}
```

#### aborted

```json
{
  "status": "aborted",
  "answers": []
}
```

## 结果处理规范

- **单选**：`selected_option_ids` 长度必须为 1，且 id 必须在当前题 `options[].id` 内，否则判定无效并原题重试。
- **多选**：`selected_option_ids` 可为多个；过滤无效 id 后若为空，提示“请至少选择一项”并原题重试。
- **取消**：由业务方根据返回的 `option_id` 判断取消语义，不隐式改写。
- **文本兜底**：环境不支持 ask-questions UI 时，按同一题输出等价选项，并允许用户输入编号 / option id / label 片段；内部必须归一化为 `selected_option_ids` 后再返回。

## 边界

- 本 Skill 不做记忆候选生成、不做治理判定、不做写入动作。
- 本 Skill 不定义领域术语，只定义交互协议与结果校验。
