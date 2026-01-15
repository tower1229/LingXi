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
$WorkflowExists = Test-Path ".workflow"

if ($CursorExists) {
    Write-Warning ".cursor 目录已存在"
}

if ($WorkflowExists) {
    Write-Warning ".workflow 目录已存在"
}

# 询问是否继续
if ($CursorExists -or $WorkflowExists) {
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
New-Item -ItemType Directory -Force -Path ".cursor\skills" | Out-Null
New-Item -ItemType Directory -Force -Path ".cursor\hooks" | Out-Null

# 下载 commands
Write-Info "下载 commands..."
$Commands = @(
    "commands/flow.md",
    "commands/remember.md"
)

foreach ($cmd in $Commands) {
    $localFile = ".cursor\$cmd"
    if (-not (Download-File ".cursor\$cmd" $localFile)) {
        Write-Error "安装失败"
        exit 1
    }
}
Write-Success "已下载 commands (2 个文件)"

# 下载 rules（项目级质量准则）
# 使用硬编码列表，明确控制哪些文件被安装
# 注意：qs-i-workflow 不在列表中（仅用于本项目开发）
Write-Info "下载 rules..."
$Rules = @(
    "rules/qs-always-general/RULE.md",
    "rules/quality-standards-index.md",
    "rules/quality-standards-schema.md"
)

foreach ($rule in $Rules) {
    $localFile = ".cursor\$rule"
    if (-not (Download-File ".cursor\$rule" $localFile)) {
        Write-Error "安装失败"
        exit 1
    }
}
Write-Success "已下载 rules (1 个规则 + 2 个索引文件)"

# 注意：workflow 工具规则使用 AGENTS.md（根目录或嵌套）实现，不在此下载

# 下载 hooks（hooks.json + scripts）
Write-Info "下载 hooks..."
$HookFiles = @(
    "hooks.json",
    "hooks/_hook-utils.mjs",
    "hooks/audit-after-shell-execution.mjs",
    "hooks/before-shell-execution.mjs",
    "hooks/before-submit-prompt.mjs",
    "hooks/stop.mjs"
)

foreach ($f in $HookFiles) {
    $localFile = ".cursor\$f"
    if (-not (Download-File ".cursor\$f" $localFile)) {
        Write-Error "安装失败"
        exit 1
    }
}
Write-Success "已下载 hooks (hooks.json + 5 个脚本)"

# 下载 skills
Write-Info "下载 skills..."
$Skills = @(
    "skills/audit/SKILL.md",
    "skills/archive/SKILL.md",
    "skills/context-engineering/SKILL.md",
    "skills/experience-curator/SKILL.md",
    "skills/experience-depositor/SKILL.md",
    "skills/experience-index/SKILL.md",
    "skills/flow-router/SKILL.md",
    "skills/index-manager/SKILL.md",
    "skills/plan/SKILL.md",
    "skills/plan-manager/SKILL.md",
    "skills/req/SKILL.md",
    "skills/review/SKILL.md",
    "skills/rules-creator/SKILL.md",
    "skills/service-loader/SKILL.md",
    "skills/work/SKILL.md"
)

foreach ($s in $Skills) {
    $localFile = ".cursor\$s"
    if (-not (Download-File ".cursor\$s" $localFile)) {
        Write-Error "安装失败"
        exit 1
    }
}

# 下载 experience-curator 的引用文件
Write-Info "下载 experience-curator 引用文件..."
New-Item -ItemType Directory -Force -Path ".cursor\skills\experience-curator\references" | Out-Null
if (-not (Download-File ".cursor/skills/experience-curator/references/experience-governance.md" ".cursor\skills\experience-curator\references\experience-governance.md")) {
    Write-Error "安装失败"
    exit 1
}

# 下载 flow-router 的引用文件
Write-Info "下载 flow-router 引用文件..."
New-Item -ItemType Directory -Force -Path ".cursor\skills\flow-router\references" | Out-Null
if (-not (Download-File ".cursor/skills/flow-router/references/semantics-capsule.md" ".cursor\skills\flow-router\references\semantics-capsule.md")) {
    Write-Error "安装失败"
    exit 1
}
if (-not (Download-File ".cursor/skills/flow-router/references/trade-off-record.md" ".cursor\skills\flow-router\references\trade-off-record.md")) {
    Write-Error "安装失败"
    exit 1
}

Write-Success "已下载 skills (15 个核心 skills + 引用文件)"

# 创建 .workflow 目录结构
Write-Info "创建 .workflow 目录结构..."
@(
    ".workflow\requirements\in-progress",
    ".workflow\requirements\completed",
    ".workflow\context\business",
    ".workflow\context\tech\services",
    ".workflow\context\experience",
    ".workflow\context\session",
    ".workflow\workspace"
) | ForEach-Object {
    New-Item -ItemType Directory -Force -Path $_ | Out-Null
}

# 下载 INDEX.md 文件
Write-Info "下载索引文件..."
if (-not (Download-File ".workflow/requirements/INDEX.md" ".workflow\requirements\INDEX.md")) {
    Write-Error "安装失败"
    exit 1
}

if (-not (Download-File ".workflow/context/experience/INDEX.md" ".workflow\context\experience\INDEX.md")) {
    Write-Error "安装失败"
    exit 1
}
Write-Success "已下载索引文件"

# 更新 .gitignore
Write-Info "更新 .gitignore..."
$GitignoreEntries = @(
    "# Local workspace for temp code clones, generated artifacts, etc.",
    ".workflow/workspace/",
    "",
    "# Session-level context (ephemeral, not a knowledge base)",
    ".workflow/context/session/"
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
Write-Host "  - .cursor/commands/ (2 个命令)"
Write-Host "  - .cursor/rules/ (1 个规则 + 2 个索引文件)"
Write-Host "  - .cursor/skills/ (15 个核心 Agent Skills)"
Write-Host "  - .workflow/ 目录结构"
Write-Host ""
Write-Info "下一步："
Write-Host "  1. 在 Cursor 中打开项目"
Write-Host "  2. 运行 /flow <需求描述> 创建第一个需求"
Write-Host "  3. 查看 README.md 了解完整工作流"
Write-Host ""
Write-Info "更多信息：https://github.com/${RepoOwner}/${RepoName}"
Write-Info "仓库地址：git@github.com:${RepoOwner}/${RepoName}.git"