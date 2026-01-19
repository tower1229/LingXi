---
name: write-doc
description: 此 Skill 用于编写/修改项目文档，确保文档的语言风格和文字审美取向一致。当用户需要创建新文档、修改现有文档、或需要确保文档风格一致性时激活。
---

# Write Doc

## Overview

此 Skill 帮助编写和修改项目文档，确保文档的语言风格和文字审美取向与项目风格保持一致。**自动引用 style-fusion 产出的风格画像进行模仿**。通过参考结构化的写作风格指导，确保文档风格的一致性。

## 工作流程

### 1. 理解任务

在开始编写/修改文档前，明确：

- **文档类型**：README、技术文档、使用指南、API 文档等
- **目标受众**：用户、维护者、开发者等
- **文档目的**：介绍项目、使用指南、技术细节等
- **现有内容**：是否需要修改现有文档，还是创建新文档

### 2. 加载风格画像

在编写前，必须读取 style-fusion 的风格画像（`.cursor/.lingxi/context/style-fusion/profile.json`）：

1. **检查风格画像是否存在**：如果存在且 `sample_count > 0`，则使用风格画像
2. **调用 style-fusion 引擎**：使用 `scripts/style-fusion-engine.js` 的 `getProfile()` 函数获取风格画像
3. **转换为写作指导**：将风格向量转换为具体的写作指导（见下方"风格画像转换规则"）

**注意**：
- 如果风格画像不存在或 `sample_count === 0`，提示用户先使用 style-fusion 分析项目文档生成风格画像
- 风格指导专注于语言风格和审美取向，不限制文档结构或内容组织方式

### 3. 分析现有文档（如适用）

如果修改现有文档，先分析：

- 当前文档的语言风格
- 与风格指南的差异
- 需要改进的地方（语言表达、格式、可读性）
- 需要保留的内容和结构

### 4. 编写/修改文档

按照风格指南编写或修改文档，重点关注：

#### 4.1 语言风格

- **简洁表达**：使用短句，直接表达核心内容
- **专业而温暖**：保持专业但不失亲和力
- **实用导向**：提供具体示例和使用方法

#### 4.2 视觉呈现

- **格式规范**：使用加粗、代码块、表格、列表等增强可读性
- **层次分明**：使用清晰的标题层级和适当的空行
- **易于扫描**：使用格式工具让内容易于快速浏览

#### 4.3 文字审美

- **精炼原则**：避免冗余，保持简洁有力
- **专业准确**：使用准确的技术术语，但不过度专业化
- **可读性**：信息密度适中，易于理解

### 5. 风格检查

完成编写后，使用检查清单验证：

- [ ] 语言是否简洁有力（短句、直接表达）
- [ ] 是否使用了适当的格式工具（加粗、代码块、表格等）
- [ ] 是否提供了具体示例（如适用）
- [ ] 是否易于扫描和理解
- [ ] 是否避免了冗余和重复
- [ ] 表达是否专业而温暖（不过度技术化）

### 6. 输出文档

- 直接写入目标文件
- 遵循"静默成功"原则：写入成功不输出确认信息，失败才输出错误

## 使用场景

### 场景 1：创建新文档

用户："帮我写一个 API 文档" 或 "创建一个使用指南"

**流程**：

1. 明确文档类型和目标受众
2. 根据文档类型和目标设计文档结构（不受风格指南限制）
3. 加载风格画像：读取 style-fusion 风格画像（`.cursor/.lingxi/context/style-fusion/profile.json`）
4. 将风格画像转换为写作指导
5. 按照风格指导编写内容（语言风格、格式、可读性）
6. 进行风格检查
7. 输出文档

### 场景 2：修改现有文档

用户："优化这个 README" 或 "改进文档的可读性"

**流程**：

1. 读取现有文档
2. 加载风格画像：读取 style-fusion 风格画像（`.cursor/.lingxi/context/style-fusion/profile.json`）
3. 将风格画像转换为写作指导
4. 分析现有文档的语言风格与风格指导的差异
5. 保留现有结构和内容，按风格指导优化语言表达和格式
6. 进行风格检查
7. 输出修改后的文档

### 场景 3：确保风格一致性

用户："检查这些文档的风格是否一致" 或 "让文档风格与 README 保持一致"

**流程**：

1. 读取目标文档
2. 加载风格画像：读取 style-fusion 风格画像（`.cursor/.lingxi/context/style-fusion/profile.json`）
3. 将风格画像转换为写作指导
4. 对比分析语言风格和审美取向的差异
5. 提出改进建议或直接修改（只修改风格，不改变结构）
6. 输出结果

## 风格画像转换规则

当使用 style-fusion 的风格画像时，需要将风格向量转换为具体的写作指导：

### 句式长度分布 (sentence_length)

- **短句为主**（short > 0.5）：使用短句（≤ 15 字），直接表达
- **中句为主**（medium > 0.5）：使用中句（16-30 字），平衡简洁与完整
- **长句为主**（long > 0.5）：使用长句（> 30 字），适合复杂表达
- **混合使用**：根据比例平衡使用不同长度的句子

### 逻辑模式 (logic_pattern)

- **演绎推理为主**（deductive > 0.5）：先提出观点/结论，再展开说明
- **归纳推理为主**（inductive > 0.5）：先举例/说明，再总结观点
- **对比分析为主**（contrast > 0.5）：通过对比、对照来阐述
- **叙事性为主**（narrative > 0.5）：按时间顺序或事件流程组织

### 情感强度 (emotion_intensity)

- **低情感**（< 0.3）：保持理性、克制，客观表达
- **中等情感**（0.3 - 0.7）：适度表达情感，保持平衡
- **高情感**（> 0.7）：可以表达较强的主观判断和情感色彩

### 词汇水平 (vocabulary_level)

- **casual**：使用日常用语，简单直接
- **professional**：使用专业术语适中，平衡易懂和专业
- **academic**：使用学术化表达，术语密集

### 结构偏好 (structure_preference)

- **linear**：线性结构，按顺序展开
- **hierarchical**：层次结构，使用标题、分段、列表等
- **nested**：嵌套结构，多层级嵌套

### 开头风格 (opening_style)

- **question**：以问题开头
- **statement**：以陈述句开头
- **context**：先提供背景/上下文
- **direct**：直接切入主题

### 结尾风格 (closing_style)

- **summary**：总结要点
- **reflection**：反思或展望
- **call_to_action**：行动号召
- **open**：开放式结尾，留下思考

### 转换示例

假设风格画像为：
```json
{
  "sentence_length": { "short": 0.3, "medium": 0.6, "long": 0.1 },
  "logic_pattern": { "deductive": 0.7, "inductive": 0.1, "contrast": 0.1, "narrative": 0.1 },
  "emotion_intensity": 0.18,
  "vocabulary_level": "professional",
  "structure_preference": "hierarchical",
  "opening_style": "direct",
  "closing_style": "open"
}
```

转换为写作指导：
```
**句式特征**：中句为主（60%），短句为辅（30%），长句较少（10%）

**思维方式**：演绎推理为主（70%），先提出观点再展开说明

**情感表达**：情感强度低（0.18），保持理性、克制，客观表达

**词汇水平**：专业术语适中，平衡易懂和专业

**结构偏好**：层次结构，使用标题、分段、列表等

**开头风格**：直接切入主题

**结尾风格**：开放式结尾，留下思考
```

## 风格画像来源

风格画像由 style-fusion skill 自动生成和维护，存储在 `.cursor/.lingxi/context/style-fusion/profile.json`。

如果风格画像不存在，建议先使用 style-fusion 分析项目文档（如 README.md）生成风格画像：

```
/style-fusion @README.md
```

## 技术实现

### 调用 style-fusion 引擎

在 Node.js 环境中，可以通过以下方式调用 style-fusion 引擎获取风格画像：

```javascript
const styleFusion = require('.cursor/skills/style-fusion/scripts/style-fusion-engine.js');

// 获取风格画像
const profileResult = styleFusion.getProfile();

if (profileResult.status === 'ok' && profileResult.payload.sample_count > 0) {
  const styleVector = profileResult.payload.style_vector;
  // 使用风格向量转换为写作指导
} else {
  // 风格画像不存在，提示用户先使用 style-fusion 生成风格画像
  throw new Error('风格画像不存在，请先使用 style-fusion 分析项目文档生成风格画像');
}
```

### 风格画像路径

风格画像存储在：`.cursor/.lingxi/context/style-fusion/profile.json`

如果文件不存在或 `sample_count === 0`，提示用户先使用 style-fusion 生成风格画像。

## 注意事项

1. **风格优先，结构灵活**：此 Skill 专注于语言风格和审美取向，不对文档结构、内容组织方式或具体内容做限制
2. **自动风格匹配**：优先使用 style-fusion 风格画像，确保文档风格与项目风格画像一致
3. **精炼原则**：避免冗余，保持简洁有力
4. **可读性**：使用格式工具增强可读性，但不要过度使用
5. **适度专业化**：在专业和易懂之间找到平衡
6. **静默成功**：文档写入成功时不输出确认信息
