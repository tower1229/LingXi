#!/usr/bin/env node
/**
 * 心跳插件：30 分钟会话提炼（SESSION_DISTILL）。
 * 由 env.getTranscriptCandidates() 取候选，写 index/control 后返回 payload；由主 Agent 消费 WAL。
 */
import { getPendingTasks } from "../hooks/wal-utils.mjs";
import fs from "node:fs";
import path from "node:path";

const WAL_BUFFER_REL = ".lingxi/os/WAL_BUFFER.md";

export default {
  id: "SESSION_DISTILL",
  consumer: "main-agent",

  shouldEnqueue(env) {
    // 获取已处理的 conversation ids
    const processedSet = new Set(
      Array.isArray(env.control?.processed_conversation_ids)
        ? env.control.processed_conversation_ids
        : []
    );

    // 获取当前候选
    const cand = env.getTranscriptCandidates?.();
    if (!cand || !cand.candidate_ids?.length) return null;

    // 检查是否有新的未处理候选（排除已处理的）
    const newCandidates = cand.candidate_ids.filter(id => !processedSet.has(id));
    if (newCandidates.length === 0) return null;

    // 若 WAL 中已有未勾选的同类任务，跳过入队，避免无限积压
    const walPath = path.join(env.projectRoot, WAL_BUFFER_REL);
    if (fs.existsSync(walPath)) {
      try {
        const content = fs.readFileSync(walPath, "utf8");
        const pending = getPendingTasks(content);
        if (pending.some((t) => t.type === "SESSION_DISTILL")) return null;
      } catch {
        // 读取失败时不阻止入队
      }
    }

    // 写入索引和控制状态
    if (typeof env.writeTranscriptIndex === "function") env.writeTranscriptIndex(cand.nextIndex);
    const nextControl = { ...env.control, ...(cand.controlPatch || {}) };
    if (typeof env.writeControl === "function") env.writeControl(nextControl);

    // 返回新的候选 ids
    return {
      candidate_ids: newCandidates,
      enqueued_by: env.conversationId || "",
    };
  },
};
