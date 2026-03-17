#!/usr/bin/env node
/**
 * 心跳插件：24 小时 sessions 目录清理（SESSION_CLEANUP）。
 * 清理 .lingxi/os/sessions/ 下已完成且超过保留期的会话目录。
 * consumer: "watchdog" — 纯文件操作，由脚本直接执行，不需要 Agent 介入。
 */
import path from "node:path";
import fs from "node:fs";

const CLEANUP_THRESHOLD_HOURS = 24;
const HEARTBEAT_CONTROL_REL = ".lingxi/os/heartbeat-control.json";

export default {
  id: "SESSION_CLEANUP",
  consumer: "watchdog",

  shouldEnqueue(env) {
    const thresholdMs = CLEANUP_THRESHOLD_HOURS * 60 * 60 * 1000;
    const lastCleanupAt = env.control.last_session_cleanup_at
      ? new Date(env.control.last_session_cleanup_at).getTime()
      : 0;
    const triggerByTime =
      lastCleanupAt === 0 || env.now - lastCleanupAt > thresholdMs;

    if (!triggerByTime) return null;

    const nextControl = {
      ...env.control,
      last_session_cleanup_at: env.nowIso,
    };
    if (typeof env.writeControl === "function") env.writeControl(nextControl);
    return { triggered_by: env.conversationId || "" };
  },

  execCommand(projectRoot, _payload) {
    const scriptCandidates = [
      path.join(projectRoot, "hooks", "session-cleanup.mjs"),
    ];
    const script = scriptCandidates.find((c) => fs.existsSync(c)) || scriptCandidates[0];
    return `node "${script}"`;
  },

  onFailure(projectRoot, _payload) {
    const controlPath = path.join(projectRoot, HEARTBEAT_CONTROL_REL);
    try {
      if (fs.existsSync(controlPath)) {
        const raw = fs.readFileSync(controlPath, "utf8");
        const control = JSON.parse(raw);
        control.last_session_cleanup_failed_at = new Date().toISOString();
        fs.writeFileSync(controlPath, JSON.stringify(control, null, 2), "utf8");
      }
    } catch (e) {
      console.error("[watchdog] session-cleanup write failed_at failed:", e.message);
    }
  },
};
