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

# 读取安装清单（从 GitHub 下载）
load_manifest() {
    local base_url="${BASE_URL%/}"
    local manifest_url="${base_url}/install/install-manifest.json"
    local manifest_path=$(mktemp)

    info "下载安装清单..."
    # 使用 -- 明确分隔选项和 URL，避免 Git Bash curl 解析问题
    # 注意：-o 选项必须在 -- 之前，否则会被当作 URL 处理
    if ! curl -fsSL -o "$manifest_path" -- "$manifest_url"; then
        error "下载安装清单失败: $manifest_url"
        exit 1
    fi

    # 保存清单文件路径供后续使用
    # 对于 bash/curl 使用原始路径，对于 Python 使用转换后的路径
    MANIFEST_PATH="$manifest_path"
    MANIFEST_PATH_FOR_PYTHON=$(convert_path_for_python "$manifest_path")

    # 验证 JSON 格式是否正确，并检查是否有解析工具
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
    if [ -z "$MANIFEST_PATH" ] || [ ! -f "$MANIFEST_PATH" ]; then
        error "清单文件不存在，无法解析"
        return 1
    fi
    if command -v jq &> /dev/null; then
        jq -r ".$key[]" "$MANIFEST_PATH" 2>/dev/null || return 1
    elif [ -n "$PYTHON_CMD" ]; then
        # 使用 Python 解析 JSON，输出每个项目（每行一个）
        # 注意：Windows Python 默认输出 CRLF，需要强制使用 LF
        $PYTHON_CMD -c "
import sys
import json
# Windows Python 默认使用 CRLF，强制使用 Unix 换行符
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
    if [ -z "$MANIFEST_PATH" ] || [ ! -f "$MANIFEST_PATH" ]; then
        error "清单文件不存在，无法解析"
        return 1
    fi
    if command -v jq &> /dev/null; then
        jq -r ".$key.$subkey[]" "$MANIFEST_PATH" 2>/dev/null || return 1
    elif [ -n "$PYTHON_CMD" ]; then
        # 使用 Python 解析 JSON，输出每个项目（每行一个）
        # 注意：Windows Python 默认输出 CRLF，需要强制使用 LF
        $PYTHON_CMD -c "
import sys
import json
# Windows Python 默认使用 CRLF，强制使用 Unix 换行符
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
if [ "$CURSOR_EXISTS" = true ] || [ "$LINGXI_EXISTS" = true ]; then
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
    # 去除可能的 Windows 回车符（\r），避免 Git Bash 环境下 URL 格式错误
    remote_path="${remote_path//$'\r'/}"
    local_path="${local_path//$'\r'/}"
    # 确保 BASE_URL 不以斜杠结尾，remote_path 不以斜杠开头
    local base_url="${BASE_URL%/}"
    local clean_remote_path="${remote_path#/}"
    local url="${base_url}/${clean_remote_path}"
    local max_retries=3
    local retry_count=0

    info "下载: ${remote_path}"
    mkdir -p "$(dirname "$local_path")"

    while [ $retry_count -lt $max_retries ]; do
        # 使用 -- 明确分隔选项和 URL，避免 Git Bash curl 解析问题
        # 注意：-o 选项必须在 -- 之前，否则会被当作 URL 处理
        if curl -fsSL -o "$local_path" -- "$url"; then
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
mkdir -p .cursor/agents

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

# 下载 agents 文件
info "下载 agents..."
agent_count=0
while IFS= read -r agent_file; do
    [ -z "$agent_file" ] && continue
    local_file=".cursor/${agent_file}"
    if ! download_file ".cursor/${agent_file}" "$local_file"; then
        error "安装失败"
        exit 1
    fi
    agent_count=$((agent_count + 1))
done < <(get_json_object_array "agents" "files")
success "已下载 agents ($agent_count 个文件)"

# 下载引用文件
ref_count=0
# 动态遍历所有 references（experience-curator, agents 等）
# 获取 references 对象的所有 keys
if command -v jq &> /dev/null; then
    # 使用 jq 获取所有 keys
    for ref_key in $(jq -r '.references | keys[]' "$MANIFEST_PATH" 2>/dev/null); do
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
elif [ -n "$PYTHON_CMD" ]; then
    # 使用 Python 获取所有 keys
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
else
    error "需要 jq 或 Python 3 来解析 JSON references"
    exit 1
fi

success "已下载 skills ($skill_count 个核心 skills + $ref_count 个引用文件)"

# 创建 .cursor/.lingxi 目录结构
info "创建 .cursor/.lingxi 目录结构..."
while IFS= read -r dir; do
    [ -z "$dir" ] && continue
    # 去除可能的 Windows 回车符（\r）
    dir="${dir//$'\r'/}"
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

# 下载模板文件
info "下载模板文件..."
template_count=0
while IFS= read -r template_file; do
    [ -z "$template_file" ] && continue
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
    # 去除可能的 Windows 回车符（\r）
    entry="${entry//$'\r'/}"
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
.cursor/.lingxi/workspace/

# Session-level context (ephemeral, not a knowledge base)
.cursor/.lingxi/context/session/

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
echo "  - .cursor/agents/ ($agent_count 个文件)"
echo "  - .cursor/.lingxi/ 目录结构"
if [ "$CURSOR_EXISTS" = true ] || [ "$LINGXI_EXISTS" = true ]; then
    echo ""
    info "✓ 已保留您现有的文件（合并安装模式）"
fi
echo ""
info "下一步："
echo "  1. 在 Cursor 中打开项目"
echo "  2. 运行 /req <需求描述> 创建第一个需求"
echo "  3. 查看 README.md 了解完整工作流"
echo ""
info "更多信息：https://github.com/${REPO_OWNER}/${REPO_NAME}"
info "仓库地址：git@github.com:${REPO_OWNER}/${REPO_NAME}.git"

# 清理临时文件
if [ -n "${MANIFEST_PATH:-}" ] && [ -f "$MANIFEST_PATH" ]; then
    rm -f "$MANIFEST_PATH"
fi