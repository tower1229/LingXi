#!/usr/bin/env node
/**
 * 灵犀卸载脚本：按安装清单删除 LingXi 2.0 的运行数据与核心文件。
 * 读取 install/install-manifest.json（安装时由安装程序写入），仅删除清单内路径。
 * 用法：node scripts/lx-uninstall.mjs [--yes]
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const projectRoot =
  process.env.CODEX_PROJECT_DIR ||
  process.env.CURSOR_PROJECT_DIR ||
  process.env.CLAUDE_PROJECT_DIR ||
  process.cwd();

const MANIFEST_RELATIVE = "install/install-manifest.json";

function resolve(p) {
  return path.join(projectRoot, p.split("/").join(path.sep));
}

function loadManifest() {
  const manifestPath = resolve(MANIFEST_RELATIVE);
  if (!fs.existsSync(manifestPath)) {
    console.error("[lx-uninstall] 未找到安装清单: " + manifestPath);
    console.error("[lx-uninstall] 请确认当前目录为已安装灵犀的项目根，且存在 install/install-manifest.json");
    process.exit(1);
  }
  try {
    const raw = fs.readFileSync(manifestPath, { encoding: "utf8" });
    const normalized = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    return JSON.parse(normalized);
  } catch (e) {
    console.error("[lx-uninstall] 安装清单 JSON 解析失败:", e.message);
    process.exit(1);
  }
}

function collectPathsToDelete(manifest) {
  const out = [];
  (manifest.files || []).forEach((p) => out.push(p));
  (manifest.runtimeFiles || []).forEach((p) => out.push(p));

  if (manifest.manifestCopyPath) {
    out.push(manifest.manifestCopyPath);
  }

  return [...new Set(out)];
}

function safeRemove(fullPath, isDir) {
  if (!fs.existsSync(fullPath)) return;
  try {
    if (isDir) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fullPath);
    }
  } catch (e) {
    console.warn("[lx-uninstall] 删除失败 " + fullPath + ": " + e.message);
  }
}

function candidateParentDirs(targetPath) {
  const dirs = [];
  let current = path.dirname(targetPath);
  while (current.startsWith(projectRoot) && current !== projectRoot) {
    dirs.push(current);
    current = path.dirname(current);
  }
  return dirs;
}

function pruneEmptyParentDirs(paths) {
  const dirs = new Set();
  for (const rel of paths) {
    for (const dir of candidateParentDirs(resolve(rel))) {
      dirs.add(dir);
    }
  }

  const ordered = [...dirs].sort((a, b) => b.length - a.length);
  for (const dir of ordered) {
    if (!fs.existsSync(dir)) continue;
    try {
      if (fs.readdirSync(dir).length === 0) {
        fs.rmdirSync(dir);
      }
    } catch {
      // Keep non-empty or concurrently modified directories intact.
    }
  }
}

function deletePaths(paths) {
  const withStats = paths.map((p) => ({
    rel: p,
    full: resolve(p),
  })).filter(({ full }) => fs.existsSync(full));

  const files = [];
  const dirs = [];
  for (const { rel, full } of withStats) {
    const stat = fs.statSync(full);
    if (stat.isDirectory()) dirs.push({ rel, full });
    else files.push({ rel, full });
  }

  for (const { full } of files) {
    safeRemove(full, false);
  }

  const sortedDirs = dirs.sort((a, b) => b.full.length - a.full.length);
  for (const { full } of sortedDirs) {
    safeRemove(full, true);
  }

  pruneEmptyParentDirs(withStats.map(({ rel }) => rel));
}

function confirm(paths) {
  return new Promise((resolvePromise) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log("\n将要删除以下路径（仅限清单内）：");
    paths.slice(0, 30).forEach((p) => console.log("  - " + p));
    if (paths.length > 30) console.log("  ... 共 " + paths.length + " 项");
    rl.question("\n确认执行卸载？ (y/N): ", (answer) => {
      rl.close();
      resolvePromise(/^[yY]$/.test(answer.trim()));
    });
  });
}

function main() {
  const args = process.argv.slice(2);
  const skipConfirm = args.includes("--yes");

  const manifest = loadManifest();
  const paths = collectPathsToDelete(manifest);
  const existing = paths.filter((p) => fs.existsSync(resolve(p)));

  if (existing.length === 0) {
    console.log("[lx-uninstall] 未发现灵犀安装文件，无需卸载。");
    process.exit(0);
  }

  if (!skipConfirm) {
    const isTty = process.stdin.isTTY;
    if (!isTty) {
      console.error("[lx-uninstall] 非交互式环境，请传入 --yes 以确认卸载。");
      process.exit(1);
    }
    confirm(existing).then((ok) => {
      if (!ok) {
        console.log("[lx-uninstall] 已取消。");
        process.exit(0);
      }
      deletePaths(paths);
      console.log("[lx-uninstall] 卸载完成。");
      process.exit(0);
    });
  } else {
    deletePaths(paths);
    console.log("[lx-uninstall] 卸载完成。");
    process.exit(0);
  }
}

main();
