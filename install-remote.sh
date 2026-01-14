#!/bin/bash

# Cursor Workflow 远程安装脚本
# 直接从 GitHub 下载并安装到当前项目

set -e

# 配置
REPO_OWNER="tower1229"
REPO_NAME="cursor-workflow"
BRANCH="main"
BASE_URL="https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}"

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

# 检查命令是否存在
check_command() {
    if ! command -v "$1" &> /dev/null; then
        error "$1 未安装，请先安装 $1"
        exit 1
    fi
}

check_command curl

info "开始安装 Cursor Workflow..."
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

# 下载函数
download_file() {
    local remote_path=$1
    local local_path=$2
    local url="${BASE_URL}/${remote_path}"

    info "下载: ${remote_path}"
    mkdir -p "$(dirname "$local_path")"

    if curl -f -sSL "$url" -o "$local_path"; then
        return 0
    else
        error "下载失败: ${url}"
        return 1
    fi
}

# 创建 .cursor 目录结构
info "创建 .cursor 目录结构..."
mkdir -p .cursor/commands
mkdir -p .cursor/rules
mkdir -p .cursor/skills
mkdir -p .cursor/hooks

# 下载 commands 文件
info "下载 commands..."
COMMANDS=(
    "commands/flow.md"
    "commands/remember.md"
)

for cmd in "${COMMANDS[@]}"; do
    local_file=".cursor/${cmd}"
    if ! download_file ".cursor/${cmd}" "$local_file"; then
        error "安装失败"
        exit 1
    fi
done
success "已下载 commands (2 个文件)"

# 下载 rules 文件（项目级质量准则）
info "下载 rules..."
RULES=(
    "rules/ai-artifacts/RULE.md"
    "rules/development-specifications/RULE.md"
    "rules/safety-guardrails/RULE.md"
)

for rule in "${RULES[@]}"; do
    local_file=".cursor/${rule}"
    if ! download_file ".cursor/${rule}" "$local_file"; then
        error "安装失败"
        exit 1
    fi
done
success "已下载 rules (3 个文件)"

# 注意：workflow 工具规则使用 AGENTS.md（根目录或嵌套）实现，不在此下载

# 下载 hooks 配置与脚本
info "下载 hooks..."
HOOK_FILES=(
    "hooks.json"
    "hooks/_hook-utils.mjs"
    "hooks/audit-after-shell-execution.mjs"
    "hooks/before-shell-execution.mjs"
    "hooks/before-submit-prompt.mjs"
    "hooks/stop.mjs"
)

for f in "${HOOK_FILES[@]}"; do
    local_file=".cursor/${f}"
    if ! download_file ".cursor/${f}" "$local_file"; then
        error "安装失败"
        exit 1
    fi
done
success "已下载 hooks (hooks.json + 6 个脚本)"

# 下载 skills
info "下载 skills..."
SKILLS=(
    "skills/audit/SKILL.md"
    "skills/archive/SKILL.md"
    "skills/context-engineering/SKILL.md"
    "skills/experience-depositor/SKILL.md"
    "skills/experience-index/SKILL.md"
    "skills/flow-router/SKILL.md"
    "skills/index-manager/SKILL.md"
    "skills/plan/SKILL.md"
    "skills/plan-manager/SKILL.md"
    "skills/req/SKILL.md"
    "skills/review/SKILL.md"
    "skills/work/SKILL.md"
)

for s in "${SKILLS[@]}"; do
    local_file=".cursor/${s}"
    if ! download_file ".cursor/${s}" "$local_file"; then
        error "安装失败"
        exit 1
    fi
done
success "已下载 skills (12 个)"

# 创建 .workflow 目录结构
info "创建 .workflow 目录结构..."
mkdir -p .workflow/requirements/in-progress
mkdir -p .workflow/requirements/completed
mkdir -p .workflow/context/business
mkdir -p .workflow/context/tech/services
mkdir -p .workflow/context/experience
mkdir -p .workflow/context/session
mkdir -p .workflow/workspace

# 下载 INDEX.md 文件
info "下载索引文件..."
if ! download_file ".workflow/requirements/INDEX.md" ".workflow/requirements/INDEX.md"; then
    error "安装失败"
    exit 1
fi

if ! download_file ".workflow/context/experience/INDEX.md" ".workflow/context/experience/INDEX.md"; then
    error "安装失败"
    exit 1
fi
success "已下载索引文件"

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
echo "  - .cursor/commands/ (2 个命令文件)"
echo "  - .cursor/rules/ (4 个规则文件)"
echo "  - .cursor/skills/ (Agent Skills)"
echo "  - .workflow/ 目录结构"
echo ""
info "下一步："
echo "  1. 在 Cursor 中打开项目"
echo "  2. 运行 /flow <需求描述> 创建第一个需求"
echo "  3. 查看 README.md 了解完整工作流"
echo ""
info "更多信息：https://github.com/${REPO_OWNER}/${REPO_NAME}"
info "仓库地址：git@github.com:${REPO_OWNER}/${REPO_NAME}.git"