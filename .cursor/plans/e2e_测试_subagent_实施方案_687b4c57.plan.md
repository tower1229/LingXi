---
name: E2E 测试 Subagent 实施方案
overview: 基于 Cursor Agent Browser 实现 E2E 测试 subagent，使用官方风格的 @browser + 自然语言描述方式，在 review 阶段按需启用。
todos:
  - id: create-e2e-subagent
    content: 创建 reviewer-e2e.md subagent 文件，实现基于 @browser + 自然语言的 E2E 测试执行逻辑
    status: completed
  - id: update-review-executor-semantic
    content: 在 review-executor Skill 中增加 E2E 测试维度的语义判断逻辑（步骤 2.4）
    status: completed
  - id: update-review-executor-call
    content: 在 review-executor Skill 中增加调用 reviewer-e2e subagent 的逻辑（步骤 7.4）
    status: completed
  - id: update-review-template
    content: 更新 Review 文档模板，增加 E2E 测试审查部分和测试执行结果表格
    status: completed
  - id: update-testcase-template
    content: 扩展 testcase 文档模板，增加端到端测试用例部分（可选，阶段 3）
    status: completed
isProject: false
---

# E2E 测试 Subagent 实施方案

## 目标

在灵犀 workflow 中增加基于 Cursor Agent Browser 的端到端测试能力，通过 subagent 方式实现，与其他审查维度（安全、性能）保持一致。

## 架构设计

### 组件关系

```
review-executor (Skill)
  ├─ 语义判断：是否需要 E2E 测试？
  ├─ 显式调用 reviewer-e2e (Subagent)
  └─ 收集结果并写入 review 文档

reviewer-e2e (Subagent)
  ├─ 读取 testcase 文档中的 E2E 用例
  ├─ 环境准备（检测/启动服务器）
  ├─ 使用 @browser + 自然语言执行测试
  └─ 返回结构化审查结果
```

## 实施步骤

### 阶段 1：创建 E2E 测试 Subagent

**文件**：`.cursor/agents/reviewer-e2e.md`

**内容要点**：

- Frontmatter：`name: reviewer-e2e`, `model: inherit`, `is_background: true`
- 职责说明：环境准备、测试执行、结果验证
- **关键设计**：使用 `@browser` + 自然语言描述方式，而非显式调用工具方法
- 输入：req 文档路径、testcase 文档路径、应用启动配置
- 输出：结构化审查结果（Blockers/High/Medium/Low）

**执行逻辑**：

1. 读取 testcase 文档，提取 E2E 测试用例
2. 检测/启动开发服务器
3. 将测试步骤转换为自然语言 prompt（使用 `@browser` 指令）
4. Agent 自动解析并执行浏览器操作
5. 验证结果，识别问题
6. 返回结构化审查结果

### 阶段 2：更新 review-executor Skill

**文件**：`.cursor/skills/review-executor/SKILL.md`

#### 2.1 增加 E2E 测试维度的语义判断

**位置**：步骤 2.4（在性能审查之后）

**判断逻辑**：

- 语义分析 req 文档：是否涉及前端用户交互流程、关键业务流程、多页面交互
- 语义分析代码变更：是否包含 UI 组件、路由、表单交互、页面跳转
- 启用条件：如果包含 E2E 测试特征 → 启用 `reviewer-e2e` subagent

**AI Native 原则**：依赖 LLM 语义理解，不进行关键词匹配

#### 2.2 更新启用决策汇总

**位置**：步骤 2.4 末尾

增加：

```
- E2E 测试审查：✅/❌ (基于语义判断)
```

#### 2.3 增加调用 reviewer-e2e 的逻辑

**位置**：步骤 7.4（在性能审查之后）**

增加：

```
#### 7.4 E2E 测试审查（如语义判断需要）

- 如果步骤 2.4 的语义分析判断需要 E2E 测试：
  - 显式调用 `reviewer-e2e` subagent 执行 E2E 测试审查
  - 传入参数：req 文档路径、testcase 文档路径（如存在）、应用启动配置
  - 后台模式：不阻塞主流程
- 否则：跳过 E2E 测试审查
```

#### 2.4 更新 Review 文档模板

**位置**：步骤 8（Review 文档模板）

在"多维度审查结果"部分增加：

```markdown
### 9. E2E 测试审查

- Blockers:
- High:
- Medium:
- Low:

**E2E 测试执行结果**：

| 测试场景 | 状态 | 备注 |
|---------|------|------|
| E2E-001: 用户登录流程 | ✅ 通过 | - |
| E2E-002: 数据提交流程 | ❌ 失败 | 步骤 3 点击提交按钮无响应 |
```

在"测试覆盖报告"部分的"测试执行结果"表格中增加：

```markdown
| 端到端测试 | X | 0 | 0 |
```

### 阶段 3：扩展 testcase 文档模板（可选）

**文件**：`.cursor/skills/plan-executor/SKILL.md`

**位置**：步骤 12（Testcase 文档模板）

在"## 3. 集成测试用例"之后增加：

```markdown
## 4. 端到端测试用例（如适用）

### E2E-001: <测试场景名称>
- **场景描述**：简要描述要验证的用户流程
- **前置条件**：
  - 服务器运行在：`http://localhost:3000`
  - 测试数据准备：...
- **测试步骤**：
  1. 导航到 `/login`
  2. 输入邮箱：`user@example.com`
  3. 输入密码：`password123`
  4. 点击"登录"按钮
  5. 验证跳转到 `/dashboard`
- **验证点**：
  - URL 变更：`/login` → `/dashboard`
  - 页面元素：存在用户头像元素（`.user-avatar`）
  - 文本匹配：页面包含"欢迎"文本
  - 网络请求：POST `/api/login` 返回 200
- **预期结果**：用户成功登录，跳转到仪表盘页面

---

## 5. 测试数据准备（更新编号）
```

**注意**：需要同步更新后续章节的编号（原"## 4. 测试数据准备"改为"## 5. 测试数据准备"）

## 关键技术点

### 1. 官方风格的自然语言 prompt

Subagent 内部将 testcase 文档中的结构化测试步骤转换为：

```
@browser
导航到 http://localhost:3000/login
填写邮箱字段为 user@example.com
填写密码字段为 password123
点击"登录"按钮
验证页面已跳转到 /dashboard，检查是否显示用户信息
截图保存当前页面状态
监控控制台中的 JavaScript 错误
```

### 2. 环境准备逻辑

- 检测服务器状态（检查端口或进程）
- 自动启动服务器（如未运行）
- 等待服务器就绪（健康检查）

### 3. 降级方案

- 浏览器工具不可用 → 输出手动测试清单
- 服务器无法启动 → 标记需要环境准备
- 工具调用次数限制 → 记录进度，提示继续

## 文件清单

### 新建文件

- `.cursor/agents/reviewer-e2e.md` - E2E 测试审查 subagent

### 修改文件

- `.cursor/skills/review-executor/SKILL.md` - 增加 E2E 测试维度
- `.cursor/skills/plan-executor/SKILL.md` - 扩展 testcase 模板（可选）

## 验证要点

1. **语义判断准确性**：能正确识别需要 E2E 测试的场景
2. **Subagent 调用**：review-executor 能正确调用 reviewer-e2e
3. **测试执行**：使用 @browser + 自然语言能正确执行测试
4. **结果收集**：审查结果能正确汇总到 review 文档
5. **降级处理**：浏览器工具不可用时能优雅降级

## 注意事项

1. **AI Native 原则**：使用自然语言描述，让 Agent 自主解析，不硬编码工具调用
2. **按需启用**：通过语义判断选择性启用，避免不必要的执行
3. **后台模式**：使用 `is_background: true`，不阻塞主流程
4. **结构化输出**：与其他 subagents 保持一致的输出格式
5. **文档一致性**：确保 testcase 和 review 文档的 E2E 部分格式一致