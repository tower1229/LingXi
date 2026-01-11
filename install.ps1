# Cursor Workflow 远程安装脚本 (Windows PowerShell)
# 直接从 GitHub 下载并安装到当前项目

# 配置
$RepoOwner = "tower1229"
$RepoName = "cursor-workflow"
$Branch = "main"
$BaseUrl = "https://raw.githubusercontent.com/${RepoOwner}/${RepoName}/${Branch}"

# 设置错误处理
$ErrorActionPreference = "Stop"

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

# 下载文件函数
function Download-File {
    param(
        [string]$RemotePath,
        [string]$LocalPath
    )

    $url = "${BaseUrl}/${RemotePath}"
    Write-Info "下载: ${RemotePath}"

    $dir = Split-Path -Parent $LocalPath
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }

    try {
        Invoke-WebRequest -Uri $url -OutFile $LocalPath -UseBasicParsing -ErrorAction Stop
        return $true
    } catch {
        Write-Error "下载失败: ${url}"
        Write-Error $_.Exception.Message
        return $false
    }
}

Write-Info "开始安装 Cursor Workflow..."
Write-Info "从 GitHub 下载文件: ${RepoOwner}/${RepoName}"

# 检查目标目录是否存在
$CursorExists = Test-Path ".cursor"
$AiExists = Test-Path "ai"

if ($CursorExists) {
    Write-Warning ".cursor 目录已存在"
}

if ($AiExists) {
    Write-Warning "ai 目录已存在"
}

# 询问是否继续
if ($CursorExists -or $AiExists) {
    $response = Read-Host "是否继续？这将覆盖现有文件 (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Info "安装已取消"
        exit 0
    }
}

# 创建 .cursor 目录结构
Write-Info "创建 .cursor 目录结构..."
New-Item -ItemType Directory -Force -Path ".cursor\commands" | Out-Null
New-Item -ItemType Directory -Force -Path ".cursor\rules" | Out-Null

# 下载 commands
Write-Info "下载 commands..."
$Commands = @(
    "commands/req.md",
    "commands/review-req.md",
    "commands/plan.md",
    "commands/work.md",
    "commands/review.md",
    "commands/compound.md",
    "commands/remember.md"
)

foreach ($cmd in $Commands) {
    $localFile = ".cursor\$cmd"
    if (-not (Download-File ".cursor\$cmd" $localFile)) {
        Write-Error "安装失败"
        exit 1
    }
}
Write-Success "已下载 commands (7 个文件)"

# 下载 rules
Write-Info "下载 rules..."
$Rules = @(
    "rules/workflow.mdc",
    "rules/development-specifications.mdc",
    "rules/skill-index-manager.mdc",
    "rules/skill-experience-depositor.mdc",
    "rules/skill-experience-index.mdc",
    "rules/skill-context-engineering.mdc"
)

foreach ($rule in $Rules) {
    $localFile = ".cursor\$rule"
    if (-not (Download-File ".cursor\$rule" $localFile)) {
        Write-Error "安装失败"
        exit 1
    }
}
Write-Success "已下载 rules (6 个文件)"

# 创建 ai 目录结构
Write-Info "创建 ai 目录结构..."
@(
    "ai\requirements\in-progress",
    "ai\requirements\completed",
    "ai\context\business",
    "ai\context\tech\services",
    "ai\context\experience",
    "ai\context\session",
    "ai\workspace"
) | ForEach-Object {
    New-Item -ItemType Directory -Force -Path $_ | Out-Null
}

# 下载 INDEX.md 文件
Write-Info "下载索引文件..."
if (-not (Download-File "ai/requirements/INDEX.md" "ai\requirements\INDEX.md")) {
    Write-Error "安装失败"
    exit 1
}

if (-not (Download-File "ai/context/experience/INDEX.md" "ai\context\experience\INDEX.md")) {
    Write-Error "安装失败"
    exit 1
}
Write-Success "已下载索引文件"

# 更新 .gitignore
Write-Info "更新 .gitignore..."
$GitignoreEntries = @(
    "# Local workspace for temp code clones, generated artifacts, etc.",
    "ai/workspace/",
    "",
    "# Session-level context (ephemeral, not a knowledge base)",
    "ai/context/session/"
)

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
        Add-Content -Path ".gitignore" -Value "`n# Cursor Workflow`n"
        foreach ($entry in $GitignoreEntries) {
            Add-Content -Path ".gitignore" -Value $entry
        }
        Write-Success "已更新 .gitignore"
    } else {
        Write-Info ".gitignore 已包含相关条目，跳过更新"
    }
} else {
    @(
        "# Local workspace for temp code clones, generated artifacts, etc.",
        "ai/workspace/",
        "",
        "# Session-level context (ephemeral, not a knowledge base)",
        "ai/context/session/",
        "",
        "# OS / IDE",
        ".DS_Store",
        "Thumbs.db"
    ) | Out-File -FilePath ".gitignore" -Encoding UTF8
    Write-Success "已创建 .gitignore"
}

# 输出成功信息
Write-Host ""
Write-Success "安装完成！"
Write-Host ""
Write-Info "已安装的文件："
Write-Host "  - .cursor/commands/ (7 个命令文件)"
Write-Host "  - .cursor/rules/ (6 个规则文件)"
Write-Host "  - ai/ 目录结构"
Write-Host ""
Write-Info "下一步："
Write-Host "  1. 在 Cursor 中打开项目"
Write-Host "  2. 运行 /req 命令创建第一个需求"
Write-Host "  3. 查看 README.md 了解完整工作流"
Write-Host ""
Write-Info "更多信息：https://github.com/${RepoOwner}/${RepoName}"
Write-Info "仓库地址：git@github.com:${RepoOwner}/${RepoName}.git"