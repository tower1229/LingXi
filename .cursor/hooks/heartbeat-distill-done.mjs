#!/usr/bin/env node
/**
 * 会话提炼完成回调：主 Agent 在 lingxi-session-distill 子代理返回后调用，更新 heartbeat-control 并勾选 WAL 中对应 SESSION_DISTILL 行。
 * 用法：node heartbeat-distill-done.mjs --candidate-ids '["id1","id2"]'
 * 或在项目根目录下通过 CURSOR_PROJECT_DIR 定位。
 */
import fs from "node:fs";
import path from "node:path";
import { parseWalLine, formatWalLine } from "./wal-utils.mjs";

const HEARTBEAT_CONTROL_REL = ".cursor/.lingxi/os/heartbeat-control.json";
const WAL_BUFFER_REL = ".cursor/.lingxi/os/WAL_BUFFER.md";

function readArg(name, fallback = "") {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === name && args[i + 1]) return args[i + 1];
    if (args[i].startsWith(`${name}=`)) return args[i].slice(name.length + 1);
  }
  return fallback;
}

function main() {
  const projectRoot = process.env.CURSOR_PROJECT_DIR || process.cwd();
  const controlPath = path.join(projectRoot, HEARTBEAT_CONTROL_REL);
  const walPath = path.join(projectRoot, WAL_BUFFER_REL);

  const candidateIdsRaw = readArg("--candidate-ids");
  let candidateIds = [];
  try {
    candidateIds = candidateIdsRaw ? JSON.parse(candidateIdsRaw) : [];
  } catch {
    console.error("[heartbeat-distill-done] invalid --candidate-ids JSON");
    process.exit(1);
  }

  const nowIso = new Date().toISOString();

  if (fs.existsSync(controlPath)) {
    try {
      const control = JSON.parse(fs.readFileSync(controlPath, "utf8"));
      control.last_distillation_completed_at = nowIso;
      const processed = Array.isArray(control.processed_conversation_ids) ? control.processed_conversation_ids : [];
      const merged = new Set([...processed, ...candidateIds]);
      control.processed_conversation_ids = [...merged];
      control.heartbeat = { running: false, started_at: null, run_id: null };
      fs.writeFileSync(controlPath, JSON.stringify(control, null, 2), "utf8");
    } catch (err) {
      console.error("[heartbeat-distill-done] update control failed:", err.message);
      process.exit(1);
    }
  }

  if (fs.existsSync(walPath)) {
    try {
      const content = fs.readFileSync(walPath, "utf8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const parsed = parseWalLine(lines[i]);
        if (parsed && !parsed.checked && parsed.type === "SESSION_DISTILL") {
          lines[i] = formatWalLine(parsed.type, parsed.payload, true);
          fs.writeFileSync(walPath, lines.join("\n"), "utf8");
          break;
        }
      }
    } catch (err) {
      console.error("[heartbeat-distill-done] update WAL failed:", err.message);
      process.exit(1);
    }
  }
}

main();
