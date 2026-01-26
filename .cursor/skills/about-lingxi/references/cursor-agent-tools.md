# Cursor Agent 工具参考

## 概述

本文档基于 [Cursor 官方文档](https://cursor.com/docs/agent/overview) 整理 Agent 内置工具（Tools）的作用与适用场景，供灵犀开发时参考。Tools 是 Agent 的基础模块，用于搜索代码库与网络、编辑文件、运行终端命令等；单次任务中工具调用无上限。灵犀的 Skills、Commands 在设计实现逻辑时，应合理依赖或规避这些能力，避免与官方能力重叠或冲突。

## 工具一览

| 工具                         | 主要作用                             | 典型用法                             |
| ---------------------------- | ------------------------------------ | ------------------------------------ |
| **Semantic search**          | 按语义在代码库中查找实现、逻辑、模式 | 自然语言提问（如「认证逻辑在哪？」） |
| **Search files and folders** | 按路径、文件名查找文件与目录         | 精确匹配、路径级检索                 |
| **Web**                      | 在网络上检索信息                     | 查文档、教程、最新 API               |
| **Fetch Rules**              | 加载并遵循配置的 Rules               | 确保风格、规范、技术栈约束           |
| **Read files**               | 读取工作区文件内容                   | 查看源码、配置、文档                 |
| **Edit files**               | 修改、新增、删除代码与文件           | 实现重构、修 bug、加功能             |
| **Run shell commands**       | 在终端执行命令（含沙箱与审批策略）   | 安装依赖、跑脚本、测试、构建         |
| **Browser**                  | 控制浏览器进行操作与调试             | 测试 Web、设计转代码、无障碍检查     |
| **Image generation**         | 按描述生成图像                       | UI 草图、示意图、配图                |
| **Ask questions**            | 向用户提问以澄清或确认               | 需求含糊、多种实现可选时             |

## 各工具说明

### Semantic search（语义搜索）

- **作用**：按**语义/概念**在代码库中找代码，而非单纯字符串匹配。
- **机制**：工作区 → 分块 → AI 向量化 → 向量库；查询时向量化后做相似度检索。与 grep 配合使用：grep 做精确匹配，语义搜索做概念匹配。
- **注意**：索引完成约 80% 后可用；默认排除 `.gitignore` / `.cursorignore` 等。
- **参考**：[Semantic Search](https://cursor.com/docs/context/semantic-search)

### Search files and folders（搜索文件与文件夹）

- **作用**：按路径、文件名、目录结构在项目中查找文件和文件夹。
- **与语义搜索**：常与 Semantic search 配合使用。

### Web

- **作用**：在网络上检索信息（文档、教程、最新 API 等），为回答补充实时、外部信息。

### Fetch Rules（获取规则）

- **作用**：读取并应用配置的 **Rules**（项目规则、全局规则等），使 Agent 按规范与偏好行动。

### Read files / Edit files（读取与编辑文件）

- **作用**：从工作区读取指定文件内容；对工作区文件进行增删改。
- **典型**：查看源码与配置；实现重构、修 bug、加功能等代码变更。

### Run shell commands（运行 Shell 命令）

- **作用**：在终端中执行 shell 命令（如安装依赖、跑脚本、测试、构建等）。
- **特性**：macOS / Linux 支持**沙箱**（默认限制文件与网络访问）；可配置 Auto-Run（沙箱 / 每次询问 / 全部自动）、网络访问、Git 写操作、删除文件等；支持**命令白名单**。可用 `Ctrl+C` 或 Skip 中断。
- **参考**：[Terminal](https://cursor.com/docs/agent/terminal)

### Browser（浏览器）

- **作用**：控制浏览器进行导航、点击、输入、滚动、截图、查看 Console 与网络请求等；含 **Design sidebar** 做布局、尺寸、颜色等可视化调整，并可「应用到代码」。
- **典型场景**：测试 Web 应用、无障碍（WCAG）检查、设计转代码、视觉回归测试。Cookie、localStorage、IndexedDB 等按工作区持久化。
- **安全**：默认需逐项审批；可配置白名单/黑名单；企业版可做 MCP、来源等限制。
- **参考**：[Browser](https://cursor.com/docs/agent/browser)

### Image generation（图像生成）

- **作用**：根据描述生成图片（如 UI 草图、示意图、配图等）。

### Ask questions（提问）

- **作用**：在对话中向用户发起提问，用于澄清需求、确认方案、选择实现方式等。

## 工具调用机制（概要）

- 每个工具具备：**名称**、**描述**（何时/如何使用）、**参数**（所需输入）。
- 工具定义与结果均消耗 token；对话中大量使用工具会更快占满上下文并增加成本。
- **MCP（Model Context Protocol）** 可扩展更多工具（如 Figma、Linear、数据库、自建 API 等），与内置工具并存。
- **参考**：[Tool Calling](https://cursor.com/learn/tool-calling)

## 灵犀开发中的使用建议

- **技术边界检查**：设计新功能或改动时，若涉及「Agent 能做什么」，应结合本文档与 [component-guides](component-guides.md) 做边界判断；避免假设 Agent 具备文档未列出的能力，或忽略既有工具带来的约束。
- **能力选型**：实现 Skills、Commands 时，优先考虑复用内置工具（如 Semantic search、Web、Run shell commands、Browser）而非重复造轮子；需要专有协议或外部系统时再考虑 MCP。
- **安全与审批**：涉及终端、浏览器、文件删除等敏感操作时，留意 Cursor 的沙箱、白名单与审批配置，并在灵犀的规则或 Skills 说明中提示用户合理配置。
- **文档更新**：官方工具与策略可能随 Cursor 版本更新；若发现与本文档不一致，应以官方文档为准，并酌情更新本参考。

## 外部参考

- [Agent Overview](https://cursor.com/docs/agent/overview)
- [Tool Calling](https://cursor.com/learn/tool-calling)
- [Semantic Search](https://cursor.com/docs/context/semantic-search)
- [Terminal](https://cursor.com/docs/agent/terminal)
- [Browser](https://cursor.com/docs/agent/browser)

可通过 `mcp_web_fetch` 等工具获取上述文档的实时内容，用于验证或补充本参考。
