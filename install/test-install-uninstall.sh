#!/usr/bin/env bash

# 安装后卸载集成测试：先执行 test-install.sh 安装到测试目录，再在该目录执行 lx:uninstall --yes，断言 .lingxi、.codex-plugin/plugin.json 及清单内路径已删除。
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
if [ -f "package.json" ] && command -v yarn &> /dev/null; then
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
if [ -f ".codex-plugin/plugin.json" ]; then
  echo "FAIL: 清单内路径 .codex-plugin/plugin.json 仍存在"
  FAIL=1
fi
if [ -f "scripts/lx-uninstall.mjs" ]; then
  echo "FAIL: 清单内路径 scripts/lx-uninstall.mjs 仍存在"
  FAIL=1
fi
if [ -f "package.json" ]; then
  if node -e 'const fs=require("fs"); const pkg=JSON.parse(fs.readFileSync("package.json","utf8")); const scripts=pkg.scripts||{}; process.exit(("lx:bootstrap" in scripts || "lx:create-automation" in scripts || "lx:memory-brief" in scripts || "lx:setup" in scripts || "lx:uninstall" in scripts) ? 1 : 0);'; then
    :
  else
    echo "FAIL: package.json 中仍残留 LingXi 注入的脚本"
    FAIL=1
  fi
fi

if [ $FAIL -eq 1 ]; then
  echo "集成测试未通过。测试目录: $TEST_DIR"
  exit 1
fi

echo "OK: 安装 → 卸载 集成测试通过。"
echo "测试目录: $TEST_DIR"
