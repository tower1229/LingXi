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
  const scriptPath = new URL(scriptUrl).pathname;
  const scriptDir = path.dirname(scriptPath);
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

