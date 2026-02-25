#!/usr/bin/env bash

# LíngXī 远程安装脚本
# 直接从 GitHub 下载并安装到当前项目
# Version: 1.1.0

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
    error "$1 未安装，请先安装 $1"
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

# 下载单个文件（远程路径与本地路径均相对项目根，如 .cursor/commands/req.md）
download_file() {
  local remote_path="$1"
  local local_path="$2"
  local url="${BASE_URL%/}/${remote_path}"
  local dir
  dir="$(dirname "$local_path")"
  mkdir -p "$dir"
  info "下载: ${remote_path}"
  if ! curl -fsSL -o "$local_path" -- "$url"; then
    error "下载失败: $url"
    return 1
  fi
  return 0
}

# 读取安装清单（从 GitHub 下载）
load_manifest() {
  local base_url="${BASE_URL%/}"
  local manifest_url="${base_url}/install/install-manifest.json"
  local manifest_path
  manifest_path=$(mktemp)

  info "下载安装清单..."
  if ! curl -fsSL -o "$manifest_path" -- "$manifest_url"; then
    error "下载安装清单失败: $manifest_url"
    exit 1
  fi

  MANIFEST_PATH="$manifest_path"
  MANIFEST_PATH_FOR_PYTHON=$(convert_path_for_python "$manifest_path")

  # 验证 JSON 格式
  if command -v jq &> /dev/null; then
    if ! jq empty "$manifest_path" 2>/dev/null; then
      error "下载的 JSON 清单格式无效"
      rm -f "$manifest_path"
      exit 1
    fi
    return 0
  elif [ -n "$PYTHON_CMD" ]; then
    if ! $PYTHON_CMD -c "import json; json.load(open(r'$MANIFEST_PATH_FOR_PYTHON'))" 2>/dev/null; then
      error "下载的 JSON 清单格式无效"
      rm -f "$manifest_path"
      exit 1
    fi
    return 0
  else
    error "需要 jq 或 Python 3 来解析 JSON 清单文件"
    error "请安装 jq: https://stedolan.github.io/jq/download/"
    error "或安装 Python 3: https://www.python.org/downloads/"
    rm -f "$manifest_path"
    exit 1
  fi
}

# 使用 jq 或 python3 获取 JSON 数组值
get_json_array() {
  local key=$1
  if [ -z "${MANIFEST_PATH:-}" ] || [ ! -f "$MANIFEST_PATH" ]; then
    error "清单文件不存在，无法解析"
    return 1
  fi
  if command -v jq &> /dev/null; then
    jq -r ".$key[]" "$MANIFEST_PATH" 2>/dev/null || return 1
  elif [ -n "$PYTHON_CMD" ]; then
    $PYTHON_CMD -c "
import sys
import json
if hasattr(sys.stdout, 'reconfigure'):
  sys.stdout.reconfigure(newline='\n')
try:
  with open(r'$MANIFEST_PATH_FOR_PYTHON', 'r', encoding='utf-8') as f:
    data = json.load(f)
  items = data.get('$key', [])
  for item in items:
    print(item)
except Exception as e:
  sys.stderr.write(f'JSON 解析错误: {e}\n')
  sys.exit(1)
" 2>/dev/null || return 1
  else
    error "需要 jq 或 Python 3 来解析 JSON"
    return 1
  fi
}

# 使用 jq 或 Python 获取 JSON 对象数组值
get_json_object_array() {
  local key=$1
  local subkey=$2
  if [ -z "${MANIFEST_PATH:-}" ] || [ ! -f "$MANIFEST_PATH" ]; then
    error "清单文件不存在，无法解析"
    return 1
  fi
  if command -v jq &> /dev/null; then
    jq -r ".$key.$subkey[]" "$MANIFEST_PATH" 2>/dev/null || return 1
  elif [ -n "$PYTHON_CMD" ]; then
    $PYTHON_CMD -c "
import sys
import json
if hasattr(sys.stdout, 'reconfigure'):
  sys.stdout.reconfigure(newline='\n')
try:
  with open(r'$MANIFEST_PATH_FOR_PYTHON', 'r', encoding='utf-8') as f:
    data = json.load(f)
  items = data.get('$key', {}).get('$subkey', [])
  for item in items:
    print(item)
except Exception as e:
  sys.stderr.write(f'JSON 解析错误: {e}\n')
  sys.exit(1)
" 2>/dev/null || return 1
  else
    error "需要 jq 或 Python 3 来解析 JSON"
    return 1
  fi
}

# 加载清单
load_manifest

info "开始安装 LíngXī..."
info "从 GitHub 下载文件: ${REPO_OWNER}/${REPO_NAME}"

# 检查目标目录是否存在
CURSOR_EXISTS=false
LINGXI_EXISTS=false

if [ -d ".cursor" ]; then
  CURSOR_EXISTS=true
  warning ".cursor 目录已存在"
fi

if [ -d ".cursor/.lingxi" ]; then
  LINGXI_EXISTS=true
  warning ".cursor/.lingxi 目录已存在"
fi

# 询问是否继续（合并安装模式）
response="n"
if [ "$CURSOR_EXISTS" = true ] || [ "$LINGXI_EXISTS" = true ]; then
  if [ "$AUTO_CONFIRM" = true ]; then
    response="y"
    info "自动确认：将以合并模式安装（保留现有文件，仅添加/更新灵犀文件）"
  else
    echo ""
    info "检测到已有目录，将以合并模式安装："
    info " - 保留您现有的文件（plans 等）"
    info " - 仅添加/更新灵犀需要的文件"
    echo ""

    if [ "$IS_INTERACTIVE_TERMINAL" = true ]; then
      read -p "是否继续？ (y/N): " -n 1 -r response
      echo ""
    elif [ -e /dev/tty ] && [ -r /dev/tty ]; then
      read -p "是否继续？ (y/N): " -n 1 -r response < /dev/tty
      echo ""
    fi
    if [[ ! "$response" =~ ^[yY]$ ]]; then
      info "安装已取消"
      exit 0
    fi
  fi
fi

# 创建 .cursor 目录结构
info "创建 .cursor 目录结构..."
mkdir -p .cursor/commands .cursor/skills .cursor/rules .cursor/hooks .cursor/agents

# 下载 commands（清单中路径相对 .cursor/，下载到 .cursor/）
info "下载 commands..."
command_count=0
while IFS= read -r cmd; do
  [ -z "$cmd" ] && continue
  cmd="${cmd//$'\r'/}"
  if ! download_file ".cursor/${cmd}" ".cursor/${cmd}"; then
    error "安装失败"
    exit 1
  fi
  command_count=$((command_count + 1))
done < <(get_json_array "commands")
success "已下载 commands ($command_count 个文件)"

# 下载 rules
info "下载 rules..."
rule_count=0
while IFS= read -r rule; do
  [ -z "$rule" ] && continue
  rule="${rule//$'\r'/}"
  if ! download_file ".cursor/${rule}" ".cursor/${rule}"; then
    error "安装失败"
    exit 1
  fi
  rule_count=$((rule_count + 1))
done < <(get_json_array "rules")
success "已下载 rules ($rule_count 个文件)"

# 下载 hooks
info "下载 hooks..."
hook_count=0
while IFS= read -r hook_file; do
  [ -z "$hook_file" ] && continue
  hook_file="${hook_file//$'\r'/}"
  if ! download_file ".cursor/${hook_file}" ".cursor/${hook_file}"; then
    error "安装失败"
    exit 1
  fi
  hook_count=$((hook_count + 1))
done < <(get_json_object_array "hooks" "files")
success "已下载 hooks ($hook_count 个文件)"

# 下载 skills（仅 SKILL.md）
info "下载 skills..."
skill_count=0
while IFS= read -r skill; do
  [ -z "$skill" ] && continue
  skill="${skill//$'\r'/}"
  if ! download_file ".cursor/${skill}" ".cursor/${skill}"; then
    error "安装失败"
    exit 1
  fi
  skill_count=$((skill_count + 1))
done < <(get_json_array "skills")

# 下载 agents
info "下载 agents..."
agent_count=0
while IFS= read -r agent_file; do
  [ -z "$agent_file" ] && continue
  agent_file="${agent_file//$'\r'/}"
  if ! download_file ".cursor/${agent_file}" ".cursor/${agent_file}"; then
    error "安装失败"
    exit 1
  fi
  agent_count=$((agent_count + 1))
done < <(get_json_object_array "agents" "files")
success "已下载 agents ($agent_count 个文件)"

# 下载 references（按 skill 分组）
ref_count=0
if command -v jq &> /dev/null; then
  for ref_key in $(jq -r '.references | keys[]' "$MANIFEST_PATH" 2>/dev/null); do
    while IFS= read -r ref_file; do
      [ -z "$ref_file" ] && continue
      ref_file="${ref_file//$'\r'/}"
      if ! download_file ".cursor/${ref_file}" ".cursor/${ref_file}"; then
        error "安装失败"
        exit 1
      fi
      ref_count=$((ref_count + 1))
    done < <(get_json_object_array "references" "$ref_key")
  done
elif [ -n "$PYTHON_CMD" ]; then
  for ref_key in $($PYTHON_CMD -c "
import sys
import json
if hasattr(sys.stdout, 'reconfigure'):
  sys.stdout.reconfigure(newline='\n')
try:
  with open(r'$MANIFEST_PATH_FOR_PYTHON', 'r', encoding='utf-8') as f:
    data = json.load(f)
  refs = data.get('references', {})
  for key in refs.keys():
    print(key)
except Exception as e:
  sys.stderr.write(f'JSON 解析错误: {e}\n')
  sys.exit(1)
" 2>/dev/null); do
    ref_key="${ref_key//$'\r'/}"
    while IFS= read -r ref_file; do
      [ -z "$ref_file" ] && continue
      ref_file="${ref_file//$'\r'/}"
      if ! download_file ".cursor/${ref_file}" ".cursor/${ref_file}"; then
        error "安装失败"
        exit 1
      fi
      ref_count=$((ref_count + 1))
    done < <(get_json_object_array "references" "$ref_key")
  done
else
  error "需要 jq 或 Python 3 来解析 JSON references"
  exit 1
fi

success "已下载 skills ($skill_count 个核心 skills + $ref_count 个引用文件)"

# 创建 .cursor/.lingxi 目录结构
info "创建 .cursor/.lingxi 目录结构..."
while IFS= read -r dir; do
  [ -z "$dir" ] && continue
  dir="${dir//$'\r'/}"
  mkdir -p "$dir"
done < <(get_json_array "workflowDirectories")

# 为 share 目录创建 .gitkeep 文件（确保空目录被 git 跟踪）
SHARE_DIR=".cursor/.lingxi/memory/notes/share"
if [ -d "$SHARE_DIR" ] && [ ! -f "$SHARE_DIR/.gitkeep" ]; then
  cat > "$SHARE_DIR/.gitkeep" << 'EOF'
# Share Directory
#
# 此目录用于存放可跨项目复用的团队级记忆（推荐作为 git submodule）
#
# 使用方式：
# 1. 添加 share 仓库（submodule）：
# git submodule add <shareRepoUrl> .cursor/.lingxi/memory/notes/share
#
# 2. 更新 share 仓库：
# git submodule update --remote --merge
#
# 3. 同步记忆索引（新增共享经验后执行）：
# npm run memory-sync
#
# 推荐约定：
# - 团队级质量标准：Audience=team，Portability=cross-project
# - 团队级常见需求标准方案：Audience=team，Portability=cross-project
# - 前后端/运维默认约定：Audience=team，Portability=cross-project
# - 项目内特殊备忘：Audience=project，Portability=project-only（不放入 share）
EOF
fi

# 下载 INDEX.md 文件
info "下载索引文件..."
while IFS= read -r index_file; do
  [ -z "$index_file" ] && continue
  index_file="${index_file//$'\r'/}"
  if ! download_file "$index_file" "$index_file"; then
    error "安装失败"
    exit 1
  fi
done < <(get_json_array "workflowIndexFiles")
success "已下载索引文件"

# 下载模板文件
info "下载模板文件..."
template_count=0
while IFS= read -r template_file; do
  [ -z "$template_file" ] && continue
  template_file="${template_file//$'\r'/}"
  if ! download_file "$template_file" "$template_file"; then
    error "安装失败"
    exit 1
  fi
  template_count=$((template_count + 1))
done < <(get_json_array "workflowTemplateFiles")
if [ $template_count -gt 0 ]; then
  success "已下载模板文件 ($template_count 个)"
fi

# 更新 .gitignore
info "更新 .gitignore..."
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
    success "已更新 .gitignore"
  else
    info ".gitignore 已包含相关条目，跳过更新"
  fi
else
  cat > .gitignore << 'GITIGNOREEOF'
# Local workspace for temp code clones, generated artifacts, etc.
.cursor/.lingxi/workspace/

# OS / IDE
.DS_Store
Thumbs.db
GITIGNOREEOF
  success "已创建 .gitignore"
fi

# 输出成功信息
echo ""
success "安装完成！"
echo ""
info "已安装的文件："
echo " - .cursor/commands/ ($command_count 个命令)"
echo " - .cursor/rules/ ($rule_count 个规则)"
echo " - .cursor/skills/ ($skill_count 个核心 Agent Skills)"
echo " - .cursor/agents/ ($agent_count 个文件)"
echo " - .cursor/.lingxi/ 目录结构"
if [ "$CURSOR_EXISTS" = true ] || [ "$LINGXI_EXISTS" = true ]; then
  echo ""
  info "✓ 已保留您现有的文件（合并安装模式）"
fi
echo ""
info "下一步："
echo " 1. 在 Cursor 中打开项目"
echo " 2. 运行 /init 初始化项目（推荐）"
echo " 3. 运行 /req <需求描述> 创建第一个需求"
echo " 4. 查看 README.md 了解完整工作流"
echo ""
info "经验共享（可选，跨项目复用）："
echo " - share 目录（已创建）：.cursor/.lingxi/memory/notes/share/"
echo " - 添加共享记忆仓库（git submodule）：git submodule add <shareRepoUrl> .cursor/.lingxi/memory/notes/share"
echo " - 更新索引：npm run memory-sync（需 Node.js；或 yarn memory-sync）"
echo ""
info "更多信息：https://github.com/${REPO_OWNER}/${REPO_NAME}"
info "仓库地址：git@github.com:${REPO_OWNER}/${REPO_NAME}.git"

# 清理临时文件
if [ -n "${MANIFEST_PATH:-}" ] && [ -f "$MANIFEST_PATH" ]; then
  rm -f "$MANIFEST_PATH"
fi
