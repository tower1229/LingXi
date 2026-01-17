#!/bin/bash

# LíngXī 安装脚本
# 将 LingXi 模板集成到当前项目

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
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

# 检查命令是否存在
check_command() {
    if ! command -v "$1" &> /dev/null; then
        error "$1 未安装，请先安装 $1"
        exit 1
    fi
}

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 读取安装清单
load_manifest() {
    local manifest_path="$SCRIPT_DIR/install-manifest.json"
    if [ ! -f "$manifest_path" ]; then
        error "未找到安装清单文件: $manifest_path"
        error "请确保 install-manifest.json 文件存在"
        exit 1
    fi

    # 尝试使用 jq 解析
    if command -v jq &> /dev/null; then
        MANIFEST_JSON=$(cat "$manifest_path")
        return 0
    fi

    # 尝试使用 python3 解析
    if command -v python3 &> /dev/null; then
        MANIFEST_JSON=$(cat "$manifest_path")
        return 0
    fi

    error "需要 jq 或 python3 来解析 JSON 清单文件"
    error "请安装 jq: https://stedolan.github.io/jq/download/"
    exit 1
}

# 使用 jq 或 python3 获取 JSON 数组值
get_json_array() {
    local key=$1
    if command -v jq &> /dev/null; then
        echo "$MANIFEST_JSON" | jq -r ".$key[]" 2>/dev/null
    elif command -v python3 &> /dev/null; then
        echo "$MANIFEST_JSON" | python3 -c "import sys, json; data = json.load(sys.stdin); [print(item) for item in data.get('$key', [])]" 2>/dev/null
    fi
}

# 使用 jq 或 python3 获取 JSON 对象数组值
get_json_object_array() {
    local key=$1
    local subkey=$2
    if command -v jq &> /dev/null; then
        echo "$MANIFEST_JSON" | jq -r ".$key.$subkey[]" 2>/dev/null
    elif command -v python3 &> /dev/null; then
        echo "$MANIFEST_JSON" | python3 -c "import sys, json; data = json.load(sys.stdin); [print(item) for item in data.get('$key', {}).get('$subkey', [])]" 2>/dev/null
    fi
}

# 加载清单
load_manifest

# 检查是否在正确的目录
if [ ! -d "$SCRIPT_DIR/.cursor" ] || [ ! -d "$SCRIPT_DIR/.workflow" ]; then
    error "未找到 .cursor 或 .workflow 目录"
    error "请确保在 LingXi 模板仓库的根目录运行此脚本"
    exit 1
fi

info "开始安装 LíngXī..."

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

# 询问是否继续
if [ "$CURSOR_EXISTS" = true ] || [ "$WORKFLOW_EXISTS" = true ]; then
    echo ""
    read -p "是否继续？这将覆盖现有文件 (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "安装已取消"
        exit 0
    fi
fi

# 创建 .cursor 目录结构
info "创建 .cursor 目录结构..."
mkdir -p .cursor/commands
mkdir -p .cursor/rules
mkdir -p .cursor/skills
mkdir -p .cursor/hooks

# 复制 commands
info "复制 commands..."
command_count=0
while IFS= read -r cmd; do
    [ -z "$cmd" ] && continue
    src_path="$SCRIPT_DIR/.cursor/$cmd"
    dest_path=".cursor/$cmd"
    dest_dir=$(dirname "$dest_path")
    mkdir -p "$dest_dir"
    cp "$src_path" "$dest_path"
    ((command_count++))
done < <(get_json_array "commands")
success "已复制 commands ($command_count 个文件)"

# 复制 rules（项目级质量准则）
# 注意：qs-i-workflow 不在列表中（仅用于本项目开发）
info "复制 rules..."

# 复制规则目录
rule_dir_count=0
while IFS= read -r rule_dir; do
    [ -z "$rule_dir" ] && continue
    src_path="$SCRIPT_DIR/.cursor/$rule_dir"
    dest_path=".cursor/$rule_dir"
    cp -r "$src_path" "$dest_path"
    ((rule_dir_count++))
done < <(get_json_object_array "rules" "directories")

# 复制规则文件
rule_file_count=0
while IFS= read -r rule_file; do
    [ -z "$rule_file" ] && continue
    src_path="$SCRIPT_DIR/.cursor/$rule_file"
    dest_path=".cursor/$rule_file"
    dest_dir=$(dirname "$dest_path")
    mkdir -p "$dest_dir"
    cp "$src_path" "$dest_path"
    ((rule_file_count++))
done < <(get_json_object_array "rules" "files")

success "已复制 rules ($rule_dir_count 个规则目录 + $rule_file_count 个文件)"


# 复制 skills
info "复制 skills..."
cp -r "$SCRIPT_DIR/.cursor/skills/"* .cursor/skills/
success "已复制 skills"

# 复制 hooks（hooks.json + scripts）
info "复制 hooks..."
cp -r "$SCRIPT_DIR/.cursor/hooks/"* .cursor/hooks/
cp "$SCRIPT_DIR/.cursor/hooks.json" .cursor/hooks.json
success "已复制 hooks"

# 创建 .workflow 目录结构
info "创建 .workflow 目录结构..."
while IFS= read -r dir; do
    [ -z "$dir" ] && continue
    mkdir -p "$dir"
done < <(get_json_array "workflowDirectories")

# 复制 INDEX.md 文件
info "复制索引文件..."
while IFS= read -r index_file; do
    [ -z "$index_file" ] && continue
    src_path="$SCRIPT_DIR/$index_file"
    dest_path="$index_file"
    dest_dir=$(dirname "$dest_path")
    mkdir -p "$dest_dir"
    cp "$src_path" "$dest_path"
done < <(get_json_array "workflowIndexFiles")
success "已复制索引文件"

# 更新 .gitignore
info "更新 .gitignore..."
GITIGNORE_ENTRIES=()
while IFS= read -r entry; do
    GITIGNORE_ENTRIES+=("$entry")
done < <(get_json_array "gitignoreEntries")

if [ -f ".gitignore" ]; then
    # 检查是否已存在这些条目
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
    # 创建 .gitignore
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
echo "  - .cursor/skills/ (Agent Skills)"
echo "  - .workflow/ 目录结构"
echo ""
info "下一步："
echo "  1. 在 Cursor 中打开项目"
echo "  2. 运行 /flow <需求描述> 创建第一个需求"
echo "  3. 查看 README.md 了解完整工作流"
echo ""
info "更多信息：https://github.com/tower1229/LingXi"
