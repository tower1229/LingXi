#!/usr/bin/env node
/**
 * 记忆审计追加脚本：从命令行参数或 stdin JSON 读 event、note_id、operation、source、file、conversation_id、generation_id，
 * 写一条 NDJSON 到与主审计同一的 audit.log。供 lingxi-memory 子代理在写 note/INDEX 后调用。
 * 参考：001.req.灵犀审计系统.md §8.2 记忆审计。
 */
import fs from "node:fs";
import path from "node:path";

const AUDIT_REL = ".cursor/.lingxi/workspace/audit.log";

function main() {
  const raw = process.argv[2];
  if (!raw) {
    console.error("Usage: node append-memory-audit.mjs '<JSON>'");
    process.exit(1);
  }
  const input = JSON.parse(raw);
  const projectRoot = process.env.CURSOR_PROJECT_DIR || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const auditPath = path.join(projectRoot, AUDIT_REL);
  const workspaceDir = path.dirname(auditPath);

  const ts = new Date().toISOString();
  const payload = {
    ts,
    event: input.event,
    conversation_id: input.conversation_id ?? "",
    generation_id: input.generation_id ?? "",
    ...(input.note_id != null && { note_id: input.note_id }),
    ...(input.operation != null && { operation: input.operation }),
    ...(input.source != null && { source: input.source }),
    ...(input.file != null && { file: input.file }),
    ...(input.reason != null && { reason: input.reason }),
  };

  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }
  fs.appendFileSync(auditPath, JSON.stringify(payload) + "\n", "utf8");
}

main();
