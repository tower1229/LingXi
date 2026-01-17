# Hooks 技术指南

## 概述

基于 Cursor 官方文档的 Hooks 功能用法和最佳实践。

## 设计目标（官方定义）

- 通过自定义脚本**观察、控制和扩展 agent 循环**
- 在 agent 循环中定义的各阶段之前或之后运行
- 允许运行时自定义 agent 行为

## 能力边界（官方定义）

### 技术特性

- **配置文件**：`hooks.json` 文件，可放置在项目级（`.cursor/hooks.json`）或全局（`~/.cursor/hooks.json`）
- **脚本语言**：Node.js 或其他可执行脚本
- **触发时机**：在 agent 循环的特定阶段之前或之后
- **同步执行**：脚本执行会阻塞主流程（必须快速执行）

### Agent Hooks（官方定义）

1. **`beforeShellExecution`**：执行 shell 命令前触发
2. **`afterShellExecution`**：执行 shell 命令后触发
3. **`beforeMCPExecution`**：执行 MCP 工具前触发
4. **`afterMCPExecution`**：执行 MCP 工具后触发
5. **`beforeReadFile`**：读取文件前触发
6. **`afterFileEdit`**：编辑文件后触发
7. **`beforeSubmitPrompt`**：提交提示前触发
8. **`afterAgentResponse`**：Agent 生成响应后触发
9. **`afterAgentThought`**：Agent 处理思考后触发
10. **`stop`**：Agent 任务结束时触发

### 配置格式（官方定义）

```json
{
  "version": 1,
  "hooks": {
    "hookName": [
      {
        "command": "path/to/your/script.sh"
      }
    ]
  }
}
```

### 适用场景（官方建议）

- ✅ **输入门控**（`beforeSubmitPrompt`）：校验 prompt 格式
- ✅ **命令拦截**（`beforeShellExecution`）：阻止危险命令
- ✅ **自动归档**（`stop`）：对话结束时自动归档
- ✅ **审计日志**（`afterShellExecution`、`afterAgentResponse`）：记录命令执行和响应
- ✅ **Git 集成**（`afterFileEdit`、`stop`）：自动提交和分支管理
- ✅ **格式化**（`afterFileEdit`）：编辑后运行代码格式化工具
- ✅ **安全检查**（`beforeSubmitPrompt`、`beforeShellExecution`）：扫描敏感信息、阻止高风险操作

### 不适合的场景（官方建议）

- ❌ **复杂的业务逻辑**（应在 Skills 中）
- ❌ **需要 AI 推理的任务**（应在 Skills 或 Subagents 中）
- ❌ **长时间运行的任务**（会阻塞主流程）

### 限制（官方定义）

- 需要编写脚本（Node.js 或其他可执行脚本）
- 有性能开销（每次触发都会执行）
- 错误处理需要谨慎（避免阻塞主流程）
- 脚本必须可执行且有必要的权限

## 选择指南（基于能力边界）

### Hook vs Skill

**选择 Hook**：

- 纯脚本执行（无需 AI 推理）
- 自动化、门控、审计
- 低开销（脚本执行快速）
- 需要拦截或观察 agent 行为

**选择 Skill**：

- 需要 AI 推理和判断
- 需要专业知识和工作流
- 需要用户交互

### Hook vs Rule

**选择 Hook**：

- 需要运行时行为控制
- 需要拦截或观察 agent 行为
- 需要自动化（如格式化、归档）

**选择 Rule**：

- 需要系统级约束（持久化、可重用）
- 需要作用于提示级别
- 需要 Always Apply（全局硬约束）

### Hook vs Subagent

**选择 Hook**：

- 需要拦截或观察 agent 行为
- 需要自动化（如格式化、归档）
- 需要低开销（脚本执行快速）

**选择 Subagent**：

- 需要 AI 推理和判断
- 需要独立上下文窗口
- 需要长时间运行的任务

## 最佳实践（官方建议）

1. **Fail Fast**：在早期阶段拦截无效输入，避免无效执行
2. **低开销**：Hook 脚本应该快速执行，不阻塞主流程
3. **错误处理**：Hook 出错时默认放行，避免阻塞主流程
4. **自动化友好**：Hook 应该自动化友好，无需用户干预

## 参考

- Cursor Hooks 官方文档：`https://cursor.com/cn/docs/agent/hooks`
- Cursor 能力分析：`docs/05-development/research/cursor-capabilities-analysis.md`
