#!/bin/bash

# Cursor Workflow 安装脚本
# 将 cursor-workflow 模板集成到当前项目

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

# 检查是否在正确的目录
if [ ! -d "$SCRIPT_DIR/.cursor" ] || [ ! -d "$SCRIPT_DIR/.workflow" ]; then
    error "未找到 .cursor 或 .workflow 目录"
    error "请确保在 cursor-workflow 模板仓库的根目录运行此脚本"
    exit 1
fi

info "开始安装 Cursor Workflow..."

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
cp -r "$SCRIPT_DIR/.cursor/commands/"* .cursor/commands/
success "已复制 commands (2 个文件)"

# 复制 rules（项目级质量准则）
# 使用硬编码列表，明确控制哪些文件被安装
# 注意：qs-i-workflow 不在列表中（仅用于本项目开发）
info "复制 rules..."

# 规则目录
cp -r "$SCRIPT_DIR/.cursor/rules/qs-always-general" .cursor/rules/

# 索引文件
cp "$SCRIPT_DIR/.cursor/rules/quality-standards-index.md" .cursor/rules/
cp "$SCRIPT_DIR/.cursor/rules/quality-standards-schema.md" .cursor/rules/

success "已复制 rules (1 个规则 + 2 个索引文件)"

# 注意：workflow 工具规则使用 AGENTS.md（根目录或嵌套）实现，不在此复制

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
mkdir -p .workflow/requirements/in-progress
mkdir -p .workflow/requirements/completed
mkdir -p .workflow/context/business
mkdir -p .workflow/context/tech/services
mkdir -p .workflow/context/experience
mkdir -p .workflow/context/session
mkdir -p .workflow/workspace

# 复制 INDEX.md 文件
info "复制索引文件..."
cp "$SCRIPT_DIR/.workflow/requirements/INDEX.md" .workflow/requirements/INDEX.md
cp "$SCRIPT_DIR/.workflow/context/experience/INDEX.md" .workflow/context/experience/INDEX.md
success "已复制索引文件"

# 更新 .gitignore
info "更新 .gitignore..."
GITIGNORE_ENTRIES=(
    "# Local workspace for temp code clones, generated artifacts, etc."
    ".workflow/workspace/"
    ""
    "# Session-level context (ephemeral, not a knowledge base)"
    ".workflow/context/session/"
)

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
        echo "# Cursor Workflow" >> .gitignore
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
echo "  - .cursor/commands/ (2 个命令)"
echo "  - .cursor/rules/ (1 个规则 + 2 个索引文件)"
echo "  - .cursor/skills/ (Agent Skills)"
echo "  - .workflow/ 目录结构"
echo ""
info "下一步："
echo "  1. 在 Cursor 中打开项目"
echo "  2. 运行 /flow <需求描述> 创建第一个需求"
echo "  3. 查看 README.md 了解完整工作流"
echo ""
info "更多信息：https://github.com/your-org/cursor-workflow"
