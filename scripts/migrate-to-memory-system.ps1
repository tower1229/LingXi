# 灵犀记忆系统迁移脚本
# 将 context/ 目录重构为 memory/ 目录

$ErrorActionPreference = "Stop"

$projectRoot = $PSScriptRoot | Split-Path -Parent
$lingxiRoot = Join-Path $projectRoot ".cursor\.lingxi"
$contextDir = Join-Path $lingxiRoot "context"
$backupDir = Join-Path $lingxiRoot "context.backup"

Write-Host "开始迁移灵犀记忆系统..." -ForegroundColor Cyan

# 1. 备份现有数据
if (Test-Path $contextDir) {
    Write-Host "备份现有数据到 $backupDir..." -ForegroundColor Yellow
    if (Test-Path $backupDir) {
        Remove-Item -Path $backupDir -Recurse -Force
    }
    Copy-Item -Path $contextDir -Destination $backupDir -Recurse -Force
    Write-Host "备份完成" -ForegroundColor Green
} else {
    Write-Host "未找到 context 目录，跳过备份" -ForegroundColor Yellow
}

# 2. 创建新目录结构
Write-Host "创建新目录结构..." -ForegroundColor Yellow
$memoryDir = Join-Path $lingxiRoot "memory"
$memoryExperienceDir = Join-Path $memoryDir "experience"
$memoryTechDir = Join-Path $memoryDir "tech"
$memoryBusinessDir = Join-Path $memoryDir "business"
$styleFusionDir = Join-Path $lingxiRoot "style-fusion"
$workspaceDir = Join-Path $lingxiRoot "workspace"

New-Item -ItemType Directory -Path $memoryExperienceDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $memoryExperienceDir "team\standards") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $memoryExperienceDir "team\knowledge") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $memoryExperienceDir "project") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $memoryTechDir "services") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $memoryBusinessDir "references") -Force | Out-Null
New-Item -ItemType Directory -Path $styleFusionDir -Force | Out-Null
New-Item -ItemType Directory -Path $workspaceDir -Force | Out-Null

Write-Host "目录结构创建完成" -ForegroundColor Green

# 3. 迁移文件
Write-Host "迁移文件..." -ForegroundColor Yellow

if (Test-Path $contextDir) {
    # 迁移 experience
    $contextExperienceDir = Join-Path $contextDir "experience"
    if (Test-Path $contextExperienceDir) {
        # 检查是否有 team 和 project 子目录
        $teamDir = Join-Path $contextExperienceDir "team"
        $projectDir = Join-Path $contextExperienceDir "project"
        
        if (Test-Path $teamDir) {
            Copy-Item -Path "$teamDir\*" -Destination (Join-Path $memoryExperienceDir "team") -Recurse -Force
        }
        if (Test-Path $projectDir) {
            Copy-Item -Path "$projectDir\*" -Destination (Join-Path $memoryExperienceDir "project") -Recurse -Force
        }
        
        # 迁移根目录下的文件（如 INDEX.md, ai-native-design.md 等）
        Get-ChildItem -Path $contextExperienceDir -File | ForEach-Object {
            Copy-Item -Path $_.FullName -Destination $memoryExperienceDir -Force
        }
        
        # 迁移 references 目录
        $refsDir = Join-Path $contextExperienceDir "references"
        if (Test-Path $refsDir) {
            $targetRefsDir = Join-Path $memoryExperienceDir "references"
            New-Item -ItemType Directory -Path $targetRefsDir -Force | Out-Null
            Copy-Item -Path "$refsDir\*" -Destination $targetRefsDir -Recurse -Force
        }
    }
    
    # 迁移 tech
    $contextTechDir = Join-Path $contextDir "tech"
    if (Test-Path $contextTechDir) {
        Copy-Item -Path "$contextTechDir\*" -Destination $memoryTechDir -Recurse -Force
    }
    
    # 迁移 business
    $contextBusinessDir = Join-Path $contextDir "business"
    if (Test-Path $contextBusinessDir) {
        Copy-Item -Path "$contextBusinessDir\*" -Destination $memoryBusinessDir -Recurse -Force
    }
    
    # 迁移 style-fusion
    $contextStyleFusionDir = Join-Path $contextDir "style-fusion"
    if (Test-Path $contextStyleFusionDir) {
        Copy-Item -Path "$contextStyleFusionDir\*" -Destination $styleFusionDir -Recurse -Force
    }
    
    # 迁移 session 到 workspace
    $contextSessionDir = Join-Path $contextDir "session"
    if (Test-Path $contextSessionDir) {
        $pendingFile = Join-Path $contextSessionDir "pending-compounding-candidates.json"
        if (Test-Path $pendingFile) {
            Copy-Item -Path $pendingFile -Destination $workspaceDir -Force
        }
    }
}

Write-Host "文件迁移完成" -ForegroundColor Green

# 4. 合并索引
Write-Host "合并索引..." -ForegroundColor Yellow

$memoryIndexPath = Join-Path $memoryDir "INDEX.md"
$teamIndexPath = Join-Path $memoryExperienceDir "team\INDEX.md"
$projectIndexPath = Join-Path $memoryExperienceDir "project\INDEX.md"

# 读取现有的 experience INDEX（如果存在）
$experienceEntries = @()
if (Test-Path (Join-Path $memoryExperienceDir "INDEX.md")) {
    $indexContent = Get-Content -Path (Join-Path $memoryExperienceDir "INDEX.md") -Raw
    # 解析表格行
    $lines = $indexContent -split "`n"
    $inTable = $false
    foreach ($line in $lines) {
        if ($line -match "^\|.*\|$" -and $line -notmatch "^\|.*---.*\|$") {
            if ($inTable -and $line -match "^\|.*Tag.*\|") {
                continue  # 跳过表头
            }
            if ($line -match "^\|.*Tag.*\|") {
                $inTable = $true
                continue
            }
            if ($inTable -and $line.Trim() -ne "") {
                $experienceEntries += $line
            }
        }
    }
}

# 读取 team INDEX（如果存在）
if (Test-Path $teamIndexPath) {
    $teamContent = Get-Content -Path $teamIndexPath -Raw
    $lines = $teamContent -split "`n"
    $inTable = $false
    foreach ($line in $lines) {
        if ($line -match "^\|.*\|$" -and $line -notmatch "^\|.*---.*\|$") {
            if ($inTable -and $line -match "^\|.*Tag.*\|") {
                continue
            }
            if ($line -match "^\|.*Tag.*\|") {
                $inTable = $true
                continue
            }
            if ($inTable -and $line.Trim() -ne "") {
                # 更新路径并添加 Level 字段
                $updatedLine = $line -replace "`\.cursor/`\.lingxi/context/experience", ".cursor/.lingxi/memory/experience"
                if ($updatedLine -notmatch "\|.*\|.*\|.*\|.*\|.*\|.*\|.*\|.*\|.*\|.*\|.*\|.*\|") {
                    # 如果没有 Level 字段，添加
                    $parts = $updatedLine -split "\|"
                    if ($parts.Count -ge 12) {
                        # 在 ReplacedBy 之后插入 Level
                        $newParts = $parts[0..10] + "team" + $parts[11..($parts.Count-1)]
                        $updatedLine = $newParts -join "|"
                    }
                }
                $experienceEntries += $updatedLine
            }
        }
    }
}

# 读取 project INDEX（如果存在）
if (Test-Path $projectIndexPath) {
    $projectContent = Get-Content -Path $projectIndexPath -Raw
    $lines = $projectContent -split "`n"
    $inTable = $false
    foreach ($line in $lines) {
        if ($line -match "^\|.*\|$" -and $line -notmatch "^\|.*---.*\|$") {
            if ($inTable -and $line -match "^\|.*Tag.*\|") {
                continue
            }
            if ($line -match "^\|.*Tag.*\|") {
                $inTable = $true
                continue
            }
            if ($inTable -and $line.Trim() -ne "") {
                $updatedLine = $line -replace "`\.cursor/`\.lingxi/context/experience", ".cursor/.lingxi/memory/experience"
                if ($updatedLine -notmatch "\|.*\|.*\|.*\|.*\|.*\|.*\|.*\|.*\|.*\|.*\|.*\|.*\|") {
                    $parts = $updatedLine -split "\|"
                    if ($parts.Count -ge 12) {
                        $newParts = $parts[0..10] + "project" + $parts[11..($parts.Count-1)]
                        $updatedLine = $newParts -join "|"
                    }
                }
                $experienceEntries += $updatedLine
            }
        }
    }
}

# 创建统一索引
$indexContent = @"
# Memory Index

> 灵犀统一记忆系统索引（SSoT - Single Source of Truth）
> 
> 所有持久化记忆（经验、技术、业务）使用统一的索引格式和匹配策略。

## Experience（经验记忆）

| Tag | Type | Title | Trigger | Surface signal | Hidden risk | Status | Scope | Strength | Level | Replaces | ReplacedBy | File |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
$($experienceEntries -join "`n")

## Tech（技术记忆）

| Tag | Title | Service | Trigger | Status | File |
|---|---|---|---|---|---|

## Business（业务记忆）

| Tag | Title | Topic | Trigger | Status | File |
|---|---|---|---|---|---|
"@

Set-Content -Path $memoryIndexPath -Value $indexContent -Encoding UTF8
Write-Host "索引合并完成" -ForegroundColor Green

# 5. 清理旧目录（可选，注释掉以保留备份）
# Write-Host "清理旧目录..." -ForegroundColor Yellow
# if (Test-Path $contextDir) {
#     Remove-Item -Path $contextDir -Recurse -Force
# }

Write-Host "`n迁移完成！" -ForegroundColor Green
Write-Host "新目录结构：$memoryDir" -ForegroundColor Cyan
Write-Host "备份位置：$backupDir" -ForegroundColor Cyan
Write-Host "`n注意：旧 context 目录已保留为备份，确认迁移无误后可手动删除" -ForegroundColor Yellow
