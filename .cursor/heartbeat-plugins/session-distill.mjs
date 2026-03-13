#!/usr/bin/env node
/**
 * 心跳插件：30 分钟会话提炼（SESSION_DISTILL）。
 * 由 env.getTranscriptCandidates() 取候选，写 index/control 后返回 payload；由主 Agent 消费 WAL。
 */
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
};
