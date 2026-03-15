#!/usr/bin/env node
/**
 * 心跳插件：30 分钟会话提炼（SESSION_DISTILL）。
 * 由 env.getTranscriptCandidates() 取候选，写 index/control 后返回 payload；由主 Agent 消费 WAL。
 */
import fs from "node:fs";
import path from "node:path";

const HEARTBEAT_CONTROL_REL = ".lingxi/os/heartbeat-control.json";

export default {
  id: "SESSION_DISTILL",
  consumer: "main-agent",

  shouldEnqueue(env) {
    const cand = env.getTranscriptCandidates?.();
    if (!cand || !cand.candidate_ids?.length) return null;
    if (typeof env.writeTranscriptIndex === "function") env.writeTranscriptIndex(cand.nextIndex);
    const nextControl = { ...env.control, ...(cand.controlPatch || {}) };
    if (typeof env.writeControl === "function") env.writeControl(nextControl);
    return {
      candidate_ids: cand.candidate_ids,
      enqueued_by: env.conversationId || "",
    };
  },

  onFailure(projectRoot, _payload) {
    const controlPath = path.join(projectRoot, HEARTBEAT_CONTROL_REL);
    try {
      if (fs.existsSync(controlPath)) {
        const raw = fs.readFileSync(controlPath, "utf8");
        const control = JSON.parse(raw);
        control.last_distillation_failed_at = new Date().toISOString();
        fs.writeFileSync(controlPath, JSON.stringify(control, null, 2), "utf8");
      }
    } catch (e) {
      console.error("[session-distill] write last_distillation_failed_at failed:", e.message);
    }
  },
};
