# 安装脚本

本目录包含 LíngXī 的安装相关文件。

## 文件说明

- **`bash.sh`** - Linux/macOS/Git Bash 远程安装脚本
  - 直接从 GitHub 下载并安装到当前项目
  - 支持交互式和非交互式模式
  - 支持管道执行（`curl | bash`）

- **`powershell.ps1`** - Windows PowerShell 远程安装脚本
  - 适用于 Windows 环境
  - 直接从 GitHub 下载并安装

- **`install-manifest.json`** - 安装清单配置文件
  - 定义需要安装的所有文件列表
  - 包括 commands、skills、hooks（含 sessionStart 记忆注入脚本）、agents（Subagent lingxi-memory）等；rules 可为空

- **`test-install.sh`** - 本地测试脚本（开发用）
  - 用于本地测试安装脚本
  - 启动本地 HTTP 服务器模拟 GitHub 环境

## 使用方法

### 远程安装

**Linux/macOS/Git Bash:**
```bash
curl -fsSL https://raw.githubusercontent.com/tower1229/LingXi/main/install/bash.sh | bash
```

**Windows PowerShell:**
```powershell
irm https://raw.githubusercontent.com/tower1229/LingXi/main/install/powershell.ps1 | iex
```

### 本地测试（开发用）

```bash
# 在项目根目录运行
./install/test-install.sh [测试目录]
```

## 版本历史

- **v1.0.2** - 修复管道执行交互式输入问题，改进 JSON 解析，支持本地测试
- **v1.0.1** - 初始版本
