#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const AUDIT_REL = ".cursor/.lingxi/workspace/audit.log";
const DEFAULT_JSON_REL = ".cursor/.lingxi/workspace/improvement-proposal.json";
const DEFAULT_MD_REL = ".cursor/.lingxi/workspace/memory-diagnostics.md";
const APPEND_AUDIT_REL = ".cursor/hooks/append-memory-audit.mjs";
const HEARTBEAT_CONTROL_REL = ".cursor/.lingxi/workspace/heartbeat-control.json";
const DEFAULT_WINDOW_HOURS = 24;

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

function safeParseLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function readAuditRows(auditPath) {
  if (!fs.existsSync(auditPath)) return [];
  const content = fs.readFileSync(auditPath, "utf8");
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(safeParseLine)
    .filter(Boolean);
}

function pickActionType(primaryTag) {
  const table = {
    scope_too_narrow: "expand_when_to_load",
    trigger_miss: "feedback_to_taste_recognition",
    one_liner_weak: "rewrite_one_liner",
    missing_counter_signals: "add_counter_signals",
    note_too_generic: "split_note",
  };
  return table[primaryTag] || "feedback_to_taste_recognition";
}

function pickRisk(actionType) {
  if (actionType === "rewrite_one_liner" || actionType === "add_counter_signals") return "low";
  return "medium";
}

function toIso(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function buildProposal(rows, windowHours) {
  const nowMs = Date.now();
  const windowStartMs = nowMs - windowHours * 60 * 60 * 1000;
  const merges = rows.filter((row) => {
    if (row.event !== "memory.merge.diagnosed") return false;
    const t = new Date(row.ts || 0).getTime();
    return Number.isFinite(t) && t >= windowStartMs && t <= nowMs;
  });

  const aggregate = new Map();
  for (const row of merges) {
    const noteId = row.note_id || "unknown";
    const primaryTag = row.primary_tag || "unknown";
    const key = `${noteId}::${primaryTag}`;
    if (!aggregate.has(key)) {
      aggregate.set(key, {
        note_id: noteId,
        primary_tag: primaryTag,
        diagnosis_tags: Array.isArray(row.diagnosis_tags) ? row.diagnosis_tags : [],
        merge_count: 0,
        first_seen_at: row.ts || "",
        last_seen_at: row.ts || "",
      });
    }
    const item = aggregate.get(key);
    item.merge_count += 1;
    if (row.ts && (!item.first_seen_at || row.ts < item.first_seen_at)) item.first_seen_at = row.ts;
    if (row.ts && (!item.last_seen_at || row.ts > item.last_seen_at)) item.last_seen_at = row.ts;
  }

  const findings = [...aggregate.values()]
    .sort((a, b) => b.merge_count - a.merge_count)
    .slice(0, 20)
    .map((item, index) => ({
      finding_id: `finding-${String(index + 1).padStart(3, "0")}`,
      note_id: item.note_id,
      primary_tag: item.primary_tag,
      diagnosis_tags: item.diagnosis_tags,
      merge_count: item.merge_count,
      first_seen_at: toIso(item.first_seen_at),
      last_seen_at: toIso(item.last_seen_at),
      confidence: item.merge_count >= 3 ? "high" : "medium",
    }));

  const actions = findings.map((finding, index) => {
    const actionType = pickActionType(finding.primary_tag);
    const risk = pickRisk(actionType);
    return {
      action_id: `action-${String(index + 1).padStart(3, "0")}`,
      finding_id: finding.finding_id,
      note_id: finding.note_id,
      type: actionType,
      risk,
      reason: `${finding.primary_tag} repeated ${finding.merge_count} times in ${windowHours}h`,
      suggested_update: {
        primary_tag: finding.primary_tag,
        hint: `Focus on ${finding.primary_tag} for ${finding.note_id}`,
      },
    };
  });

  return {
    proposal_id: `proposal-${new Date(nowMs).toISOString().replace(/[:.]/g, "-")}`,
    generated_at: new Date(nowMs).toISOString(),
    window_hours: windowHours,
    findings,
    actions,
    constraints: {
      auto_apply_risk: "low",
      max_actions_per_cycle: 20,
    },
  };
}

function writeDiagnosticsMd(outputPath, proposal) {
  const lines = [];
  lines.push("# Memory Diagnostics");
  lines.push("");
  lines.push(`- Proposal ID: \`${proposal.proposal_id}\``);
  lines.push(`- Generated At: \`${proposal.generated_at}\``);
  lines.push(`- Window: last \`${proposal.window_hours}\` hours`);
  lines.push(`- Findings: \`${proposal.findings.length}\``);
  lines.push(`- Actions: \`${proposal.actions.length}\``);
  lines.push("");
  lines.push("## Top Findings");
  lines.push("");
  if (proposal.findings.length === 0) {
    lines.push("- No merge diagnosis findings in this window.");
  } else {
    for (const f of proposal.findings.slice(0, 10)) {
      lines.push(
        `- ${f.finding_id}: ${f.note_id}, tag=${f.primary_tag}, merges=${f.merge_count}, confidence=${f.confidence}`
      );
    }
  }
  lines.push("");
  lines.push("## Suggested Actions");
  lines.push("");
  if (proposal.actions.length === 0) {
    lines.push("- No actions proposed.");
  } else {
    for (const a of proposal.actions.slice(0, 10)) {
      lines.push(`- ${a.action_id}: ${a.type} (${a.risk}) for ${a.note_id} (${a.reason})`);
    }
  }
  ensureDir(outputPath);
  fs.writeFileSync(outputPath, lines.join("\n") + "\n", "utf8");
}

function appendAudit(projectRoot, payload) {
  const scriptPath = path.join(projectRoot, APPEND_AUDIT_REL);
  const run = spawnSync("node", [scriptPath, JSON.stringify(payload)], {
    cwd: projectRoot,
    env: { ...process.env, CURSOR_PROJECT_DIR: projectRoot },
    encoding: "utf8",
  });
  return run.status === 0;
}

function markImprovementCycle(projectRoot, tsIso) {
  const controlPath = path.join(projectRoot, HEARTBEAT_CONTROL_REL);
  let control = {
    last_distillation_completed_at: null,
    heartbeat: { running: false, started_at: null, run_id: null },
    pending_distillation: null,
    processed_conversation_ids: [],
    last_improvement_cycle_at: null,
  };
  if (fs.existsSync(controlPath)) {
    try {
      control = { ...control, ...JSON.parse(fs.readFileSync(controlPath, "utf8")) };
    } catch {}
  }
  control.last_improvement_cycle_at = tsIso;
  ensureDir(controlPath);
  fs.writeFileSync(controlPath, JSON.stringify(control, null, 2), "utf8");
}

function main() {
  const projectRoot = process.env.CURSOR_PROJECT_DIR || process.cwd();
  const auditPath = path.join(projectRoot, AUDIT_REL);
  const windowHours = Math.max(1, Number(readArg("--window-hours", String(DEFAULT_WINDOW_HOURS))) || DEFAULT_WINDOW_HOURS);
  const jsonOut = path.join(projectRoot, readArg("--json-out", DEFAULT_JSON_REL));
  const mdOut = path.join(projectRoot, readArg("--md-out", DEFAULT_MD_REL));
  const dryRun = isFlagEnabled("--dry-run");

  const rows = readAuditRows(auditPath);
  const proposal = buildProposal(rows, windowHours);
  const confirmationHint = {
    mode: "ask_questions_required",
    options: [
      { id: "approve_low_risk", label: "全部低风险执行" },
      { id: "approve_selected", label: "选择性执行" },
      { id: "reject_all", label: "暂不执行" },
    ],
    selectable_action_ids: proposal.actions.map((a) => a.action_id),
  };
  const summary = {
    top_findings: proposal.findings.slice(0, 5).map((f) => ({
      finding_id: f.finding_id,
      note_id: f.note_id,
      primary_tag: f.primary_tag,
      merge_count: f.merge_count,
    })),
    top_actions: proposal.actions.slice(0, 5).map((a) => ({
      action_id: a.action_id,
      note_id: a.note_id,
      type: a.type,
      risk: a.risk,
    })),
  };

  if (!dryRun) {
    ensureDir(jsonOut);
    fs.writeFileSync(jsonOut, JSON.stringify(proposal, null, 2) + "\n", "utf8");
    writeDiagnosticsMd(mdOut, proposal);
    appendAudit(projectRoot, {
      event: "memory.improvement.proposed",
      proposal_id: proposal.proposal_id,
      findings: proposal.findings.map((f) => ({
        finding_id: f.finding_id,
        note_id: f.note_id,
        primary_tag: f.primary_tag,
        merge_count: f.merge_count,
      })),
      actions: proposal.actions.map((a) => ({
        action_id: a.action_id,
        note_id: a.note_id,
        type: a.type,
        risk: a.risk,
      })),
    });
    markImprovementCycle(projectRoot, proposal.generated_at);
  }

  process.stdout.write(
    JSON.stringify({
      ok: true,
      dry_run: dryRun,
      proposal_id: proposal.proposal_id,
      findings: proposal.findings.length,
      actions: proposal.actions.length,
      json_out: path.relative(projectRoot, jsonOut),
      md_out: path.relative(projectRoot, mdOut),
      summary,
      confirmation_hint: confirmationHint,
    }) + "\n"
  );
}

main();
