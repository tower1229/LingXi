#!/usr/bin/env bash

# 本地测试安装脚本的简单方法
# 
# 使用方法：
# 1. 在项目根目录运行：./test-install.sh [测试目录]
# 2. 如果不指定测试目录，会创建一个临时目录
#
# 示例：
#   ./test-install.sh                    # 使用临时目录
#   ./test-install.sh /tmp/my-test       # 使用指定目录

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT=8000

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

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

# 确定测试目录
if [ $# -eq 0 ]; then
    TEST_DIR=$(mktemp -d)
    TEMP_DIR=true
else
    TEST_DIR="$1"
    TEMP_DIR=false
    mkdir -p "$TEST_DIR"
fi

info "本地测试安装脚本"
info "脚本目录: $SCRIPT_DIR"
info "测试目录: $TEST_DIR"
info "HTTP 服务器端口: $PORT"
echo ""

# 检查 Python 是否可用
if ! command -v python3 &> /dev/null; then
    error "需要 python3 来启动本地 HTTP 服务器"
    exit 1
fi

# 启动本地 HTTP 服务器（在项目根目录）
cd "$SCRIPT_DIR"
info "启动本地 HTTP 服务器..."
python3 -m http.server $PORT > /dev/null 2>&1 &
SERVER_PID=$!

# 等待服务器启动
sleep 1

# 检查服务器是否运行
if ! kill -0 $SERVER_PID 2>/dev/null; then
    error "无法启动 HTTP 服务器（端口 $PORT 可能被占用）"
    exit 1
fi

success "HTTP 服务器已启动 (PID: $SERVER_PID)"
info "服务器地址: http://localhost:$PORT"
echo ""

# 清理函数
cleanup() {
    info "清理..."
    kill $SERVER_PID 2>/dev/null || true
    if [ "$TEMP_DIR" = true ]; then
        info "保留测试目录: $TEST_DIR（手动清理）"
    fi
    success "清理完成"
}

# 注册清理函数
trap cleanup EXIT INT TERM

# 切换到测试目录
cd "$TEST_DIR"
info "已切换到测试目录: $TEST_DIR"
echo ""

# 运行安装脚本（使用本地服务器和自动确认）
info "运行安装脚本..."
BASE_URL="http://localhost:$PORT" \
AUTO_CONFIRM=true \
bash "$SCRIPT_DIR/install/bash.sh"

echo ""
success "测试完成！"
if [ "$TEMP_DIR" = true ]; then
    info "测试目录: $TEST_DIR（可手动检查）"
fi
info "按 Ctrl+C 停止服务器或等待自动退出..."
echo ""
info "提示：要查看安装的文件，检查目录: $TEST_DIR"
