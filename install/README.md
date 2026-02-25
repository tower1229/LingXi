# 安装脚本

本目录包含 LíngXī（灵犀）的远程安装相关文件，用于在 Cursor 插件尚未上架时，通过脚本将灵犀安装到当前项目。

## 文件说明

- **`bash.sh`** — Linux / macOS / Git Bash 远程安装脚本  
  - 从 GitHub 下载并安装到当前项目  
  - 支持交互式和非交互式（`AUTO_CONFIRM=true`）  
  - 支持管道执行：`curl | bash`

- **`powershell.ps1`** — Windows PowerShell 远程安装脚本  
  - 适用于 Windows 环境  
  - 从 GitHub 下载并安装

- **`install-manifest.json`** — 安装清单  
  - 定义要安装的 commands、skills、hooks、agents、references 及 workflow 目录/模板/gitignore 条目

- **`test-install.sh`** — 本地测试脚本（开发用）  
  - 在仓库根目录启动 HTTP 服务，模拟远程源  
  - 使用 `BASE_URL=http://localhost:8000` 运行安装脚本

## 使用方法

### 远程安装

在**项目根目录**执行以下命令之一。

**Linux / macOS / Git Bash：**

```bash
curl -fsSL https://raw.githubusercontent.com/tower1229/LingXi/main/install/bash.sh | bash
```

**Windows PowerShell：**

```powershell
irm https://raw.githubusercontent.com/tower1229/LingXi/main/install/powershell.ps1 | iex
```

安装完成后，建议在 Cursor 中打开项目并运行 `/init` 初始化工作区。

### 本地测试（开发用）

在仓库根目录执行：

```bash
./install/test-install.sh [测试目录]
```

不指定测试目录时将使用临时目录。脚本会在仓库根启动 HTTP 服务，并在测试目录中执行安装。

## 版本

与主项目版本一致（当前 1.1.0）。
