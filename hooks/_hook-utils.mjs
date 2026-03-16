import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

export async function readStdinJson() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

export function writeStdoutJson(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

export function getProjectRootFromHookScriptUrl(scriptUrl) {
  // On Windows, import.meta.url pathname looks like /C:/path/to/hooks/script.mjs
  // path.fileURLToPath handles cross-platform URL-to-path conversion correctly
  const scriptPath = new URL(scriptUrl).pathname;
  // Strip leading slash on Windows (e.g. /C:/... -> C:/...)
  const normalizedPath = process.platform === "win32" && /^\/[A-Za-z]:/.test(scriptPath)
    ? scriptPath.slice(1)
    : scriptPath;
  const scriptDir = path.dirname(normalizedPath);
  // hooks/xxx.mjs -> project root is one level up from hooks/
  return path.resolve(scriptDir, "..");
}

export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

