---
name: review-multi-dimension-subagents
overview: 为 review 阶段实现基于语义理解的选择性 subagents 多维审查机制，包括语义分析判断逻辑、显式触发机制和三个审查维度 subagents。
todos:
  - id: update-review-executor
    content: 更新 review-executor Skill，添加语义分析判断逻辑和显式触发 subagents 的机制
    status: completed
  - id: create-doc-consistency-subagent
    content: 创建 reviewer-doc-consistency subagent，实现文档一致性审查
    status: completed
  - id: create-security-subagent
    content: 创建 reviewer-security subagent，实现安全审查
    status: completed
  - id: create-performance-subagent
    content: 创建 reviewer-performance subagent，实现性能审查
    status: completed
  - id: update-review-command
    content: 更新 review.md 命令文档，说明选择性启用机制
    status: completed
  - id: test-and-validate
    content: 测试验证语义判断准确性、subagent 调用可靠性和结果汇总正确性
    status: completed
isProject: false
---

# Review 多维审查 Subagents 实施方案

## 目标

实现基于语义理解的选择性 subagents 多维审查机制：

- **文档一致性审查**：始终启用（所有任务都需要）
- **安全审查**：基于需求/实现语义判断是否启用
- **性能审查**：基于需求/实现语义判断是否启用

## 架构设计

### 执行流程

```
review-executor (主 Skill)
  ├─ 1. 读取输入（req、plan、testcase、代码）
  ├─ 2. 语义分析判断（启用决策）
  │   ├─ 文档一致性：始终启用 ✅
  │   ├─ 安全审查：语义判断 ✅/❌
  │   └─ 性能审查：语义判断 ✅/❌
  ├─ 3. 依次执行核心维度（必须）
  │   ├─ 功能审查
  │   ├─ 测试覆盖审查
  │   ├─ 架构审查
  │   ├─ 可维护性审查
  │   └─ 回归风险审查
  ├─ 4. 并行执行可选维度（显式触发 subagents）
  │   ├─ reviewer-doc-consistency (始终启用)
  │   ├─ reviewer-security (如语义判断需要)
  │   └─ reviewer-performance (如语义判断需要)
  └─ 5. 汇总结果生成 Review 文档
```

### 语义分析判断逻辑

**文档一致性审查**：

- 始终启用（基础质量要求）

**安全审查启用条件**（语义分析 req + 代码）：

- 用户输入处理（表单、搜索、文件上传等）
- 认证和授权功能（登录、权限控制、角色管理）
- 敏感数据处理（支付、个人信息、密码）
- API 接口暴露（外部接口、开放接口）
- 文件操作（文件上传/下载、路径操作）
- 数据库操作（SQL 查询、ORM 操作）

**性能审查启用条件**（语义分析 req + 代码）：

- 批量处理（批量导入、批量导出、批量计算）
- 实时响应要求（实时搜索、实时推送、实时更新）
- 高并发场景（多用户同时操作、高频请求）
- 大数据量处理（大量数据查询、大数据传输）
- 计算密集型任务（复杂计算、图像处理、算法优化）
- 资源敏感操作（内存占用、磁盘IO、网络传输）

**AI Native 原则**：

- 依赖 LLM 的语义理解能力，不进行关键词匹配
- 综合分析需求和实现，判断是否需要深入审查

## 实施方案

### Phase 1: 更新 review-executor Skill

**文件**：`.cursor/skills/review-executor/SKILL.md`

**变更内容**：

1. **添加步骤 2：审查维度智能启用**（在步骤 1 之后，步骤 3 之前）
```markdown
### 2. 审查维度智能启用

基于语义理解，判断哪些审查维度需要启用：

#### 2.1 文档一致性审查（始终启用）
- 所有任务都需要检查代码与文档一致性
- 使用 subagent 并行执行：`reviewer-doc-consistency`

#### 2.2 安全审查（语义判断启用）

**启用条件判断**：

1. 语义分析 req 文档内容：
   - 检查"功能需求"章节：是否涉及用户输入、认证、权限、敏感数据
   - 检查"API 规范"章节：是否暴露外部接口
   - 检查"技术方案"章节：是否涉及文件操作、数据库操作

2. 语义分析实现代码：
   - 扫描变更代码：是否包含 SQL 操作、用户输入处理、权限检查、文件操作等

3. 启用判断：
   - 如果需求或实现中包含安全相关特征 → 启用安全审查 (subagent: `reviewer-security`)
   - 否则 → 跳过安全审查

**AI Native 原则**：依赖 LLM 的语义理解能力，不进行关键词匹配。

#### 2.3 性能审查（语义判断启用）

**启用条件判断**：

1. 语义分析 req 文档内容：
   - 检查"功能需求"章节：是否涉及批量处理、实时响应、高并发、大数据量
   - 检查"成功标准"章节：是否有性能指标（响应时间、吞吐量等）
   - 检查"技术方案"章节：是否涉及性能优化、缓存、异步处理

2. 语义分析实现代码：
   - 扫描变更代码：是否包含循环遍历、数据库查询、缓存操作、异步处理等

3. 启用判断：
   - 如果需求或实现中包含性能敏感特征 → 启用性能审查 (subagent: `reviewer-performance`)
   - 否则 → 跳过性能审查

**AI Native 原则**：依赖 LLM 的语义理解能力，综合判断是否需要性能审查。

#### 2.4 启用决策汇总

记录启用决策结果：
- 文档一致性审查：✅ 启用 (subagent)
- 安全审查：✅/❌ (基于语义判断)
- 性能审查：✅/❌ (基于语义判断)
```

2. **修改步骤 5：多维度审查**（原步骤 5，重命名为"依次执行核心维度"）
```markdown
### 5. 依次执行核心维度（必须执行）

按顺序执行核心维度（必须执行），这些维度与主流程紧密耦合，共享上下文更高效：

#### 5.1 功能审查
#### 5.2 测试覆盖审查
#### 5.3 架构审查
#### 5.4 可维护性审查
#### 5.5 回归风险审查
```

3. **添加步骤 6：并行执行可选维度**（在步骤 5 之后）
```markdown
### 6. 并行执行可选维度（显式触发 subagents）

根据步骤 2 的启用决策，显式触发对应的 subagents：

#### 6.1 文档一致性审查（始终启用）

- 显式调用 `reviewer-doc-consistency` subagent 执行文档一致性审查
- 传入参数：req 文档路径、变更代码文件列表、plan/testcase 文档路径（如存在）
- 后台模式：不阻塞主流程

#### 6.2 安全审查（如语义判断需要）

- 如果步骤 2.2 的语义分析判断需要安全审查：
  - 显式调用 `reviewer-security` subagent 执行安全审查
  - 传入参数：req 文档路径、变更代码文件列表、重点关注的安全相关代码片段
  - 后台模式：不阻塞主流程
- 否则：跳过安全审查

#### 6.3 性能审查（如语义判断需要）

- 如果步骤 2.3 的语义分析判断需要性能审查：
  - 显式调用 `reviewer-performance` subagent 执行性能审查
  - 传入参数：req 文档路径、变更代码文件列表、性能相关代码片段
  - 后台模式：不阻塞主流程
- 否则：跳过性能审查

#### 6.4 等待所有 subagents 完成

- 等待所有启用的 subagents 完成执行
- 收集各 subagent 的审查结果
- 如果某个 subagent 调用失败或超时：
  - 记录降级原因
  - 回退到主流程依次执行该维度审查（不影响其他维度）
- 汇总为统一格式（Blockers/High/Medium/Low）
```

4. **修改步骤 6（原步骤 6）：Review 文档生成**（现为步骤 7）

- 更新文档模板，包含所有维度的审查结果（包括 subagents 的结果）

5. **修改步骤 7（原步骤 7）：审查结果处理**（现为步骤 8）

- 保持原有逻辑不变

### Phase 2: 创建文档一致性审查 Subagent

**文件**：`.cursor/agents/reviewer-doc-consistency.md`

**配置**：

```markdown
---
name: reviewer-doc-consistency
description: 执行文档一致性审查，检查代码与文档是否一致。在 review 阶段始终启用，由 review-executor 显式调用。
model: inherit
is_background: true
---

你是文档一致性审查助手，负责独立执行文档一致性审查。

职责：
1. 读取输入：
   - req 文档路径
   - 变更代码文件列表
   - plan/testcase 文档路径（如存在）

2. 文档一致性检查：
   - 检查代码与 req 文档的一致性（功能是否匹配）
   - 检查接口文档是否与实现一致（如涉及 API）
   - 检查架构文档是否与代码结构一致（如涉及架构变更）
   - 检查 plan/testcase 文档是否与实现一致

3. 识别不一致问题：
   - 代码实现与需求文档不符
   - 接口文档与实现不一致
   - 架构文档与代码结构不一致

4. 输出审查结果：
   - 问题清单（按优先级分级：Blockers/High/Medium/Low）
   - 具体问题描述和位置
   - 建议修复方向

5. 静默返回结果：
   - 不干扰主流程
   - 返回结构化审查结果
```

### Phase 3: 创建安全审查 Subagent

**文件**：`.cursor/agents/reviewer-security.md`

**配置**：

```markdown
---
name: reviewer-security
description: 执行安全审查，检查安全漏洞、注入风险、敏感信息暴露等。在 review 阶段根据需求语义分析结果显式调用。
model: inherit
is_background: true
---

你是安全审查助手，负责独立执行安全审查。

职责：
1. 读取输入：
   - req 文档路径（了解安全相关需求）
   - 变更代码文件列表
   - 重点关注的安全相关代码片段（如用户输入处理、认证逻辑等）

2. 安全风险扫描：
   - **注入风险**：SQL 注入、命令注入、XSS 等
   - **认证和授权**：密码存储、Token 管理、权限检查
   - **敏感信息暴露**：密钥硬编码、敏感数据泄露、日志泄露
   - **输入验证**：用户输入是否经过验证和清理
   - **文件操作**：文件上传/下载的安全性、路径遍历风险
   - **API 安全**：接口权限控制、请求频率限制、数据校验

3. 识别安全问题：
   - 安全漏洞（Blockers/High）
   - 安全风险（Medium/Low）
   - 最佳实践建议

4. 输出审查结果：
   - 安全问题清单（按优先级分级）
   - 具体问题描述和代码位置
   - 风险评估和建议修复方案

5. 静默返回结果：
   - 不干扰主流程
   - 返回结构化审查结果
```

### Phase 4: 创建性能审查 Subagent

**文件**：`.cursor/agents/reviewer-performance.md`

**配置**：

```markdown
---
name: reviewer-performance
description: 执行性能审查，检查性能瓶颈、内存泄漏风险、响应时间等。在 review 阶段根据需求语义分析结果显式调用。
model: inherit
is_background: true
---

你是性能审查助手，负责独立执行性能审查。

职责：
1. 读取输入：
   - req 文档路径（了解性能要求和成功标准）
   - 变更代码文件列表
   - 性能相关代码片段（如批量处理、数据库查询、异步处理等）

2. 性能风险扫描：
   - **性能瓶颈**：循环遍历、重复查询、未优化的算法
   - **内存泄漏风险**：资源未释放、事件监听器未移除、缓存未清理
   - **响应时间**：是否符合 req 中的性能要求
   - **资源使用**：CPU、内存、磁盘IO、网络传输是否合理
   - **并发处理**：并发控制是否合理、是否存在竞态条件
   - **数据库优化**：查询是否优化、索引是否合理、是否存在 N+1 查询

3. 识别性能问题：
   - 性能瓶颈（Blockers/High）
   - 性能风险（Medium/Low）
   - 优化建议

4. 输出审查结果：
   - 性能问题清单（按优先级分级）
   - 具体问题描述和代码位置
   - 性能影响评估和优化建议

5. 静默返回结果：
   - 不干扰主流程
   - 返回结构化审查结果
```

### Phase 5: 更新相关文档

1. **更新 review.md 命令文档**（`.cursor/commands/review.md`）

- 在"依赖的 Agent Skills"中添加：`reviewer-doc-consistency`, `reviewer-security`, `reviewer-performance` (如启用)
- 在执行逻辑中说明选择性启用的机制

2. **更新 workflow-optimizer 文档**（如需要）

- 在 `subagents-guide.md` 中添加 review 多维审查的应用案例

## 实施步骤

### 步骤 1：创建 Phase 1（更新 review-executor）

- 更新 `.cursor/skills/review-executor/SKILL.md`
- 添加语义分析判断逻辑
- 添加显式触发 subagents 的逻辑
- 更新步骤编号和流程

### 步骤 2：创建 Phase 2（文档一致性 subagent）

- 创建 `.cursor/agents/reviewer-doc-consistency.md`
- 定义审查职责和输出格式

### 步骤 3：创建 Phase 3（安全审查 subagent）

- 创建 `.cursor/agents/reviewer-security.md`
- 定义审查职责和输出格式

### 步骤 4：创建 Phase 4（性能审查 subagent）

- 创建 `.cursor/agents/reviewer-performance.md`
- 定义审查职责和输出格式

### 步骤 5：更新文档（Phase 5）

- 更新 `.cursor/commands/review.md`
- 测试和验证

## 注意事项

1. **显式触发机制**：不依赖可能不稳定的自动调用，在 review-executor 中明确指示调用
2. **降级方案**：如果 subagent 调用失败，回退到主流程依次执行，不影响其他维度
3. **AI Native 原则**：语义分析判断依赖 LLM 的语义理解能力，不进行关键词匹配
4. **向后兼容**：如果 subagent 功能不可用，回退到原有流程（依次执行所有维度）
5. **成本控制**：通过语义判断按需启用，避免不必要的 token 消耗

## 验证标准

1. 语义分析判断准确性：能正确识别需要安全/性能审查的任务
2. 显式触发可靠性：subagents 能被正确调用和执行
3. 结果汇总正确性：所有维度的审查结果能正确汇总到 Review 文档
4. 降级机制有效性：subagent 失败时能正确回退
5. 成本控制效果：简单任务不会启用不必要的审查维度