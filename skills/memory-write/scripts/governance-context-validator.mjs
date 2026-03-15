export const GOVERNANCE_SUBJECT_RELATIONS = ["same_subject", "different_subject"];
export const GOVERNANCE_CONCLUSION_RELATIONS = [
  "same_conclusion",
  "non_conflicting",
  "conflicting",
  "unknown",
];
export const MERGE_KINDS = ["subject_expansion", "scope_expansion"];

function isString(v) {
  return typeof v === "string";
}

function isNonEmptyStringArray(v) {
  return Array.isArray(v) && v.length > 0 && v.every((item) => typeof item === "string" && item.length > 0);
}

function isOneOf(v, options) {
  return typeof v === "string" && options.includes(v);
}

export function validateMergeKind(value) {
  if (value == null) return { ok: true };
  if (isOneOf(value, MERGE_KINDS)) return { ok: true };
  return { ok: false, reason: "merge_kind must be subject_expansion/scope_expansion" };
}

export function normalizeGovernanceContext(ctx, eventName = "governance_event") {
  if (!ctx || typeof ctx !== "object") {
    return { ok: true, value: undefined };
  }

  if (!isOneOf(ctx.subject_relation, GOVERNANCE_SUBJECT_RELATIONS)) {
    return { ok: false, reason: `${eventName} governance_context.subject_relation invalid` };
  }
  if (!isOneOf(ctx.conclusion_relation, GOVERNANCE_CONCLUSION_RELATIONS)) {
    return { ok: false, reason: `${eventName} governance_context.conclusion_relation invalid` };
  }
  if (ctx.target_note_id != null && !isString(ctx.target_note_id)) {
    return { ok: false, reason: `${eventName} governance_context.target_note_id must be string` };
  }
  if (ctx.idempotency_key != null && !isString(ctx.idempotency_key)) {
    return { ok: false, reason: `${eventName} governance_context.idempotency_key must be string` };
  }
  if (ctx.applied_changes != null && !isNonEmptyStringArray(ctx.applied_changes)) {
    return { ok: false, reason: `${eventName} governance_context.applied_changes must be non-empty string[]` };
  }

  return { ok: true, value: ctx };
}

