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
  "closing_style": "summary"
}
```

## 注意事项

1. **数值归一化**：所有分布类维度（sentence_length, logic_pattern）的总和必须为 1.0
2. **完整性**：必须输出所有 7 个维度，不能缺失
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
  "closing_style": "open"
}
```
