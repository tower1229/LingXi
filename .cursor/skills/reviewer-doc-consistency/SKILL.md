---
name: reviewer-doc-consistency
description: 文档一致性审查专家，检查代码与文档是否一致。由 review-executor 显式调用，用于审查代码与 req、plan、testcase 文档的一致性。
---

# Reviewer Doc Consistency

## Instructions

此 Skill 由 `review-executor` 显式调用，负责执行文档一致性审查。可以访问 review-executor 的上下文，包括 req 文档、变更代码文件列表、plan/testcase 文档等。

### 1. 读取输入

从 review-executor 的上下文中获取：
- req 文档路径
- 变更代码文件列表
- plan/testcase 文档路径（如存在）

### 2. 文档一致性检查

- 检查代码与 req 文档的一致性（功能是否匹配）
- 检查接口文档是否与实现一致（如涉及 API）
- 检查架构文档是否与代码结构一致（如涉及架构变更）
- 检查 plan/testcase 文档是否与实现一致

### 3. 识别不一致问题

- 代码实现与任务文档不符
- 接口文档与实现不一致
- 架构文档与代码结构不一致

### 4. 输出审查结果

- 问题清单（按优先级分级：Blockers/High/Medium/Low）
- 具体问题描述和位置
- 建议修复方向

### 5. 静默返回结果

- 不干扰主流程
- 返回结构化审查结果

### 6. 降级处理

- **文档不存在**：
  - 标记为需要创建文档
  - 输出文档创建建议（基于代码实现）
- **文档格式无法解析**：
  - 标记为需要文档格式修复
  - 输出文档格式问题清单
