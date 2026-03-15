#!/usr/bin/env bash

# 安装后卸载集成测试：先执行 test-install.sh 安装到测试目录，再在该目录执行 lx:uninstall --yes，断言 .lingxi 及清单内路径已删除。
# 用法：./install/test-install-uninstall.sh [测试目录]
# 若不传目录则使用临时目录（脚本结束后保留，便于检查）。
# 依赖：bash、test-install.sh 所需环境（python3、curl、jq 或 python）。

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ $# -ge 1 ]; then
  TEST_DIR="$1"
  mkdir -p "$TEST_DIR"
else
  TEST_DIR=$(mktemp -d)
  echo "使用临时目录: $TEST_DIR"
fi

echo "步骤 1/3: 执行安装..."
"$SCRIPT_DIR/test-install.sh" "$TEST_DIR"

echo ""
echo "步骤 2/3: 执行卸载..."
cd "$TEST_DIR"
if command -v yarn &> /dev/null; then
  yarn lx:uninstall --yes
else
  node scripts/lx-uninstall.mjs --yes
fi

echo ""
echo "步骤 3/3: 断言..."
FAIL=0
if [ -d ".lingxi" ]; then
  echo "FAIL: .lingxi 仍存在"
  FAIL=1
fi
if [ -f "commands/init.md" ]; then
  echo "FAIL: 清单内路径 commands/init.md 仍存在"
  FAIL=1
fi
if [ -f "scripts/lx-uninstall.mjs" ]; then
  echo "FAIL: 清单内路径 scripts/lx-uninstall.mjs 仍存在"
  FAIL=1
fi

if [ $FAIL -eq 1 ]; then
  echo "集成测试未通过。测试目录: $TEST_DIR"
  exit 1
fi

echo "OK: 安装 → 卸载 集成测试通过。"
echo "测试目录: $TEST_DIR"
