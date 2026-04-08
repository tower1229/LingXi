# 安装脚本

本目录包含 LíngXī（灵犀）的远程安装相关文件。

这些脚本现在只安装受支持的 **Codex-native LingXi 2.0** 表层。

安装器会分发：

- `.codex-plugin/plugin.json`
- `skills/`
- `scripts/`
- `templates/`

安装完成后还会执行 `scripts/lingxi-setup.mjs`，生成运行时骨架：

- `.lingxi/`
- `.codex/agents/lingxi-session-distill.toml`

## 文件说明

- **`bash.sh`** — Linux / macOS / Git Bash 远程安装脚本
  - 从 GitHub 下载并安装到当前项目
  - 支持交互式和非交互式（`AUTO_CONFIRM=true`）
  - 支持管道执行：`curl | bash`

- **`powershell.ps1`** — Windows PowerShell 远程安装脚本
  - 适用于 Windows 环境
  - 从 GitHub 下载并安装

- **`install-manifest.json`** — 安装清单
  - 定义要安装的新版 2.0 静态资产、运行时生成路径和 package script；安装时会复制到用户项目 `install/install-manifest.json` 供卸载脚本读取。

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

安装完成后，建议直接在 Codex 中打开项目。

说明：安装器要求目标环境可用 `node`，因为 setup 和工作流脚本都基于 Node.js。

`node scripts/lingxi-setup.mjs` 只会生成项目内运行时和自动化配置文件，不会直接替你在 Codex 中注册自动化任务。

如果你的目标是单独验证 LingXi 2.0 的运行时骨架，应优先在目标仓库直接执行：

```bash
node scripts/lingxi-setup.mjs
```

如需把生成的 `.lingxi/setup/automation.session-distill.toml` 注册成实际的 Codex 自动化，请继续执行：

```bash
node scripts/lx-create-automation.mjs
```

或者：

```bash
npm run lx:create-automation
```

### 卸载

在**项目根目录**执行以下命令之一，可彻底清除灵犀核心文件与运行数据（任务、记忆库、工作区日志等），卸载后无残留。

- **直接执行 Node 脚本：**
  ```bash
  node scripts/lx-uninstall.mjs
  ```
- **yarn：**
  ```bash
  yarn lx:uninstall
  ```
- **npm：**
  ```bash
  npm run lx:uninstall
  ```

脚本会读取安装时保存的 `install/install-manifest.json`，仅删除清单内路径；未列入清单的仓库内容会保留。
非交互式环境（如 CI）下请加 `--yes` 跳过确认：`node scripts/lx-uninstall.mjs --yes`、`yarn lx:uninstall --yes` 或 `npm run lx:uninstall -- --yes`。

### 本地测试（开发用）

在仓库根目录执行：

```bash
./install/test-install.sh [测试目录]
```

不指定测试目录时将使用临时目录。脚本会在仓库根启动 HTTP 服务，并在测试目录中执行安装。

**安装 → 卸载集成验证**：本地或 CI 可运行 `./install/test-install-uninstall.sh [测试目录]`，先安装再执行 `lx:uninstall --yes` 并断言 `.lingxi`、`.codex-plugin/plugin.json` 与清单内路径已删除。

## 版本

与主项目版本一致（当前 2.0.0）。
