# 文章风格参数抽取器 v2

## 任务

分析给定文本，提取其写作风格特征，输出结构化的风格向量。

## 风格维度定义

### 1. 句式长度分布 (sentence_length)

分析文本中短句、中句、长句的比例。

- **短句**：≤ 15 字（中文）或 ≤ 10 词（英文）
- **中句**：16-30 字（中文）或 11-25 词（英文）
- **长句**：> 30 字（中文）或 > 25 词（英文）

输出格式：`{ "short": 0.2, "medium": 0.6, "long": 0.2 }`（总和为 1.0）

### 2. 逻辑模式分布 (logic_pattern)

分析文本的主要逻辑组织方式。

- **deductive（演绎）**：从一般到具体，先提出观点再展开
- **inductive（归纳）**：从具体到一般，先举例再总结
- **contrast（对比）**：通过对比、对照来阐述
- **narrative（叙事）**：按时间顺序或事件流程组织

输出格式：`{ "deductive": 0.6, "inductive": 0.1, "contrast": 0.3, "narrative": 0.0 }`（总和为 1.0）

### 3. 情感强度 (emotion_intensity)

评估文本的情感表达强度。

- **范围**：0.0（完全理性、克制）到 1.0（强烈情感、主观）
- **判断依据**：
  - 情感词汇的使用频率和强度
  - 感叹号、问号的使用
  - 主观判断的表达频率
  - 语气词的运用

输出格式：`0.22`（数值，0-1）

### 4. 词汇水平 (vocabulary_level)

评估文本的词汇复杂度。

- **casual**：日常用语，简单直接
- **professional**：专业术语适中，平衡易懂和专业
- **academic**：学术化表达，术语密集

输出格式：`"professional"`（字符串）

### 5. 结构偏好 (structure_preference)

分析文本的组织结构方式。

- **linear**：线性结构，按顺序展开
- **hierarchical**：层次结构，使用标题、分段、列表等
- **nested**：嵌套结构，多层级嵌套

输出格式：`"hierarchical"`（字符串）

### 6. 开头风格 (opening_style)

分析文本开头的典型模式。

- **question**：以问题开头
- **statement**：以陈述句开头
- **context**：先提供背景/上下文
- **direct**：直接切入主题

输出格式：`"context"`（字符串）

### 7. 结尾风格 (closing_style)

分析文本结尾的典型模式。

- **summary**：总结要点
- **reflection**：反思或展望
- **call_to_action**：行动号召
- **open**：开放式结尾，留下思考

输出格式：`"summary"`（字符串）

### 8. 语气和语调 (tone_and_voice)

分析文本的语气特征和语态偏好。

- **formality（正式程度）**：0.0-1.0 数值
  - 0.0-0.3：非正式，口语化表达
  - 0.3-0.7：中等正式，专业但易懂
  - 0.7-1.0：高正式，书面化表达
- **person_usage（人称使用）**：分布类，总和为 1.0
  - **first_person**：第一人称（"我"、"我们"）
  - **second_person**：第二人称（"你"、"您"）
  - **third_person**：第三人称（"他"、"它"）
  - **neutral**：中性表达，避免人称
- **voice_preference（语态偏好）**：分类类
  - **active**：主动语态为主（"我们实现了功能"）
  - **passive**：被动语态为主（"功能被实现"）
  - **mixed**：混合使用，根据语境选择

输出格式：
```json
{
  "formality": 0.6,
  "person_usage": { "first_person": 0.3, "second_person": 0.2, "third_person": 0.3, "neutral": 0.2 },
  "voice_preference": "active"
}
```

### 9. 信息密度 (information_density)

评估文本的信息密度和详细程度。

- **density_level（信息密度）**：0.0-1.0 数值
  - 0.0-0.3：低密度，信息稀疏，留白较多
  - 0.3-0.7：中等密度，信息适中
  - 0.7-1.0：高密度，信息密集，内容充实
- **detail_level（详细程度）**：分类类
  - **overview**：概览性，提供总体框架
  - **moderate**：中等详细，平衡概述和细节
  - **detailed**：详细，提供具体细节和示例
  - **comprehensive**：全面，覆盖所有方面

输出格式：
```json
{
  "density_level": 0.65,
  "detail_level": "moderate"
}
```

### 10. 交互性 (interactivity)

分析文本的交互特征和支持元素。

- **interaction_style（交互风格）**：分布类，总和为 1.0
  - **question**：使用问题引导读者思考
  - **directive**：使用指令、命令式表达
  - **narrative**：叙事性，按事件流程描述
  - **dialogue**：对话式，模拟对话交流
- **supporting_elements（支持元素）**：分布类，总和为 1.0
  - **examples**：使用示例说明
  - **code**：包含代码片段
  - **diagrams**：使用图表、图示
  - **none**：不使用额外支持元素

输出格式：
```json
{
  "interaction_style": { "question": 0.2, "directive": 0.4, "narrative": 0.3, "dialogue": 0.1 },
  "supporting_elements": { "examples": 0.4, "code": 0.3, "diagrams": 0.2, "none": 0.1 }
}
```

## 提取指令

1. **仔细阅读文本**，理解其整体风格特征
2. **逐维度分析**，给出具体的数值或分类
3. **保持客观**，基于文本实际特征，而非主观偏好
4. **输出 JSON 格式**，确保所有维度都有值

## 输出格式

```json
{
  "sentence_length": {
    "short": 0.2,
    "medium": 0.6,
    "long": 0.2
  },
  "logic_pattern": {
    "deductive": 0.6,
    "inductive": 0.1,
    "contrast": 0.3,
    "narrative": 0.0
  },
  "emotion_intensity": 0.22,
  "vocabulary_level": "professional",
  "structure_preference": "hierarchical",
  "opening_style": "context",
  "closing_style": "summary",
  "tone_and_voice": {
    "formality": 0.6,
    "person_usage": { "first_person": 0.3, "second_person": 0.2, "third_person": 0.3, "neutral": 0.2 },
    "voice_preference": "active"
  },
  "information_density": {
    "density_level": 0.65,
    "detail_level": "moderate"
  },
  "interactivity": {
    "interaction_style": { "question": 0.2, "directive": 0.4, "narrative": 0.3, "dialogue": 0.1 },
    "supporting_elements": { "examples": 0.4, "code": 0.3, "diagrams": 0.2, "none": 0.1 }
  }
}
```

## 注意事项

1. **数值归一化**：所有分布类维度（sentence_length, logic_pattern, tone_and_voice.person_usage, interactivity.interaction_style, interactivity.supporting_elements）的总和必须为 1.0
2. **完整性**：必须输出所有 10 个维度，不能缺失
3. **准确性**：基于文本实际特征，不要猜测或推断
4. **一致性**：相同风格的文本应该得到相似的风格向量

## 示例

### 输入文本

```
## 快速开始

### 1) 开始一个需求

在 Cursor 输入：

/flow <一句话需求描述>

也可以继续已有需求或自动查找进行中的任务：

/flow REQ-xxx # 继续指定需求
/flow # 自动查找并继续进行中的任务
```

### 输出

```json
{
  "sentence_length": {
    "short": 0.4,
    "medium": 0.5,
    "long": 0.1
  },
  "logic_pattern": {
    "deductive": 0.3,
    "inductive": 0.0,
    "contrast": 0.0,
    "narrative": 0.7
  },
  "emotion_intensity": 0.15,
  "vocabulary_level": "professional",
  "structure_preference": "hierarchical",
  "opening_style": "direct",
  "closing_style": "open",
  "tone_and_voice": {
    "formality": 0.5,
    "person_usage": { "first_person": 0.0, "second_person": 0.0, "third_person": 0.0, "neutral": 1.0 },
    "voice_preference": "active"
  },
  "information_density": {
    "density_level": 0.6,
    "detail_level": "moderate"
  },
  "interactivity": {
    "interaction_style": { "question": 0.0, "directive": 0.8, "narrative": 0.2, "dialogue": 0.0 },
    "supporting_elements": { "examples": 0.3, "code": 0.4, "diagrams": 0.0, "none": 0.3 }
  }
}
```
