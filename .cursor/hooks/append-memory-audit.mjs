#!/usr/bin/env node
/**
 * Unified audit appender for memory events.
 * Accepts one JSON argument and appends one NDJSON line into audit.log.
 * Non-compatible mode: only v2 memory retrieve events are accepted.
 * Event contract reference: .cursor/hooks/schemas/memory-audit-events.schema.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalizeGovernanceContext,
  validateMergeKind,
} from "../skills/memory-write/scripts/governance-context-validator.mjs";

const AUDIT_REL = ".lingxi/workspace/audit.log";
const AUDIT_SCHEMA_REL = "schemas/memory-audit-events.schema.json";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ROTATE_LOCK_SUFFIX = ".rotate.lock";
const MEMORY_WRITE_EVENTS = new Set([
  "memory_note_created",
  "memory_note_updated",
  "memory_note_deleted",
  "memory_index_updated",
]);
const MEMORY_RETRIEVE_EVENTS = new Set([
  "memory.retrieve.performed",
  "memory.retrieve.skipped",
  "memory.retrieve.missing",
  "memory.retrieve.invalid",
]);
const MEMORY_GOVERNANCE_EVENTS = new Set([
  "memory.merge.diagnosed",
  "memory.merge.invalid",
  "memory.dedupe.applied",
  "memory.dedupe.suggested",
  "memory.new.created_but_related_exists",
]);
const MEMORY_IMPROVEMENT_EVENTS = new Set([
  "memory.improvement.proposed",
  "memory.improvement.approved",
  "memory.improvement.rejected",
  "memory.improvement.applied",
  "memory.improvement.failed",
]);

function loadAuditSchemaContract() {
  try {
    const hooksDir = path.dirname(fileURLToPath(import.meta.url));
    const schemaPath = path.join(hooksDir, AUDIT_SCHEMA_REL);
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    const eventEnum = schema?.$defs?.eventEnum?.enum;
    if (!Array.isArray(eventEnum)) return null;
    const requiredByEvent = new Map();
    const oneOf = Array.isArray(schema.oneOf) ? schema.oneOf : [];
    for (const item of oneOf) {
      const ref = item?.$ref;
      if (typeof ref !== "string" || !ref.startsWith("#/$defs/")) continue;
      const defName = ref.slice("#/$defs/".length);
      const def = schema?.$defs?.[defName];
      const eventConst = def?.properties?.event?.const;
      const required = Array.isArray(def?.required) ? def.required : [];
      if (typeof eventConst === "string") {
        requiredByEvent.set(eventConst, required);
      }
    }
    return { allowedEvents: new Set(eventEnum), requiredByEvent };
  } catch {
    return null;
  }
}

const AUDIT_SCHEMA_CONTRACT = loadAuditSchemaContract();

/**
 * 获取系统当前时间戳（ISO 8601格式，UTC）
 */
function getSystemTimestamp() {
  return new Date().toISOString();
}

function isString(v) {
  return typeof v === "string";
}

function isBool(v) {
  return typeof v === "boolean";
}

function isNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
}

function isArray(v) {
  return Array.isArray(v);
}

function buildBasePayload(input) {
  return {
    ts: getSystemTimestamp(),
    event: input.event,
    conversation_id: input.conversation_id ?? "",
    generation_id: input.generation_id ?? "",
  };
}

function invalidPayloadForRetrieve(base, reason, invalidEvent) {
  return {
    ...base,
    event: "memory.retrieve.invalid",
    reason,
    ...(invalidEvent ? { invalid_event: invalidEvent } : {}),
  };
}

function invalidPayloadForWrite(base, reason, invalidEvent) {
  return {
    ...base,
    event: "memory.write.invalid",
    reason,
    ...(invalidEvent ? { invalid_event: invalidEvent } : {}),
  };
}

function invalidPayloadForAudit(base, reason, invalidEvent) {
  return {
    ...base,
    event: "memory.audit.invalid",
    reason,
    ...(invalidEvent ? { invalid_event: invalidEvent } : {}),
  };
}

function invalidPayloadForMerge(base, reason, invalidEvent) {
  return {
    ...base,
    event: "memory.merge.invalid",
    reason,
    ...(invalidEvent ? { invalid_event: invalidEvent } : {}),
  };
}

function invalidPayloadForImprovement(base, reason, invalidEvent) {
  return {
    ...base,
    event: "memory.improvement.failed",
    reason,
    ...(invalidEvent ? { invalid_event: invalidEvent } : {}),
  };
}

function isNonEmptyStringArray(v) {
  return Array.isArray(v) && v.length > 0 && v.every((item) => typeof item === "string" && item.length > 0);
}

function validateMemoryWriteEvent(input, base) {
  const payload = {
    ...base,
    ...(input.note_id != null && { note_id: input.note_id }),
    ...(input.operation != null && { operation: input.operation }),
    ...(input.source != null && { source: input.source }),
    ...(input.file != null && { file: input.file }),
    ...(input.reason != null && { reason: input.reason }),
  };

  if (input.event === "memory_index_updated") return payload;

  if (!isString(input.note_id) || input.note_id.length === 0) {
    return invalidPayloadForWrite(base, "memory write event requires note_id", input.event);
  }
  if (!isString(input.operation) || input.operation.length === 0) {
    return invalidPayloadForWrite(base, "memory write event requires operation", input.event);
  }
  if (!isString(input.file) || input.file.length === 0) {
    return invalidPayloadForWrite(base, "memory write event requires file", input.event);
  }
  if (input.event !== "memory_note_deleted") {
    if (!isString(input.source) || input.source.length === 0) {
      return invalidPayloadForWrite(base, "memory create/update requires source", input.event);
    }
  }
  return payload;
}

function validateMemoryRetrieveEvent(input, base) {
  if (input.event === "memory.retrieve.performed") {
    if (!isString(input.query)) return invalidPayloadForRetrieve(base, "performed requires query", input.event);
    if (!isArray(input.hits)) return invalidPayloadForRetrieve(base, "performed requires hits[]", input.event);
    if (!isArray(input.adopted)) return invalidPayloadForRetrieve(base, "performed requires adopted[]", input.event);
    if (!isArray(input.rejected)) return invalidPayloadForRetrieve(base, "performed requires rejected[]", input.event);
    if (!isBool(input.semantic_called)) return invalidPayloadForRetrieve(base, "performed requires semantic_called(boolean)", input.event);
    if (!isBool(input.keyword_called)) return invalidPayloadForRetrieve(base, "performed requires keyword_called(boolean)", input.event);
    if (!isNumber(input.candidate_read_count) || input.candidate_read_count < 0) {
      return invalidPayloadForRetrieve(base, "performed requires candidate_read_count(number>=0)", input.event);
    }
    if (!isString(input.decision) || input.decision.length === 0) {
      return invalidPayloadForRetrieve(base, "performed requires decision", input.event);
    }
    return {
      ...base,
      query: input.query,
      hits: input.hits,
      adopted: input.adopted,
      rejected: input.rejected,
      semantic_called: input.semantic_called,
      keyword_called: input.keyword_called,
      candidate_read_count: input.candidate_read_count,
      decision: input.decision,
    };
  }

  if (input.event === "memory.retrieve.skipped") {
    if (!isString(input.query)) return invalidPayloadForRetrieve(base, "skipped requires query", input.event);
    if (!isString(input.reason) || input.reason.length === 0) {
      return invalidPayloadForRetrieve(base, "skipped requires reason", input.event);
    }
    return {
      ...base,
      query: input.query,
      reason: input.reason,
      ...(isBool(input.semantic_called) ? { semantic_called: input.semantic_called } : {}),
      ...(isBool(input.keyword_called) ? { keyword_called: input.keyword_called } : {}),
    };
  }

  if (input.event === "memory.retrieve.missing") {
    if (!isString(input.reason) || input.reason.length === 0) {
      return invalidPayloadForRetrieve(base, "missing requires reason", input.event);
    }
    return {
      ...base,
      reason: input.reason,
      ...(isArray(input.expected_events) ? { expected_events: input.expected_events } : {}),
    };
  }

  if (input.event === "memory.retrieve.invalid") {
    if (!isString(input.reason) || input.reason.length === 0) {
      return invalidPayloadForRetrieve(base, "invalid requires reason", input.event);
    }
    return {
      ...base,
      reason: input.reason,
      ...(isString(input.invalid_event) ? { invalid_event: input.invalid_event } : {}),
    };
  }

  return invalidPayloadForRetrieve(base, "unknown memory.retrieve event", input.event);
}

function validateMemoryGovernanceEvent(input, base) {
  if (input.event === "memory.merge.invalid") {
    if (!isString(input.reason) || input.reason.length === 0) {
      return invalidPayloadForMerge(base, "invalid requires reason", input.event);
    }
    return {
      ...base,
      reason: input.reason,
      ...(isString(input.invalid_event) ? { invalid_event: input.invalid_event } : {}),
    };
  }

  if (input.event === "memory.dedupe.applied") {
    if (!isString(input.note_id) || input.note_id.length === 0) {
      return invalidPayloadForMerge(base, "dedupe.applied requires note_id", input.event);
    }
    if (!isString(input.source) || input.source.length === 0) {
      return invalidPayloadForMerge(base, "dedupe.applied requires source", input.event);
    }
    if (!isNonEmptyStringArray(input.deduped_note_ids)) {
      return invalidPayloadForMerge(base, "dedupe.applied requires deduped_note_ids[]", input.event);
    }
    try {
      const governanceContextResult = normalizeGovernanceContext(input.governance_context, input.event);
      if (!governanceContextResult.ok) {
        return invalidPayloadForMerge(base, governanceContextResult.reason, input.event);
      }
      return {
        ...base,
        note_id: input.note_id,
        source: input.source,
        deduped_note_ids: input.deduped_note_ids,
        ...(isString(input.reason) ? { reason: input.reason } : {}),
        ...(governanceContextResult.value ? { governance_context: governanceContextResult.value } : {}),
      };
    } catch (err) {
      return invalidPayloadForMerge(base, err.message, input.event);
    }
  }

  if (input.event === "memory.dedupe.suggested") {
    if (!isString(input.note_id) || input.note_id.length === 0) {
      return invalidPayloadForMerge(base, "dedupe.suggested requires note_id", input.event);
    }
    if (!isString(input.source) || input.source.length === 0) {
      return invalidPayloadForMerge(base, "dedupe.suggested requires source", input.event);
    }
    if (!isNonEmptyStringArray(input.dedupe_candidates)) {
      return invalidPayloadForMerge(base, "dedupe.suggested requires dedupe_candidates[]", input.event);
    }
    try {
      const governanceContextResult = normalizeGovernanceContext(input.governance_context, input.event);
      if (!governanceContextResult.ok) {
        return invalidPayloadForMerge(base, governanceContextResult.reason, input.event);
      }
      return {
        ...base,
        note_id: input.note_id,
        source: input.source,
        dedupe_candidates: input.dedupe_candidates,
        ...(isString(input.reason) ? { reason: input.reason } : {}),
        ...(governanceContextResult.value ? { governance_context: governanceContextResult.value } : {}),
      };
    } catch (err) {
      return invalidPayloadForMerge(base, err.message, input.event);
    }
  }

  if (input.event === "memory.new.created_but_related_exists") {
    if (!isString(input.note_id) || input.note_id.length === 0) {
      return invalidPayloadForMerge(base, "new.created_but_related_exists requires note_id", input.event);
    }
    if (!isString(input.source) || input.source.length === 0) {
      return invalidPayloadForMerge(base, "new.created_but_related_exists requires source", input.event);
    }
    if (!isNonEmptyStringArray(input.related_note_ids)) {
      return invalidPayloadForMerge(base, "new.created_but_related_exists requires related_note_ids[]", input.event);
    }
    try {
      const governanceContextResult = normalizeGovernanceContext(input.governance_context, input.event);
      if (!governanceContextResult.ok) {
        return invalidPayloadForMerge(base, governanceContextResult.reason, input.event);
      }
      return {
        ...base,
        note_id: input.note_id,
        source: input.source,
        related_note_ids: input.related_note_ids,
        ...(isString(input.reason) ? { reason: input.reason } : {}),
        ...(governanceContextResult.value ? { governance_context: governanceContextResult.value } : {}),
      };
    } catch (err) {
      return invalidPayloadForMerge(base, err.message, input.event);
    }
  }

  if (input.event !== "memory.merge.diagnosed") {
    return invalidPayloadForMerge(base, "unknown governance event", input.event);
  }
  if (!isString(input.note_id) || input.note_id.length === 0) {
    return invalidPayloadForMerge(base, "diagnosed requires note_id", input.event);
  }
  if (!isString(input.source) || input.source.length === 0) {
    return invalidPayloadForMerge(base, "diagnosed requires source", input.event);
  }
  if (!isNonEmptyStringArray(input.diagnosis_tags)) {
    return invalidPayloadForMerge(base, "diagnosed requires diagnosis_tags[]", input.event);
  }
  if (!isString(input.primary_tag) || !input.diagnosis_tags.includes(input.primary_tag)) {
    return invalidPayloadForMerge(base, "primary_tag must be included in diagnosis_tags", input.event);
  }
  if (!Array.isArray(input.action_plan)) {
    return invalidPayloadForMerge(base, "diagnosed requires action_plan[]", input.event);
  }
  if (
    (!input.merge_context || typeof input.merge_context !== "object") &&
    (!input.governance_context || typeof input.governance_context !== "object")
  ) {
    return invalidPayloadForMerge(base, "diagnosed requires merge_context or governance_context", input.event);
  }
  const sameScenario = input.merge_context?.same_scenario;
  const sameConclusion = input.merge_context?.same_conclusion;
  if (
    input.merge_context &&
    ((sameScenario != null && !isBool(sameScenario)) || (sameConclusion != null && !isBool(sameConclusion)))
  ) {
    return invalidPayloadForMerge(base, "merge_context same_scenario/same_conclusion must be boolean", input.event);
  }
  const mergeKindResult = validateMergeKind(input.merge_kind);
  if (!mergeKindResult.ok) {
    return invalidPayloadForMerge(base, mergeKindResult.reason, input.event);
  }

  try {
    const governanceContextResult = normalizeGovernanceContext(input.governance_context, input.event);
    if (!governanceContextResult.ok) {
      return invalidPayloadForMerge(base, governanceContextResult.reason, input.event);
    }
    return {
      ...base,
      note_id: input.note_id,
      source: input.source,
      diagnosis_tags: input.diagnosis_tags,
      primary_tag: input.primary_tag,
      ...(input.merge_context && typeof input.merge_context === "object" ? { merge_context: input.merge_context } : {}),
      ...(isString(input.merge_kind) ? { merge_kind: input.merge_kind } : {}),
      ...(governanceContextResult.value ? { governance_context: governanceContextResult.value } : {}),
      action_plan: input.action_plan,
      ...(isString(input.status) ? { status: input.status } : {}),
    };
  } catch (err) {
    return invalidPayloadForMerge(base, err.message, input.event);
  }
}

function validateMemoryImprovementEvent(input, base) {
  if (!isString(input.proposal_id) || input.proposal_id.length === 0) {
    return invalidPayloadForImprovement(base, "improvement event requires proposal_id", input.event);
  }
  if (input.event === "memory.improvement.proposed") {
    if (!isArray(input.findings)) {
      return invalidPayloadForImprovement(base, "proposed requires findings[]", input.event);
    }
    if (!isArray(input.actions)) {
      return invalidPayloadForImprovement(base, "proposed requires actions[]", input.event);
    }
  }
  if (input.event === "memory.improvement.approved" || input.event === "memory.improvement.rejected") {
    if (!isArray(input.action_ids)) {
      return invalidPayloadForImprovement(base, "approved/rejected requires action_ids[]", input.event);
    }
  }
  if (input.event === "memory.improvement.applied" || input.event === "memory.improvement.failed") {
    if (!isString(input.action_id) || input.action_id.length === 0) {
      return invalidPayloadForImprovement(base, "applied/failed requires action_id", input.event);
    }
  }
  return {
    ...base,
    proposal_id: input.proposal_id,
    ...(isArray(input.findings) ? { findings: input.findings } : {}),
    ...(isArray(input.actions) ? { actions: input.actions } : {}),
    ...(isArray(input.action_ids) ? { action_ids: input.action_ids } : {}),
    ...(isString(input.action_id) ? { action_id: input.action_id } : {}),
    ...(isString(input.reason) ? { reason: input.reason } : {}),
    ...(isString(input.invalid_event) ? { invalid_event: input.invalid_event } : {}),
  };
}

function invalidPayloadByEventType(base, event, reason) {
  if (MEMORY_WRITE_EVENTS.has(event)) return invalidPayloadForWrite(base, reason, event);
  if (MEMORY_RETRIEVE_EVENTS.has(event)) return invalidPayloadForRetrieve(base, reason, event);
  if (MEMORY_GOVERNANCE_EVENTS.has(event)) return invalidPayloadForMerge(base, reason, event);
  if (MEMORY_IMPROVEMENT_EVENTS.has(event)) return invalidPayloadForImprovement(base, reason, event);
  return invalidPayloadForAudit(base, reason, event);
}

function buildPayload(input) {
  const base = buildBasePayload(input);
  if (!isString(input.event) || input.event.length === 0) {
    return invalidPayloadForAudit(base, "event is required", "");
  }
  if (AUDIT_SCHEMA_CONTRACT) {
    if (!AUDIT_SCHEMA_CONTRACT.allowedEvents.has(input.event)) {
      return invalidPayloadForAudit(base, "event not allowed by schema", input.event);
    }
    const required = AUDIT_SCHEMA_CONTRACT.requiredByEvent.get(input.event) || [];
    for (const field of required) {
      if (input[field] == null) {
        return invalidPayloadByEventType(base, input.event, `schema required field missing: ${field}`);
      }
    }
  }

  if (MEMORY_WRITE_EVENTS.has(input.event)) {
    return validateMemoryWriteEvent(input, base);
  }
  if (MEMORY_RETRIEVE_EVENTS.has(input.event)) {
    return validateMemoryRetrieveEvent(input, base);
  }
  if (MEMORY_GOVERNANCE_EVENTS.has(input.event)) {
    return validateMemoryGovernanceEvent(input, base);
  }
  if (MEMORY_IMPROVEMENT_EVENTS.has(input.event)) {
    return validateMemoryImprovementEvent(input, base);
  }
  return invalidPayloadForAudit(base, "unsupported event for append-memory-audit", input.event);
}

/**
 * 轮转审计日志文件：当文件超过大小限制时，采用标准原子重命名法轮转。
 */
function rotateAuditFile(auditPath) {
  try {
    const stats = fs.statSync(auditPath, { throwIfNoEntry: false });
    if (!stats || stats.size < MAX_FILE_SIZE) {
      return; // 无需轮转
    }

    const bakPath = auditPath + '.1';
    if (fs.existsSync(bakPath)) fs.unlinkSync(bakPath);

    fs.renameSync(auditPath, bakPath);
  } catch (err) {
    console.error("[append-memory-audit] Rotation failed:", err.message);
  }
}

function main() {
  const raw = process.argv[2];
  if (!raw) {
    console.error("Usage: node append-memory-audit.mjs '<JSON>'");
    process.exit(1);
  }
  let input;
  try {
    input = JSON.parse(raw);
  } catch (err) {
    console.error("[append-memory-audit] invalid JSON:", err.message);
    process.exit(1);
  }
  const projectRoot = process.env.CURSOR_PROJECT_DIR || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const auditPath = path.join(projectRoot, AUDIT_REL);
  const workspaceDir = path.dirname(auditPath);
  const payload = buildPayload(input);

  // 确保目录存在
  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }

  // 检查文件大小并轮转（如果存在且超过限制）
  if (fs.existsSync(auditPath)) {
    rotateAuditFile(auditPath);
  }

  const line = JSON.stringify(payload) + "\n";
  fs.appendFileSync(auditPath, line, { encoding: "utf8", flag: "a" });
}

main();
