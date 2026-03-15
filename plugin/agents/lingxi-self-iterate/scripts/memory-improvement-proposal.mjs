#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  normalizeGovernanceContext,
  validateMergeKind,
} from "../../../skills/memory-write/scripts/governance-context-validator.mjs";

const AUDIT_REL = ".lingxi/os/MEMORY_JOURNAL.jsonl";
const DEFAULT_JSON_REL = ".lingxi/os/improvement-proposal.json";
const DEFAULT_MD_REL = ".lingxi/os/memory-diagnostics.md";
const APPEND_AUDIT_REL = "plugin/hooks/heartbeat-trigger.mjs";
const HEARTBEAT_CONTROL_REL = ".lingxi/os/heartbeat-control.json";
const INDEX_REL = ".lingxi/memory/INDEX.md";
const PROJECT_MEMORY_REL = ".lingxi/memory/project";
const SHARE_MEMORY_REL = ".lingxi/memory/share";
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
    dedupe_pressure: "apply_dedupe_rule",
    merge_opportunity: "expand_merge_policy",
    fragmentation_signal: "tighten_governance_gate",
    scope_too_narrow: "expand_when_to_load",
    trigger_miss: "feedback_to_taste_recognition",
    one_liner_weak: "rewrite_one_liner",
    missing_counter_signals: "add_counter_signals",
    note_too_generic: "split_note",
  };
  return table[primaryTag] || "feedback_to_taste_recognition";
}

function pickRisk(actionType) {
  if (
    actionType === "rewrite_one_liner" ||
    actionType === "add_counter_signals" ||
    actionType === "apply_dedupe_rule"
  ) {
    return "low";
  }
  return "medium";
}

function toIso(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function ratio(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  return Number((numerator / denominator).toFixed(4));
}

/**
 * 检查 INDEX.md 行数与 memory/project/ + memory/share/ 中的 note 文件数是否一致。
 * 仅做只读诊断，不执行任何修复操作。
 */
function checkIndexDrift(projectRoot) {
  const indexPath = path.join(projectRoot, INDEX_REL);
  const projectMemoryPath = path.join(projectRoot, PROJECT_MEMORY_REL);
  const shareMemoryPath = path.join(projectRoot, SHARE_MEMORY_REL);

  let indexRows = 0;
  let noteFiles = 0;

  if (fs.existsSync(indexPath)) {
    const lines = fs.readFileSync(indexPath, "utf8").split("\n");
    indexRows = lines.filter((line) => {
      const trimmed = line.trim();
      return (
        trimmed.startsWith("|") &&
        !trimmed.startsWith("| Id") &&
        !trimmed.startsWith("|--") &&
        !trimmed.startsWith("| --")
      );
    }).length;
  }

  if (fs.existsSync(projectMemoryPath)) {
    noteFiles += fs.readdirSync(projectMemoryPath).filter((f) => /^MEM-\d+\.md$/.test(f)).length;
  }
  if (fs.existsSync(shareMemoryPath)) {
    noteFiles += fs.readdirSync(shareMemoryPath).filter((f) => /^MEM-\d+\.md$/.test(f)).length;
  }

  const diff = Math.abs(indexRows - noteFiles);
  return { detected: diff > 0, index_rows: indexRows, note_files: noteFiles, diff };
}

function buildProposal(rows, windowHours) {
  const nowMs = Date.now();
  const windowStartMs = nowMs - windowHours * 60 * 60 * 1000;
  const inWindowRows = rows.filter((row) => {
    const t = new Date(row.ts || 0).getTime();
    return Number.isFinite(t) && t >= windowStartMs && t <= nowMs;
  });
  const validRows = inWindowRows.filter((row) => {
    if (row.event === "memory.merge.diagnosed") {
      const mergeKindResult = validateMergeKind(row.merge_kind);
      if (!mergeKindResult.ok) return false;
    }
    if (row.governance_context != null) {
      const ctxResult = normalizeGovernanceContext(row.governance_context, row.event || "governance_event");
      if (!ctxResult.ok) return false;
    }
    return true;
  });
  const merges = validRows.filter((row) => row.event === "memory.merge.diagnosed");
  const dedupeApplied = validRows.filter((row) => row.event === "memory.dedupe.applied");
  const dedupeSuggested = validRows.filter((row) => row.event === "memory.dedupe.suggested");
  const relatedNew = validRows.filter((row) => row.event === "memory.new.created_but_related_exists");
  const noteCreated = validRows.filter((row) => row.event === "memory_note_created");
  const retrievePerformed = validRows.filter((row) => row.event === "memory.retrieve.performed");

  const aggregate = new Map();
  for (const row of validRows) {
    const noteId = row.note_id || "";
    if (!noteId) continue;
    if (!aggregate.has(noteId)) {
      aggregate.set(noteId, {
        note_id: noteId,
        diagnosis_tags: new Set(),
        merge_count: 0,
        dedupe_applied_count: 0,
        dedupe_suggested_count: 0,
        related_new_count: 0,
        first_seen_at: row.ts || "",
        last_seen_at: row.ts || "",
      });
    }
    const item = aggregate.get(noteId);
    if (row.event === "memory.merge.diagnosed") {
      item.merge_count += 1;
      if (Array.isArray(row.diagnosis_tags)) {
        for (const tag of row.diagnosis_tags) item.diagnosis_tags.add(tag);
      }
      if (row.primary_tag) item.diagnosis_tags.add(row.primary_tag);
    } else if (row.event === "memory.dedupe.applied") {
      item.dedupe_applied_count += 1;
      item.diagnosis_tags.add("dedupe_applied");
    } else if (row.event === "memory.dedupe.suggested") {
      item.dedupe_suggested_count += 1;
      item.diagnosis_tags.add("dedupe_pressure");
    } else if (row.event === "memory.new.created_but_related_exists") {
      item.related_new_count += 1;
      item.diagnosis_tags.add("fragmentation_signal");
    }
    if (row.ts && (!item.first_seen_at || row.ts < item.first_seen_at)) item.first_seen_at = row.ts;
    if (row.ts && (!item.last_seen_at || row.ts > item.last_seen_at)) item.last_seen_at = row.ts;
  }

  const findings = [...aggregate.values()]
    .filter((item) => item.merge_count + item.dedupe_applied_count + item.dedupe_suggested_count + item.related_new_count > 0)
    .sort((a, b) => {
      const sa = a.merge_count + a.dedupe_applied_count + a.dedupe_suggested_count + a.related_new_count;
      const sb = b.merge_count + b.dedupe_applied_count + b.dedupe_suggested_count + b.related_new_count;
      return sb - sa;
    })
    .slice(0, 20)
    .map((item, index) => ({
      finding_id: `finding-${String(index + 1).padStart(3, "0")}`,
      note_id: item.note_id,
      primary_tag:
        item.related_new_count > 0
          ? "fragmentation_signal"
          : item.dedupe_suggested_count > 0
            ? "dedupe_pressure"
            : "merge_opportunity",
      diagnosis_tags: [...item.diagnosis_tags],
      merge_count: item.merge_count,
      dedupe_applied_count: item.dedupe_applied_count,
      dedupe_suggested_count: item.dedupe_suggested_count,
      related_new_count: item.related_new_count,
      first_seen_at: toIso(item.first_seen_at),
      last_seen_at: toIso(item.last_seen_at),
      confidence:
        item.merge_count + item.dedupe_applied_count + item.dedupe_suggested_count + item.related_new_count >= 3
          ? "high"
          : "medium",
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
      reason: `${finding.primary_tag} repeated in ${windowHours}h window`,
      suggested_update: {
        primary_tag: finding.primary_tag,
        hint: `Focus on ${finding.primary_tag} for ${finding.note_id}`,
      },
    };
  });

  const adoptedRetrievals = retrievePerformed.filter(
    (row) => Array.isArray(row.adopted) && row.adopted.length > 0
  ).length;
  const correctionWrites = noteCreated.filter((row) => row.source === "remember").length;
  const metrics = {
    duplicate_creation_rate: ratio(relatedNew.length, Math.max(noteCreated.length, 1)),
    merge_conversion_rate: ratio(merges.length, Math.max(merges.length + relatedNew.length, 1)),
    fragmentation_index: ratio(relatedNew.length + dedupeSuggested.length, Math.max(noteCreated.length, 1)),
    post_injection_correction_rate: ratio(correctionWrites, Math.max(adoptedRetrievals, 1)),
  };
  const signal_counts = {
    merge_diagnosed: merges.length,
    dedupe_applied: dedupeApplied.length,
    dedupe_suggested: dedupeSuggested.length,
    new_related_exists: relatedNew.length,
  };

  return {
    proposal_id: `proposal-${new Date(nowMs).toISOString().replace(/[:.]/g, "-")}`,
    generated_at: new Date(nowMs).toISOString(),
    window_hours: windowHours,
    findings,
    actions,
    metrics,
    signal_counts,
    constraints: {
      auto_apply_risk: "low",
      max_actions_per_cycle: 20,
    },
  };
}

function writeDiagnosticsMd(outputPath, proposal, indexDrift) {
  const lines = [];
  lines.push("# Memory Diagnostics");
  lines.push("");
  lines.push(`- Proposal ID: \`${proposal.proposal_id}\``);
  lines.push(`- Generated At: \`${proposal.generated_at}\``);
  lines.push(`- Window: last \`${proposal.window_hours}\` hours`);
  lines.push(`- Findings: \`${proposal.findings.length}\``);
  lines.push(`- Actions: \`${proposal.actions.length}\``);
  lines.push(
    `- Metrics: duplicate_creation_rate=\`${proposal.metrics.duplicate_creation_rate}\`, merge_conversion_rate=\`${proposal.metrics.merge_conversion_rate}\`, fragmentation_index=\`${proposal.metrics.fragmentation_index}\`, post_injection_correction_rate=\`${proposal.metrics.post_injection_correction_rate}\``
  );
  if (indexDrift) {
    const driftStatus = indexDrift.detected
      ? `**DRIFT DETECTED** (index_rows=${indexDrift.index_rows}, note_files=${indexDrift.note_files}, diff=${indexDrift.diff}) — 建议运行 \`/memory-govern\` 修复`
      : `OK (index_rows=${indexDrift.index_rows}, note_files=${indexDrift.note_files})`;
    lines.push(`- Index Health: ${driftStatus}`);
  }
  lines.push("");
  lines.push("## Top Findings");
  lines.push("");
  if (proposal.findings.length === 0) {
    lines.push("- No merge diagnosis findings in this window.");
  } else {
    for (const f of proposal.findings.slice(0, 10)) {
      lines.push(
        `- ${f.finding_id}: ${f.note_id}, tag=${f.primary_tag}, merges=${f.merge_count}, dedupe_suggested=${f.dedupe_suggested_count}, related_new=${f.related_new_count}, confidence=${f.confidence}`
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
  const journalPath = path.join(projectRoot, ".lingxi/os/MEMORY_JOURNAL.jsonl");
  payload.ts = new Date().toISOString();
  fs.appendFileSync(journalPath, JSON.stringify(payload) + "\n", "utf8");
  return true;
}

function markImprovementCycle(projectRoot, tsIso) {
  const controlPath = path.join(projectRoot, HEARTBEAT_CONTROL_REL);
  let control = {
    last_distillation_completed_at: null,
    heartbeat: { running: false, started_at: null, run_id: null },
    pending_distillation: null,
    processed_conversation_ids: [],
    last_improvement_cycle_at: null,
    last_improvement_prompted_session_id: null,
    last_improvement_prompted_at: null,
  };
  if (fs.existsSync(controlPath)) {
    try {
      control = { ...control, ...JSON.parse(fs.readFileSync(controlPath, "utf8")) };
    } catch {}
  }
  control.last_improvement_cycle_at = tsIso;
  // 诊断周期已完成，清理会话级提示标记，便于下一次 24h 窗口重新触发。
  control.last_improvement_prompted_session_id = null;
  control.last_improvement_prompted_at = null;
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
  const indexDrift = checkIndexDrift(projectRoot);
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
    metrics: proposal.metrics,
    signal_counts: proposal.signal_counts,
    top_findings: proposal.findings.slice(0, 5).map((f) => ({
      finding_id: f.finding_id,
      note_id: f.note_id,
      primary_tag: f.primary_tag,
      merge_count: f.merge_count,
      dedupe_suggested_count: f.dedupe_suggested_count,
      related_new_count: f.related_new_count,
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
    writeDiagnosticsMd(mdOut, proposal, indexDrift);
    appendAudit(projectRoot, {
      event: "memory.improvement.proposed",
      proposal_id: proposal.proposal_id,
      findings: proposal.findings.map((f) => ({
        finding_id: f.finding_id,
        note_id: f.note_id,
        primary_tag: f.primary_tag,
        merge_count: f.merge_count,
        dedupe_suggested_count: f.dedupe_suggested_count,
        related_new_count: f.related_new_count,
      })),
      actions: proposal.actions.map((a) => ({
        action_id: a.action_id,
        note_id: a.note_id,
        type: a.type,
        risk: a.risk,
      })),
      metrics: proposal.metrics,
      signal_counts: proposal.signal_counts,
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
      index_drift: indexDrift,
    }) + "\n"
  );
}

main();
