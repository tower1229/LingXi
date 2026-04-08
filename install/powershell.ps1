# LingXi 2.0 远程安装脚本 (Windows PowerShell)
# 直接从 GitHub 下载并安装到当前项目
# Version: 2.0.0

$RepoOwner = "tower1229"
$RepoName = "LingXi"
$Branch = "main"
if ($env:BASE_URL) {
  $BaseUrl = $env:BASE_URL.TrimEnd("/")
} else {
  $BaseUrl = "https://raw.githubusercontent.com/${RepoOwner}/${RepoName}/${Branch}"
}

$ErrorActionPreference = "Stop"
$AutoConfirm = $env:AUTO_CONFIRM -eq "true" -or $env:AUTO_CONFIRM -eq "1" -or $env:AUTO_CONFIRM -eq "yes"

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

function Download-File {
  param(
    [string]$RemotePath,
    [string]$LocalPath,
    [int]$MaxRetries = 3
  )

  $url = "${BaseUrl}/${RemotePath}"
  $dir = Split-Path -Parent $LocalPath
  if ($dir -and -not (Test-Path $dir)) {
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

function Load-Manifest {
  $manifestUrl = "${BaseUrl}/install/install-manifest.json"
  Write-Info "Downloading install manifest..."

  try {
    $manifestRaw = Invoke-WebRequest -Uri $manifestUrl -UseBasicParsing -ErrorAction Stop | Select-Object -ExpandProperty Content
    return @{
      Raw = $manifestRaw
      Data = $manifestRaw | ConvertFrom-Json
    }
  } catch {
    Write-Error "Failed to download install manifest: $manifestUrl"
    Write-Error $_.Exception.Message
    exit 1
  }
}

$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $NodeCmd) {
  Write-Error "node is required but not installed"
  exit 1
}

$ManifestBundle = Load-Manifest
$Manifest = $ManifestBundle.Data
$ManifestRaw = $ManifestBundle.Raw

Write-Info "Installing LingXi 2.0..."
Write-Info "Source: ${RepoOwner}/${RepoName}"
Write-Info "Surface: Codex-native (.codex-plugin, skills, scripts, templates, .lingxi)"

$ManagedExists = (Test-Path ".codex-plugin\plugin.json") -or (Test-Path "skills") -or (Test-Path ".lingxi") -or (Test-Path "install\install-manifest.json")

if ($ManagedExists) {
  if ($AutoConfirm) {
    Write-Info "Auto-confirm enabled: update install mode"
  } else {
    Write-Host ""
    Write-Info "Existing LingXi 2.0 files detected. Update install mode:"
    Write-Info " - Keep unrelated repository files"
    Write-Info " - Overwrite LingXi-managed files to the latest 2.0 version"
    Write-Host ""
    $response = Read-Host "Continue? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
      Write-Info "Install cancelled"
      exit 0
    }
  }
}

Write-Info "Downloading LingXi 2.0 files..."
$fileCount = 0
foreach ($filePath in $Manifest.files) {
  $remotePath = $filePath.Replace("\", "/")
  $localPath = $filePath.Replace("/", "\")
  if (-not (Download-File $remotePath $localPath)) {
    Write-Error "Failed to install file: $filePath"
    exit 1
  }
  $fileCount++
}
Write-Success "LingXi 2.0 files downloaded ($fileCount files)"

New-Item -ItemType Directory -Force -Path "install" | Out-Null
$ManifestRaw | Set-Content -Path "install\install-manifest.json" -Encoding UTF8
Write-Success "Saved manifest to install/install-manifest.json"

if (Test-Path "package.json") {
  $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
  if (-not $pkg.scripts) {
    $pkg | Add-Member -MemberType NoteProperty -Name scripts -Value @{}
  }
  foreach ($key in $Manifest.packageScripts.PSObject.Properties.Name) {
    $pkg.scripts | Add-Member -MemberType NoteProperty -Name $key -Value $Manifest.packageScripts.$key -Force
  }
  $pkg | ConvertTo-Json -Depth 100 | Set-Content -Path "package.json" -Encoding UTF8
  Write-Success "Merged LingXi scripts into package.json"
}

Write-Info "Bootstrapping LingXi 2.0 runtime and automation..."
& node "scripts\lx-bootstrap.mjs"
if ($LASTEXITCODE -ne 0) {
  Write-Error "LingXi 2.0 bootstrap failed"
  exit 1
}
Write-Success "LingXi 2.0 runtime and automation bootstrap completed"

Write-Host ""
Write-Success "Install complete"
if ($Manifest.version) {
  Write-Info "Version: $($Manifest.version)"
}
if ($ManagedExists) {
  Write-Info "Update mode: refreshed LingXi-managed 2.0 files"
}
Write-Info "Next: open this repository in Codex."
