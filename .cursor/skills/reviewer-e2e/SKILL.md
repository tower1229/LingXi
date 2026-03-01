---
name: reviewer-e2e
description: 端到端测试审查专家，使用 Cursor Agent Browser 工具验证完整用户流程。由 review-executor 显式调用，用于执行 E2E 测试审查。
---

# Reviewer E2E

由 review-executor 显式调用，可访问其上下文（req、testcase、应用启动配置等）。使用 Cursor Agent Browser（@browser + 自然语言）验证完整用户流程。

## Instructions

### 1. 读取输入

从 review-executor 的上下文中获取：
- req 文档路径（了解需要验证的用户流程）
- testcase 文档路径（获取 E2E 测试用例，如存在）
- 应用启动配置（端口、启动命令等）

### 2. 环境准备

- **检测服务器状态**：检查开发服务器是否在运行
  - 检测常见端口（3000, 3001, 8080, 5173 等）
  - 检查进程（如 `yarn dev`, `npm start` 等）
- **启动服务器**（如未运行）：
  - 检测项目启动命令（`yarn dev`, `npm start`, `yarn start` 等）
  - 执行启动命令
  - 等待服务器就绪（检测端口或健康检查，最多等待 30 秒）
- **验证浏览器工具可用性**：确认 Cursor Agent Browser 工具可用

### 3. E2E 测试执行（使用 Cursor Agent Browser 的自然语言方式）

**重要**：使用 `@browser` 指令 + 自然语言描述来执行测试，而不是显式调用工具方法。让 Agent 自动解析和执行测试步骤。

**执行流程**：

a. **激活浏览器工具**：
   - 在对话开始时使用 `@browser` 指令

b. **基于 testcase 文档生成测试指令**：
   - 读取 testcase 文档中的 E2E 测试用例（"## 4. 端到端测试用例"部分）
   - 解析每个测试用例的结构化字段：
     - 前置条件（服务器地址、测试数据、环境要求）
     - 测试步骤
     - 验证点（URL 变更、页面元素、文本匹配、网络请求、控制台检查、截图要求）
     - 响应式测试（如存在）
   - 将结构化步骤和验证点转换为自然语言描述
   - 使用官方风格的 prompt 格式

c. **执行测试场景**（示例转换方式）：

   对于 testcase 中的用例（新结构）：
   ```
   E2E-001: 用户登录流程
   - 测试步骤：
     1. 导航到 /login
     2. 输入邮箱：user@example.com
     3. 输入密码：password123
     4. 点击"登录"按钮
     5. 验证跳转到 /dashboard
   - 验证点：
     - URL 变更：/login → /dashboard
     - 页面元素：存在用户头像元素（.user-avatar）
     - 文本匹配：页面包含"欢迎"文本
     - 网络请求：POST /api/login 返回 200
     - 控制台检查：无 JavaScript 错误
     - 截图要求：登录后页面状态
   - 响应式测试：
     - 桌面端：1920x1080
     - 移动端：375x667
   ```

   转换为自然语言 prompt：
   ```
   @browser
   导航到 http://localhost:3000/login
   填写邮箱字段为 user@example.com
   填写密码字段为 password123
   点击"登录"按钮
   验证页面已跳转到 /dashboard
   检查是否显示用户头像元素（.user-avatar）
   验证页面包含"欢迎"文本
   监控网络请求，确认 POST /api/login 返回 200
   检查控制台中的 JavaScript 错误（应无错误）
   截图保存登录后页面状态
   切换到移动端视图（375x667）并验证响应式布局
   切换回桌面端视图（1920x1080）
   ```

d. **依次执行所有 E2E 测试用例**：
   - 对 testcase 文档中的每个 E2E 测试用例重复上述转换和执行流程
   - 记录每个测试场景的执行结果（通过/失败/跳过）

e. **验证结果**：
   - 检查页面状态（通过截图，如 testcase 中定义了截图要求）
   - 验证 URL 变更（如 testcase 中定义了 URL 变更验证点）
   - 验证页面元素存在（如 testcase 中定义了页面元素验证点）
   - 验证文本匹配（如 testcase 中定义了文本匹配验证点）
   - 验证网络请求（如 testcase 中定义了网络请求验证点）
   - 检查控制台错误（如 testcase 中定义了控制台检查验证点，有 JavaScript 错误时记录为问题）
   - 验证响应式布局（如 testcase 中定义了响应式测试，在不同屏幕尺寸下验证布局）

### 4. 识别 E2E 问题

- **功能缺陷**（Blockers/High）：
  - 关键流程无法完成
  - 页面无法加载
  - 交互无响应
  - JavaScript 错误导致功能失效
- **交互问题**（Medium/Low）：
  - UI 元素异常
  - 响应式设计问题（如适用）
  - 响应时间过长
  - 用户体验问题

### 5. 输出审查结果

- E2E 测试结果清单（按优先级分级：Blockers/High/Medium/Low）
- 测试场景执行状态（通过/失败/跳过）
- 失败场景的详细描述：
  - 失败步骤
  - 预期结果 vs 实际结果
  - 截图信息（Agent 自动保存的截图）
  - 控制台错误信息（如有）
- 建议修复方向

### 6. 降级处理

- **浏览器工具不可用**：
  - 标记为需要手动验证
  - 输出手动测试清单（基于 testcase 文档中的 E2E 用例）
  - 提供测试步骤和预期结果
- **服务器无法启动**：
  - 标记为需要环境准备
  - 输出环境配置建议
  - 记录启动命令和预期端口
- **工具调用次数限制**：
  - 记录已完成场景
  - 标记剩余场景需要继续测试
  - 在结果中标注"部分完成"

### 7. 输出与静默

遵循 [workflow-output-principles](.cursor/skills/about-lingxi/references/workflow-output-principles.md)；不干扰主流程，返回结构化审查结果，格式与其他 reviewer skills 一致。优先使用 `@browser` + 自然语言描述，让 Agent 解析执行；不显式调用底层工具方法；利用截图与控制台监控识别问题。
