#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULT_PROPOSAL_REL = ".cursor/.lingxi/workspace/improvement-proposal.json";
const DEFAULT_QUEUE_REL = ".cursor/.lingxi/workspace/improvement-actions.queue.json";
const DEFAULT_PENDING_REL = ".cursor/.lingxi/workspace/improvement-pending-confirmation.json";
const APPEND_AUDIT_REL = ".cursor/hooks/append-memory-audit.mjs";

function readArg(name, fallback = "") {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === name && args[i + 1]) return args[i + 1];
    if (args[i].startsWith(`${name}=`)) return args[i].slice(name.length + 1);
  }
  return fallback;
}

function isFlagEnabled(name) {
  return process.argv.includes(name);
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function appendAudit(projectRoot, payload) {
  const scriptPath = path.join(projectRoot, APPEND_AUDIT_REL);
  spawnSync("node", [scriptPath, JSON.stringify(payload)], {
    cwd: projectRoot,
    env: { ...process.env, CURSOR_PROJECT_DIR: projectRoot },
    encoding: "utf8",
  });
}

function parseActionIds(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function clearPending(filePath) {
  if (!fs.existsSync(filePath)) return;
  fs.unlinkSync(filePath);
}

function main() {
  const projectRoot = process.env.CURSOR_PROJECT_DIR || process.cwd();
  const proposalPath = path.join(projectRoot, readArg("--proposal", DEFAULT_PROPOSAL_REL));
  const queuePath = path.join(projectRoot, readArg("--queue", DEFAULT_QUEUE_REL));
  const pendingPath = path.join(projectRoot, readArg("--pending", DEFAULT_PENDING_REL));
  const approveAll = isFlagEnabled("--approve-all");
  const allowHighRisk = isFlagEnabled("--allow-non-low-risk");
  const rejectAll = isFlagEnabled("--reject-all");
  const requestedActionIds = new Set(parseActionIds(readArg("--action-ids", "")));

  const proposal = readJson(proposalPath);
  if (!proposal || !Array.isArray(proposal.actions)) {
    process.stderr.write("[memory-improvement-apply] invalid or missing proposal file\n");
    process.exit(1);
  }

  if (rejectAll) {
    appendAudit(projectRoot, {
      event: "memory.improvement.rejected",
      proposal_id: proposal.proposal_id,
      action_ids: proposal.actions.map((a) => a.action_id),
      reason: "reject_all",
    });
    clearPending(pendingPath);
    process.stdout.write(
      JSON.stringify({
        ok: true,
        proposal_id: proposal.proposal_id,
        approved: 0,
        rejected: proposal.actions.length,
        applied: 0,
        failed: 0,
        skipped: 0,
        queue: path.relative(projectRoot, queuePath),
      }) + "\n"
    );
    return;
  }
  const approvedActions = proposal.actions.filter((action) =>
    approveAll ? true : requestedActionIds.has(action.action_id)
  );
  const rejectedActions = proposal.actions.filter((action) => !approvedActions.includes(action));

  appendAudit(projectRoot, {
    event: "memory.improvement.approved",
    proposal_id: proposal.proposal_id,
    action_ids: approvedActions.map((a) => a.action_id),
  });
  if (rejectedActions.length > 0) {
    appendAudit(projectRoot, {
      event: "memory.improvement.rejected",
      proposal_id: proposal.proposal_id,
      action_ids: rejectedActions.map((a) => a.action_id),
      reason: "not_selected",
    });
  }

  const queue = readJson(queuePath) || { queued_actions: [] };
  const dedupe = new Set(queue.queued_actions.map((item) => `${item.proposal_id}:${item.action_id}`));

  let applied = 0;
  let failed = 0;
  let skipped = 0;
  for (const action of approvedActions) {
    if (!allowHighRisk && action.risk && action.risk !== "low") {
      failed += 1;
      appendAudit(projectRoot, {
        event: "memory.improvement.failed",
        proposal_id: proposal.proposal_id,
        action_id: action.action_id,
        reason: "risk_not_allowed",
      });
      continue;
    }
    const key = `${proposal.proposal_id}:${action.action_id}`;
    if (dedupe.has(key)) {
      skipped += 1;
      continue;
    }
    queue.queued_actions.push({
      proposal_id: proposal.proposal_id,
      action_id: action.action_id,
      note_id: action.note_id,
      type: action.type,
      risk: action.risk || "low",
      queued_at: new Date().toISOString(),
    });
    dedupe.add(key);
    applied += 1;
    appendAudit(projectRoot, {
      event: "memory.improvement.applied",
      proposal_id: proposal.proposal_id,
      action_id: action.action_id,
      reason: "queued_for_execution",
    });
  }

  writeJson(queuePath, queue);
  clearPending(pendingPath);
  process.stdout.write(
    JSON.stringify({
      ok: true,
      proposal_id: proposal.proposal_id,
      approved: approvedActions.length,
      rejected: rejectedActions.length,
      applied,
      failed,
      skipped,
      queue: path.relative(projectRoot, queuePath),
    }) + "\n"
  );
}

main();
