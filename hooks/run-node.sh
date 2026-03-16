#!/bin/sh
# Universal node runner for LingXi hooks.
# Locates node across nvm / fnm / volta / homebrew / system installs,
# then execs the given script. Works in non-interactive, non-login shells
# (e.g. Cursor / Claude Code hook processes).

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

find_node() {
  # 1. Already on PATH (system node, or shell already set up correctly)
  if command -v node >/dev/null 2>&1; then
    echo "node"
    return
  fi

  # 2. nvm default
  NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1090
    . "$NVM_DIR/nvm.sh" --no-use 2>/dev/null
    NODE_PATH=$(nvm which default 2>/dev/null)
    if [ -x "$NODE_PATH" ]; then
      echo "$NODE_PATH"
      return
    fi
    # Fallback: pick the highest version in nvm versions dir
    NODE_PATH=$(ls -d "$NVM_DIR/versions/node"/*/bin/node 2>/dev/null | sort -V | tail -1)
    if [ -x "$NODE_PATH" ]; then
      echo "$NODE_PATH"
      return
    fi
  fi

  # 3. fnm
  FNM_DIR="${FNM_DIR:-$HOME/.fnm}"
  if [ -d "$FNM_DIR" ]; then
    NODE_PATH=$(ls -d "$FNM_DIR/node-versions"/*/installation/bin/node 2>/dev/null | sort -V | tail -1)
    if [ -x "$NODE_PATH" ]; then
      echo "$NODE_PATH"
      return
    fi
  fi

  # 4. volta
  VOLTA_HOME="${VOLTA_HOME:-$HOME/.volta}"
  if [ -x "$VOLTA_HOME/bin/node" ]; then
    echo "$VOLTA_HOME/bin/node"
    return
  fi

  # 5. Homebrew (Apple Silicon / Intel)
  for p in /opt/homebrew/bin/node /usr/local/bin/node; do
    if [ -x "$p" ]; then
      echo "$p"
      return
    fi
  done

  echo ""
}

NODE_BIN="$(find_node)"

if [ -z "$NODE_BIN" ]; then
  echo "[lingxi] ERROR: node not found. Install Node.js and ensure it is on PATH." >&2
  exit 1
fi

exec "$NODE_BIN" "$@"
