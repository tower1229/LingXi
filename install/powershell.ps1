# LíngXī 远程安装脚本 (Windows PowerShell)
# 直接从 GitHub 下载并安装到当前项目
# Version: 1.2.0

# 配置
$RepoOwner = "tower1229"
$RepoName = "LingXi"
$Branch = "main"
if ($env:BASE_URL) {
  $BaseUrl = $env:BASE_URL.TrimEnd('/')
} else {
  $BaseUrl = "https://raw.githubusercontent.com/${RepoOwner}/${RepoName}/${Branch}"
}

# 设置错误处理
$ErrorActionPreference = "Stop"

# 自动确认选项（通过环境变量控制）
$AutoConfirm = $env:AUTO_CONFIRM -eq "true" -or $env:AUTO_CONFIRM -eq "1" -or $env:AUTO_CONFIRM -eq "yes"

# 颜色输出函数
function Write-Info {
  param([string]$Message)
  Write-Host "ℹ " -NoNewline -ForegroundColor Cyan
  Write-Host $Message
}

function Write-Success {
  param([string]$Message)
  Write-Host "✓ " -NoNewline -ForegroundColor Green
  Write-Host $Message
}

function Write-Warning {
  param([string]$Message)
  Write-Host "⚠ " -NoNewline -ForegroundColor Yellow
  Write-Host $Message
}

function Write-Error {
  param([string]$Message)
  Write-Host "✗ " -NoNewline -ForegroundColor Red
  Write-Host $Message
}

# 下载文件函数（带重试机制，与旧版 8879793 一致命名）
function Download-File {
  param(
    [string]$RemotePath,
    [string]$LocalPath,
    [int]$MaxRetries = 3
  )
  # 旧版写法：URL 直接拼接，不在此处 -replace（避免正则 \ 报错）；调用方保证 RemotePath 仅含 /
  $url = "${BaseUrl}/${RemotePath}"
  $dir = Split-Path -Parent $LocalPath
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  $retryCount = 0
  while ($retryCount -lt $MaxRetries) {
    try {
      Invoke-WebRequest -Uri $url -OutFile $LocalPath -UseBasicParsing -ErrorAction Stop
      return $true
    } catch {
      $retryCount++
      if ($retryCount -lt $MaxRetries) {
        Write-Warning "Download failed, retrying ($retryCount/$MaxRetries)..."
        Start-Sleep -Seconds 1
      } else {
        Write-Error "Download failed: $url (retried $MaxRetries times)"
        Write-Error $_.Exception.Message
        return $false
      }
    }
  }
  return $false
}

function Download-ManifestFileGroup {
  param(
    [string]$GroupKey,
    [string]$Label
  )
  $items = $Manifest.$GroupKey
  if (-not $items -or $items.Count -eq 0) {
    Write-Warning "No $Label found in manifest key: $GroupKey"
    return
  }

  $count = 0
  foreach ($filePath in $items) {
    $remotePath = $filePath.Replace('\', '/')
    $localFile = $filePath.Replace('/', '\')
    if (-not (Download-File $remotePath $localFile)) {
      Write-Error "Failed to install $Label file: $filePath"
      exit 1
    }
    $count++
  }
  Write-Success "$Label downloaded ($count files)"
}

# 读取安装清单（从 GitHub 下载）
function Load-Manifest {
  $manifestUrl = "${BaseUrl}/install/install-manifest.json"
  Write-Info "Downloading install manifest..."

  try {
    $manifestContent = Invoke-WebRequest -Uri $manifestUrl -UseBasicParsing -ErrorAction Stop | Select-Object -ExpandProperty Content
    return $manifestContent | ConvertFrom-Json
  } catch {
    Write-Error "Failed to download install manifest: $manifestUrl"
    Write-Error $_.Exception.Message
    exit 1
  }
}

# 加载清单
$Manifest = Load-Manifest

Write-Info "Installing LingXi..."
Write-Info "Source: ${RepoOwner}/${RepoName}"

# 检查目标目录是否存在
$CursorExists = Test-Path ".cursor"
$LingxiExists = Test-Path ".lingxi"

if ($CursorExists) {
  Write-Warning ".cursor already exists"
}

if ($LingxiExists) {
  Write-Warning ".lingxi already exists"
}

# 询问是否继续（合并安装模式）
if ($CursorExists -or $LingxiExists) {
  if ($AutoConfirm) {
    $response = "y"
    Write-Info "Auto-confirm enabled: merge install mode"
  } else {
    Write-Host ""
    Write-Info "Existing .cursor data detected. Merge install mode:"
    Write-Info " - Keep your non-LingXi files"
    Write-Info " - Overwrite LingXi files to latest version"
    Write-Host ""
    $response = Read-Host "Continue? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
      Write-Info "Install cancelled"
      exit 0
    }
  }
}

# 创建目录结构
Write-Info "Preparing directories..."
New-Item -ItemType Directory -Force -Path "hooks" | Out-Null
New-Item -ItemType Directory -Force -Path "heartbeat-plugins" | Out-Null
New-Item -ItemType Directory -Force -Path ".cursor" | Out-Null
New-Item -ItemType Directory -Force -Path ".claude" | Out-Null
New-Item -ItemType Directory -Force -Path "scripts" | Out-Null
New-Item -ItemType Directory -Force -Path "assets" | Out-Null

Write-Info "Downloading Cursor files..."
Download-ManifestFileGroup -GroupKey "cursorFiles" -Label "Cursor files"

Write-Info "Downloading Claude files..."
Download-ManifestFileGroup -GroupKey "claudeFiles" -Label "Claude files"

Write-Info "Downloading shared runtime files..."
Download-ManifestFileGroup -GroupKey "sharedFiles" -Label "shared files"

# 将安装清单保存到用户项目，供卸载脚本读取
New-Item -ItemType Directory -Force -Path "install" | Out-Null
$Manifest | ConvertTo-Json -Depth 100 | Set-Content -Path "install\install-manifest.json" -Encoding UTF8
Write-Success "Saved manifest to install/install-manifest.json"

# 合并 packageScripts 到用户 package.json
if ((Test-Path "package.json") -and $Manifest.packageScripts) {
  $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
  if (-not $pkg.scripts) { $pkg | Add-Member -MemberType NoteProperty -Name scripts -Value @{} }
  foreach ($key in $Manifest.packageScripts.PSObject.Properties.Name) {
    $pkg.scripts | Add-Member -MemberType NoteProperty -Name $key -Value $Manifest.packageScripts.$key -Force
  }
  $pkg | ConvertTo-Json -Depth 100 | Set-Content -Path "package.json" -Encoding UTF8
  Write-Success "Merged lx scripts into package.json"
}

# 使用 workspace-bootstrap 初始化 .lingxi/（基于模板创建空白 INDEX 与模板文件）
Write-Info "Bootstrapping .lingxi..."
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
  $bootstrapScript = $Manifest.bootstrap.script
  if (-not $bootstrapScript) { $bootstrapScript = ".cursor/skills/workspace-bootstrap/scripts/workspace-bootstrap.mjs" }
  $bootstrapScript = $bootstrapScript.Replace('/', '\')
  & node $bootstrapScript
  if ($LASTEXITCODE -ne 0) {
    Write-Error "workspace-bootstrap failed"
    exit 1
  }
  Write-Success "Workspace bootstrap completed"
} else {
  Write-Info "Node.js not found; using manifest fallback"
  foreach ($dir in $Manifest.workflowDirectories) {
    $winPath = $dir.Replace('/', '\')
    New-Item -ItemType Directory -Force -Path $winPath | Out-Null
  }
  $indexDefault = $Manifest.bootstrap.indexTemplate
  if (-not $indexDefault) { $indexDefault = ".cursor/skills/workspace-bootstrap/references/INDEX.default.md" }
  $indexDefault = $indexDefault.Replace('/', '\')
  if (Test-Path $indexDefault) {
    $indexTarget = ".lingxi\memory\INDEX.md"
    New-Item -ItemType Directory -Force -Path (Split-Path $indexTarget) | Out-Null
    Copy-Item -Path $indexDefault -Destination $indexTarget -Force
    Write-Success "Workspace bootstrap completed (no Node.js mode)"
  } else {
    Write-Error "Template file missing; ensure skills were downloaded"
    exit 1
  }
}

# 为 share 目录创建 .gitkeep 文件
$ShareDir = ".lingxi\memory\share"
if ((Test-Path $ShareDir) -and -not (Test-Path "$ShareDir\.gitkeep")) {
  @"
# Share Directory
#
# 此目录用于存放可跨项目复用的团队级记忆（推荐作为 git submodule）
#
# 使用方式：
# 1. 添加 share 仓库（submodule）：
# git submodule add <shareRepoUrl> .lingxi/memory/share
#
# 2. 更新 share 仓库：
# git submodule update --remote --merge
#
# 3. 同步记忆索引（新增共享经验后执行）：
#    在 Cursor 中运行 memory-govern Skill（输入 /memory-govern）
#
# 推荐约定：
# - 团队级质量标准：Audience=team，Portability=cross-project
# - 团队级常见需求标准方案：Audience=team，Portability=cross-project
# - 前后端/运维默认约定：Audience=team，Portability=cross-project
# - 项目内特殊备忘：Audience=project，Portability=project-only（不放入 share）
"@ | Out-File -FilePath "$ShareDir\.gitkeep" -Encoding UTF8 -NoNewline
}

# 更新 .gitignore
Write-Info "Updating .gitignore..."
$GitignoreEntries = $Manifest.gitignoreEntries

if (Test-Path ".gitignore") {
  $content = Get-Content ".gitignore" -Raw
  $needUpdate = $false

  foreach ($entry in $GitignoreEntries) {
    if ($entry -ne "" -and $content -notmatch [regex]::Escape($entry)) {
      $needUpdate = $true
      break
    }
  }

  if ($needUpdate) {
    Add-Content -Path ".gitignore" -Value "`n# LíngXī`n"
    foreach ($entry in $GitignoreEntries) {
      if ($entry -ne "") { Add-Content -Path ".gitignore" -Value $entry }
    }
    Write-Success ".gitignore updated"
  } else {
    Write-Info ".gitignore already contains required entries"
  }
} else {
  @(
    "# Local workspace for temp code clones, generated artifacts, etc.",
    ".lingxi/workspace/",
    "",
    "# OS / IDE",
    ".DS_Store",
    "Thumbs.db"
  ) | Out-File -FilePath ".gitignore" -Encoding UTF8
  Write-Success ".gitignore created"
}

# 输出成功信息
Write-Host ""
Write-Success "Install complete"
if ($Manifest.version) {
  Write-Info "Version: $($Manifest.version)"
}
Write-Host ""
if ($CursorExists -or $LingxiExists) {
  Write-Info "Merge mode: kept non-LingXi files and updated LingXi files"
}
Write-Info "Next: open project in Cursor or Claude Code and run /init"
