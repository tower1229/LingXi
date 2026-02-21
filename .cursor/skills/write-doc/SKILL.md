---
name: write-doc
description: 此 Skill 用于编写/修改项目文档，确保文档的语言风格和文字审美取向一致。当用户需要创建新文档、修改现有文档、或需要确保文档风格一致性时激活。
---

# Write Doc

## Overview

此 Skill 帮助编写和修改项目文档，确保文档的语言风格和文字审美取向与项目风格保持一致。**自动调用 style-fusion 的 `generatePrompt` 函数生成风格化写作 prompt**，确保文档风格的一致性。

## 工作流程

### 1. 理解任务

在开始编写/修改文档前，明确：

- **文档类型**：README、技术文档、使用指南、API 文档等
- **目标受众**：用户、维护者、开发者等
- **文档目的**：介绍项目、使用指南、技术细节等
- **现有内容**：是否需要修改现有文档，还是创建新文档

### 2. 生成风格 prompt

在编写前，必须生成风格化的写作 prompt：

1. **调用 style-fusion 引擎**：使用 `scripts/style-fusion-engine.js` 的 `generatePrompt(topic)` 函数
   ```javascript
   const styleFusion = require('.cursor/skills/style-fusion/scripts/style-fusion-engine.js');
   const promptResult = styleFusion.generatePrompt(topic);

   if (promptResult.status === 'ok') {
     const stylePrompt = promptResult.payload.prompt;
     // 将 stylePrompt 作为系统提示词或添加到用户消息的上下文中
   } else {
     // 处理错误
     if (promptResult.error.includes('样本数为 0')) {
       throw new Error('风格画像不存在，请先使用 style-fusion 分析项目文档：\n/style-fusion @README.md');
     } else {
       throw new Error(`生成风格 prompt 失败：${promptResult.error}`);
     }
   }
   ```

2. **确定 topic**：
   - 创建新文档：使用文档标题或主要主题
   - 修改现有文档：使用文档的主要主题
   - 如果无法确定，传入空字符串（`''`），prompt 将不包含主题行

3. **使用生成的 prompt**：将生成的 markdown prompt 直接作为写作指导，无需任何转换

**注意**：
- 如果 `generatePrompt` 返回错误，提示用户先使用 style-fusion 生成风格画像
- 生成的 prompt 包含所有 10 个维度的风格指导，直接使用即可
- 风格指导专注于语言风格和审美取向，不限制文档结构或内容组织方式

### 3. 分析现有文档（如适用）

如果修改现有文档，先分析：

- 当前文档的语言风格
- 与风格指南的差异
- 需要改进的地方（语言表达、格式、可读性）
- 需要保留的内容和结构

### 4. 编写/修改文档

按照生成的风格 prompt 编写或修改文档：

1. **将 prompt 作为写作指导**：
   - 将 `generatePrompt` 生成的 markdown prompt 作为系统提示词或添加到用户消息的上下文中
   - LLM 会自动按照 prompt 中的风格指导进行写作

2. **重点关注**（prompt 中已包含，此处作为补充说明）：
   - **语言风格**：遵循 prompt 中的句式特征、情感表达、词汇水平等
   - **视觉呈现**：使用加粗、代码块、表格、列表等增强可读性
   - **文字审美**：保持精炼、专业、可读

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
- 输出遵循 [workflow-output-principles](.cursor/skills/about-lingxi/references/workflow-output-principles.md)（写入成功不输出确认信息，失败才输出错误）

## 使用场景

### 场景 1：创建新文档

用户："帮我写一个 API 文档" 或 "创建一个使用指南"

**流程**：

1. 明确文档类型和目标受众
2. 根据文档类型和目标设计文档结构（不受风格指南限制）
3. 生成风格 prompt：调用 `generatePrompt(文档主题)`
4. 按照生成的 prompt 编写内容（将 prompt 作为系统提示词或上下文）
5. 进行风格检查
6. 输出文档

### 场景 2：修改现有文档

用户："优化这个 README" 或 "改进文档的可读性"

**流程**：

1. 读取现有文档
2. 生成风格 prompt：调用 `generatePrompt(文档主题)`
3. 分析现有文档的语言风格与生成的 prompt 的差异
4. 保留现有结构和内容，按 prompt 优化语言表达和格式
5. 进行风格检查
6. 输出修改后的文档

### 场景 3：确保风格一致性

用户："检查这些文档的风格是否一致" 或 "让文档风格与 README 保持一致"

**流程**：

1. 读取目标文档
2. 生成风格 prompt：调用 `generatePrompt(文档主题)`
3. 对比分析文档与生成的 prompt 的风格差异
4. 提出改进建议或直接修改（只修改风格，不改变结构）
5. 输出结果


## 风格 prompt 来源

风格 prompt 由 style-fusion skill 的 `generatePrompt` 函数自动生成，基于存储在 `.cursor/.lingxi/style-fusion/profile.json` 的风格画像。

如果风格画像不存在或样本数为 0，请先使用 style-fusion 分析项目文档生成风格画像：

```
/style-fusion @README.md
```

## 技术实现

### 调用 style-fusion 引擎生成 prompt

在 Node.js 环境中，通过以下方式调用 style-fusion 引擎生成风格 prompt：

```javascript
const styleFusion = require('.cursor/skills/style-fusion/scripts/style-fusion-engine.js');

// 生成风格 prompt（推荐方式）
const promptResult = styleFusion.generatePrompt('文档主题或空字符串');

if (promptResult.status === 'ok') {
  const stylePrompt = promptResult.payload.prompt;
  // 直接使用 stylePrompt 作为写作指导
  // 可以将 prompt 作为系统提示词或添加到用户消息的上下文中
} else {
  // 处理错误
  if (promptResult.error.includes('样本数为 0')) {
    console.error('风格画像不存在，请先使用 style-fusion 分析项目文档：');
    console.error('/style-fusion @README.md');
  } else {
    console.error('生成风格 prompt 失败：', promptResult.error);
  }
}
```

### 风格画像路径

风格画像存储在：`.cursor/.lingxi/style-fusion/profile.json`

`generatePrompt` 函数会自动读取该文件并生成格式化的 prompt。如果文件不存在或 `sample_count === 0`，函数会返回错误。

## 注意事项

1. **风格优先，结构灵活**：此 Skill 专注于语言风格和审美取向，不对文档结构、内容组织方式或具体内容做限制
2. **自动风格匹配**：使用 `generatePrompt` 自动生成风格 prompt，确保文档风格与项目风格画像一致
3. **直接使用 prompt**：生成的 prompt 已包含所有风格指导，无需任何转换或额外处理
4. **错误处理**：如果风格画像不存在，提示用户先使用 style-fusion 生成风格画像
5. **输出与静默**：遵循 workflow-output-principles
