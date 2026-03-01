#!/usr/bin/env node
/**
 * 记忆审计追加脚本：从命令行参数或 stdin JSON 读 event、note_id、operation、source、file、conversation_id、generation_id，
 * 写一条 NDJSON 到与主审计同一的 audit.log。供 lingxi-memory 子代理在写 note/INDEX 后调用。
 * 参考：001.task.灵犀审计系统.md §8.2 记忆审计。
 */
import fs from "node:fs";
import path from "node:path";

const AUDIT_REL = ".cursor/.lingxi/workspace/audit.log";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ROTATE_LOCK_SUFFIX = ".rotate.lock";

/**
 * 获取系统当前时间戳（ISO 8601格式，UTC）
 */
function getSystemTimestamp() {
  // 使用系统API获取当前时间，转换为ISO 8601格式
  return new Date().toISOString();
}

/**
 * 轮转审计日志文件：当文件超过大小限制时，删除总条数一半的旧日志
 */
function acquireRotateLock(lockPath) {
  try {
    return fs.openSync(lockPath, "wx");
  } catch (err) {
    if (err?.code === "EEXIST") return null;
    throw err;
  }
}

function releaseRotateLock(lockFd, lockPath) {
  if (typeof lockFd === "number") {
    try {
      fs.closeSync(lockFd);
    } catch {}
  }
  try {
    fs.unlinkSync(lockPath);
  } catch {}
}

function rotateAuditFile(auditPath) {
  const lockPath = `${auditPath}${ROTATE_LOCK_SUFFIX}`;
  const lockFd = acquireRotateLock(lockPath);
  if (lockFd === null) {
    return;
  }

  try {
    const stats = fs.statSync(auditPath, { throwIfNoEntry: false });
    if (!stats || stats.size < MAX_FILE_SIZE) {
      return; // 无需轮转
    }

    // 读取所有日志行
    const content = fs.readFileSync(auditPath, { encoding: "utf8" });
    const lines = content.split("\n").filter((line) => line.trim().length > 0);

    // 计算需要保留的行数（保留后一半）
    const totalLines = lines.length;
    const keepLines = Math.ceil(totalLines / 2); // 保留后一半，向上取整

    if (keepLines >= totalLines) {
      // 如果保留行数等于总行数，说明只有1行或0行，无需清理
      return;
    }

    // 保留后一半的行
    const linesToKeep = lines.slice(-keepLines);
    const newContent = linesToKeep.join("\n") + "\n";

    // 写回文件（使用唯一临时文件避免并发覆盖）
    const tempPath = `${auditPath}.${process.pid}.${Date.now()}.${Math.random()
      .toString(16)
      .slice(2)}.tmp`;
    fs.writeFileSync(tempPath, newContent, { encoding: "utf8" });
    fs.renameSync(tempPath, auditPath);
  } catch (err) {
    // 轮转失败不影响主流程，静默降级
    console.error("[append-memory-audit] Rotation failed:", err.message);
  } finally {
    releaseRotateLock(lockFd, lockPath);
  }
}

function main() {
  const raw = process.argv[2];
  if (!raw) {
    console.error("Usage: node append-memory-audit.mjs '<JSON>'");
    process.exit(1);
  }
  const input = JSON.parse(raw);
  const projectRoot = process.env.CURSOR_PROJECT_DIR || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  let auditPath = path.join(projectRoot, AUDIT_REL);
  const workspaceDir = path.dirname(auditPath);

  const ts = getSystemTimestamp();
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

  // 确保目录存在
  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }

  // 检查文件大小并轮转（如果存在且超过限制）
  if (fs.existsSync(auditPath)) {
    rotateAuditFile(auditPath);
  }

  // 构建日志行，确保 JSON.stringify 正确处理 Unicode
  const line = JSON.stringify(payload) + "\n";

  // 使用 UTF-8 编码写入（明确指定，确保跨平台一致性）
  fs.appendFileSync(auditPath, line, { encoding: "utf8", flag: "a" });
}

main();
