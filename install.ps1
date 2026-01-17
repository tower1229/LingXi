# LíngXī 远程安装脚本 (Windows PowerShell)
# 直接从 GitHub 下载并安装到当前项目

# 配置
$RepoOwner = "tower1229"
$RepoName = "LingXi"
$Branch = "main"
$BaseUrl = "https://raw.githubusercontent.com/${RepoOwner}/${RepoName}/${Branch}"

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

# 下载文件函数（带重试机制）
function Download-File {
    param(
        [string]$RemotePath,
        [string]$LocalPath,
        [int]$MaxRetries = 3
    )

    $url = "${BaseUrl}/${RemotePath}"
    Write-Info "下载: ${RemotePath}"

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
                Write-Warning "下载失败，重试中 ($retryCount/$MaxRetries)..."
                Start-Sleep -Seconds 1
            } else {
                Write-Error "下载失败: ${url} (已重试 $MaxRetries 次)"
                Write-Error $_.Exception.Message
                return $false
            }
        }
    }
    return $false
}

# 读取安装清单（从 GitHub 下载）
function Load-Manifest {
    $manifestUrl = "${BaseUrl}/install-manifest.json"
    Write-Info "下载安装清单..."

    try {
        $manifestContent = Invoke-WebRequest -Uri $manifestUrl -UseBasicParsing -ErrorAction Stop | Select-Object -ExpandProperty Content
        return $manifestContent | ConvertFrom-Json
    } catch {
        Write-Error "下载安装清单失败: $manifestUrl"
        Write-Error $_.Exception.Message
        exit 1
    }
}

# 加载清单
$Manifest = Load-Manifest

Write-Info "开始安装 LíngXī..."
Write-Info "从 GitHub 下载文件: ${RepoOwner}/${RepoName}"

# 检查目标目录是否存在
$CursorExists = Test-Path ".cursor"
$WorkflowExists = Test-Path ".workflow"

if ($CursorExists) {
    Write-Warning ".cursor 目录已存在"
}

if ($WorkflowExists) {
    Write-Warning ".workflow 目录已存在"
}

# 询问是否继续（合并安装模式）
if ($CursorExists -or $WorkflowExists) {
    if ($AutoConfirm) {
        # 设置了 AUTO_CONFIRM，自动确认
        $response = "y"
        Write-Info "自动确认：将以合并模式安装（保留现有文件，仅添加/更新灵犀文件）"
    } else {
        # 询问用户确认（交互式）
        Write-Host ""
        Write-Info "检测到已有目录，将以合并模式安装："
        Write-Info "  - 保留您现有的文件（rules、plans 等）"
        Write-Info "  - 仅添加/更新灵犀需要的文件"
        Write-Host ""
        $response = Read-Host "是否继续？ (y/N)"
        if ($response -ne "y" -and $response -ne "Y") {
            Write-Info "安装已取消"
            exit 0
        }
    }
}

# 创建 .cursor 目录结构
Write-Info "创建 .cursor 目录结构..."
New-Item -ItemType Directory -Force -Path ".cursor\commands" | Out-Null
New-Item -ItemType Directory -Force -Path ".cursor\rules" | Out-Null
New-Item -ItemType Directory -Force -Path ".cursor\skills" | Out-Null
New-Item -ItemType Directory -Force -Path ".cursor\hooks" | Out-Null

# 下载 commands
Write-Info "下载 commands..."
$commandCount = 0
foreach ($cmd in $Manifest.commands) {
    $localFile = ".cursor\$cmd"
    if (-not (Download-File ".cursor\$cmd" $localFile)) {
        Write-Error "安装失败"
        exit 1
    }
    $commandCount++
}
Write-Success "已下载 commands ($commandCount 个文件)"

# 下载 rules（项目级质量准则）
# 注意：qs-i-workflow 不在列表中（仅用于本项目开发）
Write-Info "下载 rules..."

# 创建规则目录
$ruleDirCount = 0
foreach ($ruleDir in $Manifest.rules.directories) {
    $destDir = ".cursor\$ruleDir"
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    }
    $ruleDirCount++
}

# 下载规则文件
$ruleFileCount = 0
foreach ($ruleFile in $Manifest.rules.files) {
    $localFile = ".cursor\$ruleFile"
    if (-not (Download-File ".cursor\$ruleFile" $localFile)) {
        Write-Error "安装失败"
        exit 1
    }
    $ruleFileCount++
}
Write-Success "已下载 rules ($ruleDirCount 个规则目录 + $ruleFileCount 个文件)"


# 下载 hooks（hooks.json + scripts）
Write-Info "下载 hooks..."
$hookCount = 0
foreach ($hookFile in $Manifest.hooks.files) {
    $localFile = ".cursor\$hookFile"
    if (-not (Download-File ".cursor\$hookFile" $localFile)) {
        Write-Error "安装失败"
        exit 1
    }
    $hookCount++
}
Write-Success "已下载 hooks ($hookCount 个文件)"

# 下载 skills
Write-Info "下载 skills..."
$skillCount = 0
foreach ($skill in $Manifest.skills) {
    $localFile = ".cursor\$skill"
    if (-not (Download-File ".cursor\$skill" $localFile)) {
        Write-Error "安装失败"
        exit 1
    }
    $skillCount++
}

# 下载引用文件
$refCount = 0
foreach ($refKey in $Manifest.references.PSObject.Properties.Name) {
    foreach ($refFile in $Manifest.references.$refKey) {
        $destDir = ".cursor\$(Split-Path -Parent $refFile)"
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Force -Path $destDir | Out-Null
        }
        $localFile = ".cursor\$refFile"
        if (-not (Download-File ".cursor\$refFile" $localFile)) {
            Write-Error "安装失败"
            exit 1
        }
        $refCount++
    }
}

Write-Success "已下载 skills ($skillCount 个核心 skills + $refCount 个引用文件)"

# 创建 .workflow 目录结构
Write-Info "创建 .workflow 目录结构..."
foreach ($dir in $Manifest.workflowDirectories) {
    $winPath = $dir -replace '/', '\'
    New-Item -ItemType Directory -Force -Path $winPath | Out-Null
}

# 下载 INDEX.md 文件
Write-Info "下载索引文件..."
foreach ($indexFile in $Manifest.workflowIndexFiles) {
    $winPath = $indexFile -replace '/', '\'
    if (-not (Download-File $indexFile $winPath)) {
        Write-Error "安装失败"
        exit 1
    }
}
Write-Success "已下载索引文件"

# 更新 .gitignore
Write-Info "更新 .gitignore..."
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
            Add-Content -Path ".gitignore" -Value $entry
        }
        Write-Success "已更新 .gitignore"
    } else {
        Write-Info ".gitignore 已包含相关条目，跳过更新"
    }
} else {
    @(
        "# Local workspace for temp code clones, generated artifacts, etc.",
        ".workflow/workspace/",
        "",
        "# Session-level context (ephemeral, not a knowledge base)",
        ".workflow/context/session/",
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
Write-Host "  - .cursor/commands/ ($commandCount 个命令)"
Write-Host "  - .cursor/rules/ ($ruleDirCount 个规则目录 + $ruleFileCount 个文件)"
Write-Host "  - .cursor/skills/ ($skillCount 个核心 Agent Skills)"
Write-Host "  - .workflow/ 目录结构"
if ($CursorExists -or $WorkflowExists) {
    Write-Host ""
    Write-Info "✓ 已保留您现有的文件（合并安装模式）"
}
Write-Host ""
Write-Info "下一步："
Write-Host "  1. 在 Cursor 中打开项目"
Write-Host "  2. 运行 /flow <需求描述> 创建第一个需求"
Write-Host "  3. 查看 README.md 了解完整工作流"
Write-Host ""
Write-Info "更多信息：https://github.com/${RepoOwner}/${RepoName}"
Write-Info "仓库地址：git@github.com:${RepoOwner}/${RepoName}.git"