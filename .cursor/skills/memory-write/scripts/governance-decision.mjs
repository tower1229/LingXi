/**
 * Hard-threshold governance decision tree (no scoring).
 * This module is a deterministic reference used by tests/docs.
 */

function bool(v) {
  return v === true;
}

export function decideGovernance(input = {}) {
  const sameSubject = bool(input.same_subject);
  const sameConclusion = bool(input.same_conclusion);
  const nonConflicting = bool(input.non_conflicting);
  const conflicting = bool(input.conflicting);
  const decisiveChoice = bool(input.decisive_choice);
  const targetNoteId = typeof input.target_note_id === "string" ? input.target_note_id : "";

  if (sameSubject && sameConclusion) {
    return {
      decision: "dedupe",
      merge_kind: "",
      target_note_id: targetNoteId,
      governance_context: {
        subject_relation: "same_subject",
        conclusion_relation: "same_conclusion",
      },
    };
  }

  if (sameSubject && nonConflicting) {
    return {
      decision: "merge",
      merge_kind: "subject_expansion",
      target_note_id: targetNoteId,
      governance_context: {
        subject_relation: "same_subject",
        conclusion_relation: "non_conflicting",
      },
    };
  }

  if (!sameSubject && sameConclusion) {
    return {
      decision: "merge",
      merge_kind: "scope_expansion",
      target_note_id: targetNoteId,
      governance_context: {
        subject_relation: "different_subject",
        conclusion_relation: "same_conclusion",
      },
    };
  }

  if (conflicting && decisiveChoice) {
    return {
      decision: "replace",
      merge_kind: "",
      target_note_id: targetNoteId,
      governance_context: {
        subject_relation: sameSubject ? "same_subject" : "different_subject",
        conclusion_relation: "conflicting",
      },
    };
  }

  if (conflicting) {
    return {
      decision: "veto",
      merge_kind: "",
      target_note_id: targetNoteId,
      governance_context: {
        subject_relation: sameSubject ? "same_subject" : "different_subject",
        conclusion_relation: "conflicting",
      },
    };
  }

  return {
    decision: "new",
    merge_kind: "",
    target_note_id: targetNoteId,
    governance_context: {
      subject_relation: sameSubject ? "same_subject" : "different_subject",
      conclusion_relation: sameConclusion ? "same_conclusion" : "unknown",
    },
  };
}

