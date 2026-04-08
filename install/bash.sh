#!/usr/bin/env bash

# LingXi 2.0 远程安装脚本
# 直接从 GitHub 下载并安装到当前项目
# Version: 2.0.0

set -euo pipefail

REPO_OWNER="tower1229"
REPO_NAME="LingXi"
BRANCH="main"
BASE_URL="${BASE_URL:-https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

IS_INTERACTIVE_TERMINAL=false
if [ -t 0 ]; then
  IS_INTERACTIVE_TERMINAL=true
fi

AUTO_CONFIRM=${AUTO_CONFIRM:-false}
NONINTERACTIVE=${NONINTERACTIVE:-0}
if [ "$AUTO_CONFIRM" = "true" ] || [ "$AUTO_CONFIRM" = "1" ] || [ "$AUTO_CONFIRM" = "yes" ] || [ "$NONINTERACTIVE" = "1" ]; then
  AUTO_CONFIRM=true
else
  AUTO_CONFIRM=false
fi

check_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    error "$1 is required but not installed"
    exit 1
  fi
}

check_command curl
check_command node

download_file() {
  local remote_path="$1"
  local local_path="$2"
  local url="${BASE_URL%/}/${remote_path}"
  local dir
  dir="$(dirname "$local_path")"
  mkdir -p "$dir"

  local max_retries=3
  local retry=0
  while [ $retry -lt $max_retries ]; do
    if curl -fsSL -o "$local_path" -- "$url"; then
      return 0
    fi
    retry=$((retry + 1))
    if [ $retry -lt $max_retries ]; then
      warning "Download failed, retrying ($retry/$max_retries)..."
      sleep 1
    else
      error "Download failed: $url (retried $max_retries times)"
      return 1
    fi
  done
  return 1
}

load_manifest() {
  local manifest_url="${BASE_URL%/}/install/install-manifest.json"
  local manifest_path
  manifest_path="$(mktemp)"

  info "Downloading install manifest..."
  if ! curl -fsSL -o "$manifest_path" -- "$manifest_url"; then
    error "Failed to download install manifest: $manifest_url"
    exit 1
  fi

  if ! node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));' "$manifest_path" >/dev/null 2>&1; then
    error "Invalid JSON in downloaded manifest"
    rm -f "$manifest_path"
    exit 1
  fi

  MANIFEST_PATH="$manifest_path"
}

get_json_string() {
  local key="$1"
  node -e '
    const fs = require("fs");
    const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const value = data[process.argv[2]];
    process.stdout.write(String(value || ""));
  ' "$MANIFEST_PATH" "$key"
}

get_json_array() {
  local key="$1"
  node -e '
    const fs = require("fs");
    const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const value = data[process.argv[2]];
    if (!Array.isArray(value)) {
      process.exit(0);
    }
    for (const item of value) {
      process.stdout.write(String(item) + "\n");
    }
  ' "$MANIFEST_PATH" "$key"
}

load_manifest

LINGXI_VERSION="$(get_json_string "version")"
[ -z "$LINGXI_VERSION" ] && LINGXI_VERSION="(unknown)"

info "Installing LingXi 2.0..."
info "Source: ${REPO_OWNER}/${REPO_NAME}"
info "Surface: Codex-native (.codex-plugin, skills, scripts, templates, .lingxi)"

MANAGED_EXISTS=false
if [ -f ".codex-plugin/plugin.json" ] || [ -d "skills" ] || [ -d ".lingxi" ] || [ -f "install/install-manifest.json" ]; then
  MANAGED_EXISTS=true
fi

response="n"
if [ "$MANAGED_EXISTS" = true ]; then
  if [ "$AUTO_CONFIRM" = true ]; then
    response="y"
    info "Auto-confirm enabled: update install mode"
  else
    echo ""
    info "Existing LingXi 2.0 files detected. Update install mode:"
    info " - Keep unrelated repository files"
    info " - Overwrite LingXi-managed files to the latest 2.0 version"
    echo ""
    if [ "$IS_INTERACTIVE_TERMINAL" = true ]; then
      read -p "Continue? (y/N): " -n 1 -r response
      echo ""
    elif [ -e /dev/tty ] && [ -r /dev/tty ]; then
      read -p "Continue? (y/N): " -n 1 -r response < /dev/tty
      echo ""
    fi
    if [[ ! "$response" =~ ^[yY]$ ]]; then
      info "Install cancelled"
      exit 0
    fi
  fi
fi

info "Downloading LingXi 2.0 files..."
file_count=0
while IFS= read -r file_path; do
  [ -z "$file_path" ] && continue
  file_path="${file_path//$'\r'/}"
  if ! download_file "$file_path" "$file_path"; then
    error "Failed to install file: $file_path"
    exit 1
  fi
  file_count=$((file_count + 1))
done < <(get_json_array "files")
success "LingXi 2.0 files downloaded ($file_count files)"

mkdir -p install
cp "$MANIFEST_PATH" "install/install-manifest.json"
success "Saved manifest to install/install-manifest.json"

if [ -f "package.json" ]; then
  node -e '
    const fs = require("fs");
    const pkgPath = "package.json";
    const manifestPath = "install/install-manifest.json";
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const next = {
      ...pkg,
      scripts: {
        ...(pkg.scripts || {}),
        ...(manifest.packageScripts || {})
      }
    };
    fs.writeFileSync(pkgPath, JSON.stringify(next, null, 2) + "\n", "utf8");
  '
  success "Merged LingXi scripts into package.json"
fi

info "Bootstrapping LingXi 2.0 runtime..."
if ! node "scripts/lingxi-setup.mjs"; then
  error "LingXi 2.0 runtime bootstrap failed"
  exit 1
fi
success "LingXi 2.0 runtime bootstrap completed"

echo ""
success "Install complete"
info "Version: ${LINGXI_VERSION}"
if [ "$MANAGED_EXISTS" = true ]; then
  info "Update mode: refreshed LingXi-managed 2.0 files"
fi
info "Next: open this repository in Codex."
