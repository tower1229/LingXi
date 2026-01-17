#!/usr/bin/env bash

# LíngXī 远程安装脚本
# 直接从 GitHub 下载并安装到当前项目
# Version: 1.0.3

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

# 读取安装清单（从 GitHub 下载）
load_manifest() {
    local manifest_url="${BASE_URL}/install/install-manifest.json"
    local manifest_path=$(mktemp)

    info "下载安装清单..."
    if ! curl -f -sSL "$manifest_url" -o "$manifest_path"; then
        error "下载安装清单失败: $manifest_url"
        exit 1
    fi

    # 保存清单文件路径供后续使用（避免将 JSON 存到变量中导致 bash 解析问题）
    MANIFEST_PATH="$manifest_path"
    
    # 验证 JSON 格式是否正确，并检查是否有解析工具
    if command -v jq &> /dev/null; then
        if ! jq empty "$manifest_path" 2>/dev/null; then
            error "下载的 JSON 清单格式无效"
            rm -f "$manifest_path"
            exit 1
        fi
        return 0
    elif command -v python3 &> /dev/null; then
        if ! python3 -c "import json; json.load(open('$manifest_path'))" 2>/dev/null; then
            error "下载的 JSON 清单格式无效"
            rm -f "$manifest_path"
            exit 1
        fi
        return 0
    else
        error "需要 jq 或 python3 来解析 JSON 清单文件"
        error "请安装 jq: https://stedolan.github.io/jq/download/"
        rm -f "$manifest_path"
        exit 1
    fi
}

# 使用 jq 或 python3 获取 JSON 数组值
get_json_array() {
    local key=$1
    if [ -z "$MANIFEST_PATH" ] || [ ! -f "$MANIFEST_PATH" ]; then
        error "清单文件不存在，无法解析"
        return 1
    fi
    if command -v jq &> /dev/null; then
        jq -r ".$key[]" "$MANIFEST_PATH" 2>/dev/null || return 1
    elif command -v python3 &> /dev/null; then
        # 使用 Python 解析 JSON，输出每个项目（每行一个）
        python3 -c "
import sys
import json
try:
    with open('$MANIFEST_PATH', 'r', encoding='utf-8') as f:
        data = json.load(f)
    items = data.get('$key', [])
    for item in items:
        print(item)
except Exception as e:
    sys.stderr.write(f'JSON 解析错误: {e}\n')
    sys.exit(1)
" 2>/dev/null || return 1
    else
        error "需要 jq 或 python3 来解析 JSON"
        return 1
    fi
}

# 使用 jq 或 python3 获取 JSON 对象数组值
get_json_object_array() {
    local key=$1
    local subkey=$2
    if [ -z "$MANIFEST_PATH" ] || [ ! -f "$MANIFEST_PATH" ]; then
        error "清单文件不存在，无法解析"
        return 1
    fi
    if command -v jq &> /dev/null; then
        jq -r ".$key.$subkey[]" "$MANIFEST_PATH" 2>/dev/null || return 1
    elif command -v python3 &> /dev/null; then
        # 使用 Python 解析 JSON，输出每个项目（每行一个）
        python3 -c "
import sys
import json
try:
    with open('$MANIFEST_PATH', 'r', encoding='utf-8') as f:
        data = json.load(f)
    items = data.get('$key', {}).get('$subkey', [])
    for item in items:
        print(item)
except Exception as e:
    sys.stderr.write(f'JSON 解析错误: {e}\n')
    sys.exit(1)
" 2>/dev/null || return 1
    else
        error "需要 jq 或 python3 来解析 JSON"
        return 1
    fi
}

# 加载清单
load_manifest

info "开始安装 LíngXī..."
info "从 GitHub 下载文件: ${REPO_OWNER}/${REPO_NAME}"

# 检查目标目录是否存在
CURSOR_EXISTS=false
WORKFLOW_EXISTS=false

if [ -d ".cursor" ]; then
    CURSOR_EXISTS=true
    warning ".cursor 目录已存在"
fi

if [ -d ".workflow" ]; then
    WORKFLOW_EXISTS=true
    warning ".workflow 目录已存在"
fi

# 询问是否继续（合并安装模式）
if [ "$CURSOR_EXISTS" = true ] || [ "$WORKFLOW_EXISTS" = true ]; then
    if [ "$AUTO_CONFIRM" = true ]; then
        # 设置了 AUTO_CONFIRM，自动确认
        response="y"
        info "自动确认：将以合并模式安装（保留现有文件，仅添加/更新灵犀文件）"
    else
        # 询问用户确认（交互式）
        echo ""
        info "检测到已有目录，将以合并模式安装："
        info "  - 保留您现有的文件（rules、plans 等）"
        info "  - 仅添加/更新灵犀需要的文件"
        echo ""
        
        # 检测是否在交互式终端中，支持管道执行
        # 最佳实践：先检查 stdin 是否为终端，再尝试 /dev/tty
        if [ "$IS_INTERACTIVE_TERMINAL" = true ]; then
            # stdin 是终端，可以直接读取
            read -p "是否继续？ (y/N): " -n 1 -r response
            echo ""
        elif [ -e /dev/tty ] && [ -r /dev/tty ]; then
            # stdin 不是终端（可能是管道），尝试从 /dev/tty 读取
            # 这是管道执行时的标准做法（如 Homebrew、nvm）
            read -p "是否继续？ (y/N): " -n 1 -r response </dev/tty
            echo ""
        else
            # 无法读取交互式输入（可能是 cron、CI 等环境）
            # 提供清晰的错误信息和解决方案
            warning "无法读取交互式输入，安装已取消"
            warning "提示："
            warning "  - 使用 AUTO_CONFIRM=true 可自动确认"
            warning "  - 或使用 NONINTERACTIVE=1（类似 Homebrew）"
            warning "  - 或先下载脚本再执行：bash <(curl -fsSL URL)"
            exit 0
        fi
        
        if [[ ! $response =~ ^[Yy]$ ]]; then
            info "安装已取消"
            exit 0
        fi
    fi
fi

# 下载函数（带重试机制）
download_file() {
    local remote_path=$1
    local local_path=$2
    local url="${BASE_URL}/${remote_path}"
    local max_retries=3
    local retry_count=0

    info "下载: ${remote_path}"
    mkdir -p "$(dirname "$local_path")"

    while [ $retry_count -lt $max_retries ]; do
        if curl -f -sSL "$url" -o "$local_path"; then
            return 0
        fi
        retry_count=$((retry_count + 1))
        if [ $retry_count -lt $max_retries ]; then
            warning "下载失败，重试中 ($retry_count/$max_retries)..."
            sleep 1
        fi
    done

    error "下载失败: ${url} (已重试 $max_retries 次)"
    return 1
}

# 创建 .cursor 目录结构
info "创建 .cursor 目录结构..."
mkdir -p .cursor/commands
mkdir -p .cursor/rules
mkdir -p .cursor/skills
mkdir -p .cursor/hooks

# 下载 commands 文件
info "下载 commands..."
command_count=0
while IFS= read -r cmd; do
    [ -z "$cmd" ] && continue
    local_file=".cursor/${cmd}"
    if ! download_file ".cursor/${cmd}" "$local_file"; then
        error "安装失败"
        exit 1
    fi
    command_count=$((command_count + 1))
done < <(get_json_array "commands")
success "已下载 commands ($command_count 个文件)"

# 下载 rules 文件（项目级质量准则）
# 注意：qs-i-workflow 不在列表中（仅用于本项目开发）
info "下载 rules..."

# 创建规则目录
while IFS= read -r rule_dir; do
    [ -z "$rule_dir" ] && continue
    mkdir -p ".cursor/${rule_dir}"
done < <(get_json_object_array "rules" "directories")

# 下载规则文件
rule_dir_count=0
while IFS= read -r rule_dir; do
    [ -z "$rule_dir" ] && continue
    rule_dir_count=$((rule_dir_count + 1))
done < <(get_json_object_array "rules" "directories")

rule_file_count=0
while IFS= read -r rule_file; do
    [ -z "$rule_file" ] && continue
    local_file=".cursor/${rule_file}"
    if ! download_file ".cursor/${rule_file}" "$local_file"; then
        error "安装失败"
        exit 1
    fi
    rule_file_count=$((rule_file_count + 1))
done < <(get_json_object_array "rules" "files")

success "已下载 rules ($rule_dir_count 个规则目录 + $rule_file_count 个文件)"


# 下载 hooks 配置与脚本
info "下载 hooks..."
hook_count=0
while IFS= read -r hook_file; do
    [ -z "$hook_file" ] && continue
    local_file=".cursor/${hook_file}"
    if ! download_file ".cursor/${hook_file}" "$local_file"; then
        error "安装失败"
        exit 1
    fi
    hook_count=$((hook_count + 1))
done < <(get_json_object_array "hooks" "files")
success "已下载 hooks ($hook_count 个文件)"

# 下载 skills
info "下载 skills..."
skill_count=0
while IFS= read -r skill; do
    [ -z "$skill" ] && continue
    local_file=".cursor/${skill}"
    if ! download_file ".cursor/${skill}" "$local_file"; then
        error "安装失败"
        exit 1
    fi
    skill_count=$((skill_count + 1))
done < <(get_json_array "skills")

# 下载引用文件
ref_count=0
for ref_key in experience-curator flow-router; do
    while IFS= read -r ref_file; do
        [ -z "$ref_file" ] && continue
        mkdir -p ".cursor/$(dirname "$ref_file")"
        local_file=".cursor/${ref_file}"
        if ! download_file ".cursor/${ref_file}" "$local_file"; then
            error "安装失败"
            exit 1
        fi
        ref_count=$((ref_count + 1))
    done < <(get_json_object_array "references" "$ref_key")
done

success "已下载 skills ($skill_count 个核心 skills + $ref_count 个引用文件)"

# 创建 .workflow 目录结构
info "创建 .workflow 目录结构..."
while IFS= read -r dir; do
    [ -z "$dir" ] && continue
    mkdir -p "$dir"
done < <(get_json_array "workflowDirectories")

# 下载 INDEX.md 文件
info "下载索引文件..."
while IFS= read -r index_file; do
    [ -z "$index_file" ] && continue
    if ! download_file "$index_file" "$index_file"; then
        error "安装失败"
        exit 1
    fi
done < <(get_json_array "workflowIndexFiles")
success "已下载索引文件"

# 更新 .gitignore
info "更新 .gitignore..."
GITIGNORE_ENTRIES=()
while IFS= read -r entry; do
    GITIGNORE_ENTRIES+=("$entry")
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
            echo "$entry" >> .gitignore
        done
        success "已更新 .gitignore"
    else
        info ".gitignore 已包含相关条目，跳过更新"
    fi
else
    cat > .gitignore << 'EOF'
# Local workspace for temp code clones, generated artifacts, etc.
.workflow/workspace/

# Session-level context (ephemeral, not a knowledge base)
.workflow/context/session/

# OS / IDE
.DS_Store
Thumbs.db
EOF
    success "已创建 .gitignore"
fi

# 输出成功信息
echo ""
success "安装完成！"
echo ""
info "已安装的文件："
echo "  - .cursor/commands/ ($command_count 个命令)"
echo "  - .cursor/rules/ ($rule_dir_count 个规则目录 + $rule_file_count 个文件)"
echo "  - .cursor/skills/ ($skill_count 个核心 Agent Skills)"
echo "  - .workflow/ 目录结构"
if [ "$CURSOR_EXISTS" = true ] || [ "$WORKFLOW_EXISTS" = true ]; then
    echo ""
    info "✓ 已保留您现有的文件（合并安装模式）"
fi
echo ""
info "下一步："
echo "  1. 在 Cursor 中打开项目"
echo "  2. 运行 /flow <需求描述> 创建第一个需求"
echo "  3. 查看 README.md 了解完整工作流"
echo ""
info "更多信息：https://github.com/${REPO_OWNER}/${REPO_NAME}"
info "仓库地址：git@github.com:${REPO_OWNER}/${REPO_NAME}.git"

# 清理临时文件
if [ -n "${MANIFEST_PATH:-}" ] && [ -f "$MANIFEST_PATH" ]; then
    rm -f "$MANIFEST_PATH"
fi