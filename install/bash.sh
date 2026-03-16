#!/usr/bin/env bash

# LíngXī 远程安装脚本
# 直接从 GitHub 下载并安装到当前项目
# Version: 1.2.0

# 严格模式：遇到错误立即退出，未定义变量报错，管道中任何命令失败都视为失败
set -euo pipefail

# 配置
REPO_OWNER="tower1229"
REPO_NAME="LingXi"
BRANCH="main"
# 支持通过环境变量覆盖 BASE_URL（用于本地测试）
BASE_URL="${BASE_URL:-https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

success() {
  echo -e "${GREEN}✓${NC} $1"
}

warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

error() {
  echo -e "${RED}✗${NC} $1"
}

# 检测交互式 shell（检查 $- 是否包含 'i'）
IS_INTERACTIVE_SHELL=false
if [[ $- == *i* ]]; then
  IS_INTERACTIVE_SHELL=true
fi

# 检测 stdin 是否为终端
IS_INTERACTIVE_TERMINAL=false
if [ -t 0 ]; then
  IS_INTERACTIVE_TERMINAL=true
fi

# 自动确认选项（通过环境变量控制）
# 支持 AUTO_CONFIRM 和 NONINTERACTIVE（类似 Homebrew）
AUTO_CONFIRM=${AUTO_CONFIRM:-false}
NONINTERACTIVE=${NONINTERACTIVE:-0}

if [ "$AUTO_CONFIRM" = "true" ] || [ "$AUTO_CONFIRM" = "1" ] || [ "$AUTO_CONFIRM" = "yes" ] || [ "$NONINTERACTIVE" = "1" ]; then
  AUTO_CONFIRM=true
else
  AUTO_CONFIRM=false
fi

# 检查命令是否存在
check_command() {
  if ! command -v "$1" &> /dev/null; then
    error "$1 is required but not installed"
    exit 1
  fi
}

check_command curl

# 检测可用的 Python 命令（支持 python3 和 python）
# 注意：Windows 上可能存在 Store 占位符，需要验证能否真正执行
PYTHON_CMD=""
PYTHON_IS_WINDOWS=false

# 验证 Python 命令是否真正可用（不仅仅是存在）
check_python_works() {
  local cmd=$1
  # 尝试执行简单命令，验证 Python 是否真正安装（而不是 Windows Store 占位符）
  $cmd -c "import sys; sys.exit(0 if sys.version_info[0] >= 3 else 1)" 2>/dev/null
}

if command -v python3 &> /dev/null && check_python_works python3; then
  PYTHON_CMD="python3"
elif command -v python &> /dev/null && check_python_works python; then
  PYTHON_CMD="python"
fi

# 检测 Python 是否为 Windows 原生版本（需要路径转换）
if [ -n "$PYTHON_CMD" ]; then
  if $PYTHON_CMD -c "import sys; sys.exit(0 if sys.platform == 'win32' else 1)" 2>/dev/null; then
    PYTHON_IS_WINDOWS=true
  fi
fi

# 将路径转换为 Python 可识别的格式（处理 Git Bash/MSYS2 环境）
convert_path_for_python() {
  local path=$1
  if [ "$PYTHON_IS_WINDOWS" = true ] && command -v cygpath &> /dev/null; then
    # Git Bash/MSYS2 环境：将 Unix 路径转换为 Windows 路径
    cygpath -w "$path"
  else
    echo "$path"
  fi
}

# 下载单个文件（远程路径与本地路径均相对项目根，如 commands/init.md）
# 与 powershell.ps1 一致：最多重试 3 次
download_file() {
  local remote_path="$1"
  local local_path="$2"
  local url="${BASE_URL%/}/${remote_path}"
  local dir
  dir="$(dirname "$local_path")"
  mkdir -p "$dir"
  local max_retries=3
  local retry=0
  while [ $retry -lt $max_retries ]; do
    if curl -fsSL -o "$local_path" -- "$url"; then
      return 0
    fi
    retry=$((retry + 1))
    if [ $retry -lt $max_retries ]; then
      warning "Download failed, retrying ($retry/$max_retries)..."
      sleep 1
    else
      error "Download failed: $url (retried $max_retries times)"
      return 1
    fi
  done
  return 1
}

# 读取安装清单（从 GitHub 下载）
load_manifest() {
  local base_url="${BASE_URL%/}"
  local manifest_url="${base_url}/install/install-manifest.json"
  local manifest_path
  manifest_path=$(mktemp)

  info "Downloading install manifest..."
  if ! curl -fsSL -o "$manifest_path" -- "$manifest_url"; then
    error "Failed to download install manifest: $manifest_url"
    exit 1
  fi

  MANIFEST_PATH="$manifest_path"
  MANIFEST_PATH_FOR_PYTHON=$(convert_path_for_python "$manifest_path")

  # 验证 JSON 格式
  if command -v jq &> /dev/null; then
    if ! jq empty "$manifest_path" 2>/dev/null; then
      error "Invalid JSON in downloaded manifest"
      rm -f "$manifest_path"
      exit 1
    fi
    return 0
  elif [ -n "$PYTHON_CMD" ]; then
    if ! $PYTHON_CMD -c "import json; json.load(open(r'$MANIFEST_PATH_FOR_PYTHON'))" 2>/dev/null; then
      error "Invalid JSON in downloaded manifest"
      rm -f "$manifest_path"
      exit 1
    fi
    return 0
  else
    error "jq or Python 3 is required to parse the manifest"
    error "Install jq: https://stedolan.github.io/jq/download/"
    error "Or install Python 3: https://www.python.org/downloads/"
    rm -f "$manifest_path"
    exit 1
  fi
}

# 使用 jq 或 Python 获取 JSON 标量值（如 version）
get_json_string() {
  local key=$1
  if [ -z "${MANIFEST_PATH:-}" ] || [ ! -f "$MANIFEST_PATH" ]; then
    echo ""
    return 0
  fi
  if command -v jq &> /dev/null; then
    jq -r ".$key // \"\"" "$MANIFEST_PATH" 2>/dev/null || echo ""
  elif [ -n "$PYTHON_CMD" ]; then
    $PYTHON_CMD -c "
import sys, json
try:
  with open(r'$MANIFEST_PATH_FOR_PYTHON', 'r', encoding='utf-8') as f:
    data = json.load(f)
  print(data.get('$key', '') or '')
except Exception:
  print('')
" 2>/dev/null || echo ""
  else
    echo ""
  fi
}

# 使用 jq 或 python3 获取 JSON 数组值
get_json_array() {
  local key=$1
  if [ -z "${MANIFEST_PATH:-}" ] || [ ! -f "$MANIFEST_PATH" ]; then
    error "Manifest file not found"
    return 1
  fi
  if command -v jq &> /dev/null; then
    jq -r --arg key "$key" '.[$key] // [] | .[]' "$MANIFEST_PATH" 2>/dev/null || return 1
  elif [ -n "$PYTHON_CMD" ]; then
    $PYTHON_CMD -c "
import sys
import json
if hasattr(sys.stdout, 'reconfigure'):
  sys.stdout.reconfigure(newline='\n')
try:
  with open(r'$MANIFEST_PATH_FOR_PYTHON', 'r', encoding='utf-8') as f:
    data = json.load(f)
  items = data.get('$key', []) or []
  for item in items:
    print(item)
except Exception as e:
  sys.stderr.write(f'JSON 解析错误: {e}\n')
  sys.exit(1)
" 2>/dev/null || return 1
  else
    error "jq or Python 3 is required to parse JSON"
    return 1
  fi
}

# 使用 jq 或 Python 获取 JSON 对象数组值
get_json_object_array() {
  local key=$1
  local subkey=$2
  if [ -z "${MANIFEST_PATH:-}" ] || [ ! -f "$MANIFEST_PATH" ]; then
    error "Manifest file not found"
    return 1
  fi
  if command -v jq &> /dev/null; then
    jq -r --arg key "$key" --arg subkey "$subkey" '.[$key][$subkey] // [] | .[]' "$MANIFEST_PATH" 2>/dev/null || return 1
  elif [ -n "$PYTHON_CMD" ]; then
    $PYTHON_CMD -c "
import sys
import json
if hasattr(sys.stdout, 'reconfigure'):
  sys.stdout.reconfigure(newline='\n')
try:
  with open(r'$MANIFEST_PATH_FOR_PYTHON', 'r', encoding='utf-8') as f:
    data = json.load(f)
  items = (data.get('$key', {}) or {}).get('$subkey', []) or []
  for item in items:
    print(item)
except Exception as e:
  sys.stderr.write(f'JSON 解析错误: {e}\n')
  sys.exit(1)
" 2>/dev/null || return 1
  else
    error "jq or Python 3 is required to parse JSON"
    return 1
  fi
}

get_json_object_value() {
  local key=$1
  local subkey=$2
  if [ -z "${MANIFEST_PATH:-}" ] || [ ! -f "$MANIFEST_PATH" ]; then
    echo ""
    return 0
  fi
  if command -v jq &> /dev/null; then
    jq -r --arg key "$key" --arg subkey "$subkey" '.[$key][$subkey] // ""' "$MANIFEST_PATH" 2>/dev/null || echo ""
  elif [ -n "$PYTHON_CMD" ]; then
    $PYTHON_CMD -c "
import json
try:
  with open(r'$MANIFEST_PATH_FOR_PYTHON', 'r', encoding='utf-8') as f:
    data = json.load(f)
  obj = data.get('$key', {}) or {}
  val = obj.get('$subkey', '') or ''
  print(val)
except Exception:
  print('')
" 2>/dev/null || echo ""
  else
    echo ""
  fi
}

# 读取 manifest 中的扁平文件分组（cursorFiles / claudeFiles / sharedFiles）
download_manifest_file_group() {
  local group_key="$1"
  local label="$2"
  local count=0
  while IFS= read -r file_path; do
    [ -z "$file_path" ] && continue
    file_path="${file_path//$'\r'/}"
    if ! download_file "$file_path" "$file_path"; then
      error "Failed to install ${label}: ${file_path}"
      return 1
    fi
    if [[ "$file_path" == *.sh ]]; then
      chmod +x "$file_path"
    fi
    count=$((count + 1))
  done < <(get_json_array "$group_key")

  if [ "$count" -gt 0 ]; then
    success "${label} downloaded (${count} files)"
  else
    warning "No ${label} found in manifest key: ${group_key}"
  fi
}

# 加载清单
load_manifest

LINGXI_VERSION=$(get_json_string "version")
[ -z "$LINGXI_VERSION" ] && LINGXI_VERSION="(unknown)"

info "Installing LingXi..."
info "Source: ${REPO_OWNER}/${REPO_NAME}"

# 检查目标目录是否存在
CURSOR_EXISTS=false
LINGXI_EXISTS=false

if [ -d ".cursor" ]; then
  CURSOR_EXISTS=true
  warning ".cursor already exists"
fi

if [ -d ".lingxi" ]; then
  LINGXI_EXISTS=true
  warning ".lingxi already exists"
fi

# 询问是否继续（合并安装模式）
response="n"
if [ "$CURSOR_EXISTS" = true ] || [ "$LINGXI_EXISTS" = true ]; then
  if [ "$AUTO_CONFIRM" = true ]; then
    response="y"
    info "Auto-confirm enabled: merge install mode"
  else
    echo ""
    info "Existing .cursor data detected. Merge install mode:"
    info " - Keep your non-LingXi files"
    info " - Overwrite LingXi files to latest version"
    echo ""

    if [ "$IS_INTERACTIVE_TERMINAL" = true ]; then
      read -p "Continue? (y/N): " -n 1 -r response
      echo ""
    elif [ -e /dev/tty ] && [ -r /dev/tty ]; then
      read -p "Continue? (y/N): " -n 1 -r response < /dev/tty
      echo ""
    fi
    if [[ ! "$response" =~ ^[yY]$ ]]; then
      info "Install cancelled"
      exit 0
    fi
  fi
fi

# 创建目录结构
info "Preparing directories..."
mkdir -p .cursor .claude hooks heartbeat-plugins scripts assets

# 下载新的双 IDE 分组文件（硬切换目录模型）
info "Downloading Cursor files..."
download_manifest_file_group "cursorFiles" "Cursor files" || exit 1

info "Downloading Claude files..."
download_manifest_file_group "claudeFiles" "Claude files" || exit 1

info "Downloading shared runtime files..."
download_manifest_file_group "sharedFiles" "shared files" || exit 1

# 将安装清单保存到用户项目，供卸载脚本读取
mkdir -p install
if [ -n "${MANIFEST_PATH:-}" ] && [ -f "$MANIFEST_PATH" ]; then
  cp "$MANIFEST_PATH" install/install-manifest.json
  success "Saved manifest to install/install-manifest.json"
fi

# 合并 packageScripts 到用户 package.json
if [ -f "package.json" ] && [ -f "install/install-manifest.json" ]; then
  if command -v jq &> /dev/null; then
    if jq -e '.packageScripts' install/install-manifest.json &>/dev/null; then
      jq '.scripts += input.packageScripts' package.json install/install-manifest.json > package.json.tmp && mv package.json.tmp package.json
      success "Merged lx scripts into package.json"
    fi
  elif [ -n "$PYTHON_CMD" ]; then
    $PYTHON_CMD -c "
import json
with open('package.json', 'r', encoding='utf-8') as f:
  p = json.load(f)
with open('install/install-manifest.json', 'r', encoding='utf-8') as f:
  m = json.load(f)
ps = m.get('packageScripts', {})
if ps:
  p.setdefault('scripts', {}).update(ps)
  with open('package.json', 'w', encoding='utf-8') as f:
    json.dump(p, f, ensure_ascii=False, indent=2)
" 2>/dev/null && success "Merged lx scripts into package.json"
  fi
fi

# 使用 workspace-bootstrap 初始化 .lingxi/（基于模板创建空白 INDEX 与模板文件）
info "Bootstrapping .lingxi..."
BOOTSTRAP_SCRIPT=$(get_json_object_value "bootstrap" "script")
BOOTSTRAP_INDEX_TEMPLATE=$(get_json_object_value "bootstrap" "indexTemplate")
if [ -z "$BOOTSTRAP_SCRIPT" ]; then
  BOOTSTRAP_SCRIPT=".cursor/skills/workspace-bootstrap/scripts/workspace-bootstrap.mjs"
fi
if [ -z "$BOOTSTRAP_INDEX_TEMPLATE" ]; then
  BOOTSTRAP_INDEX_TEMPLATE=".cursor/skills/workspace-bootstrap/references/INDEX.default.md"
fi
if command -v node &>/dev/null; then
  if node "$BOOTSTRAP_SCRIPT"; then
    success "Workspace bootstrap completed"
  else
    error "workspace-bootstrap failed"
    exit 1
  fi
else
  info "Node.js not found; using manifest fallback"
  while IFS= read -r dir; do
    [ -z "$dir" ] && continue
    dir="${dir//$'\r'/}"
    mkdir -p "$dir"
  done < <(get_json_array "workflowDirectories")
  if [ -f "$BOOTSTRAP_INDEX_TEMPLATE" ]; then
    cp "$BOOTSTRAP_INDEX_TEMPLATE" ".lingxi/memory/INDEX.md"
    success "Workspace bootstrap completed (no Node.js mode)"
  else
    error "Template file missing; ensure skills were downloaded"
    exit 1
  fi
fi

# 为 share 目录创建 .gitkeep 文件（确保空目录被 git 跟踪）
SHARE_DIR=".lingxi/memory/share"
if [ -d "$SHARE_DIR" ] && [ ! -f "$SHARE_DIR/.gitkeep" ]; then
  cat > "$SHARE_DIR/.gitkeep" << 'EOF'
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
EOF
fi

# 更新 .gitignore
info "Updating .gitignore..."
GITIGNORE_ENTRIES=()
while IFS= read -r entry; do
  entry="${entry//$'\r'/}"
  [ -n "$entry" ] && GITIGNORE_ENTRIES+=("$entry")
done < <(get_json_array "gitignoreEntries")

if [ -f ".gitignore" ]; then
  NEED_UPDATE=false
  for entry in "${GITIGNORE_ENTRIES[@]}"; do
    if [ -n "$entry" ] && ! grep -qF "$entry" .gitignore 2>/dev/null; then
      NEED_UPDATE=true
      break
    fi
  done

  if [ "$NEED_UPDATE" = true ]; then
    echo "" >> .gitignore
    echo "# LíngXī" >> .gitignore
    for entry in "${GITIGNORE_ENTRIES[@]}"; do
      [ -n "$entry" ] && echo "$entry" >> .gitignore
    done
    success ".gitignore updated"
  else
    info ".gitignore already contains required entries"
  fi
else
  cat > .gitignore << 'GITIGNOREEOF'
# Local workspace for temp code clones, generated artifacts, etc.
.lingxi/workspace/

# OS / IDE
.DS_Store
Thumbs.db
GITIGNOREEOF
  success ".gitignore created"
fi

# 输出成功信息
echo ""
success "Install complete"
if [ -n "$LINGXI_VERSION" ] && [ "$LINGXI_VERSION" != "(unknown)" ]; then
  info "Version: ${LINGXI_VERSION}"
fi
echo ""
if [ "$CURSOR_EXISTS" = true ] || [ "$LINGXI_EXISTS" = true ]; then
  info "Merge mode: kept non-LingXi files and updated LingXi files"
fi
info "Next: open project in Cursor or Claude Code and run /init"

# 清理临时文件
if [ -n "${MANIFEST_PATH:-}" ] && [ -f "$MANIFEST_PATH" ]; then
  rm -f "$MANIFEST_PATH"
fi
