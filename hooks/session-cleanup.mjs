#!/usr/bin/env node
/**
 * sessions 目录清理脚本。
 * 由 heartbeat SESSION_CLEANUP 插件（watchdog）调用，每 24 小时执行一次。
 *
 * 清理策略（满足全部条件才删除）：
 * 1. HOT_RAM Current State === IDLE（非活跃会话）
 * 2. conversation_id 已在 processed_conversation_ids 中（已完成提炼）
 * 3. HOT_RAM.md 最后修改时间超过 RETENTION_DAYS 天（不删近期会话）
 *
 * 超龄强制清理（满足以下任一条件时强制删除，无视提炼状态）：
 * - HOT_RAM.md 最后修改时间超过 FORCE_DELETE_DAYS 天
 * - 这确保 transcript 找不到的会话最终也会被清理
 */
import fs from "node:fs";
import path from "node:path";

const SESSIONS_DIR_REL = ".lingxi/os/sessions";
const HEARTBEAT_CONTROL_REL = ".lingxi/os/heartbeat-control.json";
const RETENTION_DAYS = 7;
const FORCE_DELETE_DAYS = 30;

function getProjectRoot() {
  return process.env.CURSOR_PROJECT_DIR || process.env.CLAUDE_PROJECT_DIR || process.cwd();
}

function readHotRamState(hotRamPath) {
  try {
    const content = fs.readFileSync(hotRamPath, "utf8");
    const match = content.match(/\*\*Current State\*\*:\s*`([^`]+)`/);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

function readProcessedIds(controlPath) {
  try {
    const raw = fs.readFileSync(controlPath, "utf8");
    const ctrl = JSON.parse(raw);
    return new Set(Array.isArray(ctrl.processed_conversation_ids) ? ctrl.processed_conversation_ids : []);
  } catch {
    return new Set();
  }
}

function removeDir(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      removeDir(full);
    } else {
      fs.unlinkSync(full);
    }
  }
  fs.rmdirSync(dirPath);
}

function main() {
  const projectRoot = getProjectRoot();
  const sessionsDir = path.join(projectRoot, SESSIONS_DIR_REL);
  const controlPath = path.join(projectRoot, HEARTBEAT_CONTROL_REL);

  if (!fs.existsSync(sessionsDir)) {
    console.log("[session-cleanup] sessions dir not found, nothing to do.");
    return;
  }

  const processedIds = readProcessedIds(controlPath);
  const now = Date.now();
  const retentionMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const forceDeleteMs = FORCE_DELETE_DAYS * 24 * 60 * 60 * 1000;

  let checked = 0;
  let deleted = 0;
  let skipped = 0;

  let entries;
  try {
    entries = fs.readdirSync(sessionsDir, { withFileTypes: true });
  } catch (err) {
    console.error("[session-cleanup] read sessions dir failed:", err.message);
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const sessionId = entry.name;
    const sessionDir = path.join(sessionsDir, sessionId);
    const hotRamPath = path.join(sessionDir, "HOT_RAM.md");

    checked++;

    // HOT_RAM.md 不存在：空目录，直接清理
    if (!fs.existsSync(hotRamPath)) {
      try {
        removeDir(sessionDir);
        deleted++;
        console.log(`[session-cleanup] deleted empty session dir: ${sessionId}`);
      } catch (err) {
        console.error(`[session-cleanup] failed to delete ${sessionId}:`, err.message);
      }
      continue;
    }

    const stat = fs.statSync(hotRamPath, { throwIfNoEntry: false });
    const ageMs = stat ? now - stat.mtimeMs : Infinity;

    // 超龄强制清理（30天），无视提炼状态
    if (ageMs > forceDeleteMs) {
      try {
        removeDir(sessionDir);
        deleted++;
        console.log(`[session-cleanup] force-deleted aged session (${Math.floor(ageMs / 86400000)}d): ${sessionId}`);
      } catch (err) {
        console.error(`[session-cleanup] failed to force-delete ${sessionId}:`, err.message);
      }
      continue;
    }

    // 未超过保留期，跳过
    if (ageMs < retentionMs) {
      skipped++;
      continue;
    }

    // 检查活跃状态
    const state = readHotRamState(hotRamPath);
    if (state !== "IDLE") {
      skipped++;
      continue;
    }

    // 检查是否已提炼
    if (!processedIds.has(sessionId)) {
      skipped++;
      continue;
    }

    // 满足所有条件，删除
    try {
      removeDir(sessionDir);
      deleted++;
      console.log(`[session-cleanup] deleted session (${Math.floor(ageMs / 86400000)}d, processed): ${sessionId}`);
    } catch (err) {
      console.error(`[session-cleanup] failed to delete ${sessionId}:`, err.message);
    }
  }

  console.log(`[session-cleanup] done. checked=${checked}, deleted=${deleted}, skipped=${skipped}`);
}

main();
