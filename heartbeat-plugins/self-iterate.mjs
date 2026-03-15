#!/usr/bin/env node
/**
 * 心跳插件：24 小时自我迭代（SELF_ITERATE）。
 * 按时间与 session 判断触发，更新 control 后入队；由 Watchdog 执行 proposal+apply，失败时写 last_improvement_failed_at。
 */
import path from "node:path";
import fs from "node:fs";

const IMPROVEMENT_THRESHOLD_HOURS = 24;
const HEARTBEAT_CONTROL_REL = ".lingxi/os/heartbeat-control.json";

export default {
  id: "SELF_ITERATE",
  consumer: "watchdog",

  shouldEnqueue(env) {
    const improvementThresholdMs =
      (env.improvementThresholdHours ?? IMPROVEMENT_THRESHOLD_HOURS) * 60 * 60 * 1000;
    const lastImprovementAt = env.control.last_improvement_cycle_at
      ? new Date(env.control.last_improvement_cycle_at).getTime()
      : 0;
    const triggerByTime =
      lastImprovementAt === 0 || env.now - lastImprovementAt > improvementThresholdMs;
    const promptedSessionId =
      typeof env.control.last_improvement_prompted_session_id === "string"
        ? env.control.last_improvement_prompted_session_id
        : "";
    const alreadyPromptedThisSession =
      !!env.conversationId && promptedSessionId === env.conversationId;
    if (!triggerByTime || alreadyPromptedThisSession || !env.conversationId) return null;

    const nextControl = {
      ...env.control,
      last_improvement_prompted_session_id: env.conversationId,
      last_improvement_prompted_at: env.nowIso,
    };
    if (typeof env.writeControl === "function") env.writeControl(nextControl);
    return { session_id: env.conversationId };
  },

  execCommand(projectRoot, _payload) {
    const proposalScript = path.join(
      projectRoot,
      "agents/lingxi-self-iterate/scripts/memory-improvement-proposal.mjs"
    );
    const applyScript = path.join(
      projectRoot,
      "agents/lingxi-self-iterate/scripts/memory-improvement-apply.mjs"
    );
    return `node "${proposalScript}" --window-hours 24 && node "${applyScript}" --approve-all`;
  },

  onFailure(projectRoot, _payload) {
    const controlPath = path.join(projectRoot, HEARTBEAT_CONTROL_REL);
    try {
      if (fs.existsSync(controlPath)) {
        const raw = fs.readFileSync(controlPath, "utf8");
        const control = JSON.parse(raw);
        control.last_improvement_failed_at = new Date().toISOString();
        fs.writeFileSync(controlPath, JSON.stringify(control, null, 2), "utf8");
      }
    } catch (e) {
      console.error("[watchdog] write last_improvement_failed_at failed:", e.message);
    }
  },
};
