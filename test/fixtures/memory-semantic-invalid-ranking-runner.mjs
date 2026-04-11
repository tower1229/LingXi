export async function runMemorySemanticTask(request) {
  switch (request.operation) {
    case "taste_extract":
      return {
        schema_version: "draft-2026-04-11-extract",
        session_id: request.payload?.session_id || "session-invalid",
        content_fingerprint: request.payload?.content_fingerprint || "sha256:test",
        distill_version: request.payload?.distill_version || "v3",
        summary: {
          session_summary: "No durable engineering taste detected.",
          extracted_candidate_count: 0,
          discarded_signal_count: 0
        },
        candidates: []
      };
    case "taste_adjudicate":
      return {
        schema_version: "draft-2026-04-11",
        session_id: request.payload?.session?.session_id || "session-invalid",
        content_fingerprint: request.payload?.session?.content_fingerprint || "sha256:test",
        distill_version: request.payload?.session?.distill_version || "v3",
        summary: {
          session_summary: "No durable engineering taste detected.",
          durable_candidate_count: 0,
          discarded_signal_count: 0
        },
        candidates: []
      };
    case "distill":
      return {
        schema_version: "draft-2026-04-11",
        session_id: request.payload?.session_id || "session-invalid",
        content_fingerprint: request.payload?.content_fingerprint || "sha256:test",
        distill_version: request.payload?.distill_version || "v3",
        summary: {
          session_summary: "No durable engineering taste detected.",
          durable_candidate_count: 0,
          discarded_signal_count: 0
        },
        candidates: []
      };
    case "govern":
      return {
        schema_version: "draft-2026-04-08",
        action: "skip_as_not_durable",
        reason: "unused governance path",
        confidence: 0.5
      };
    case "govern_batch":
      return {
        schema_version: "draft-2026-04-08",
        decisions: (request.payload?.candidates || []).map(() => ({
          action: "skip_as_not_durable",
          reason: "unused governance path",
          confidence: 0.5
        }))
      };
    case "retrieve":
      return {
        schema_version: "draft-2026-04-08",
        query: request.payload?.query || "",
        hits: [
          {
            note_id: "MEM-999",
            score: 101,
            reason: "invalid ranking payload for fail-fast coverage"
          }
        ]
      };
    default:
      throw new Error(`Unsupported test semantic operation: ${request.operation}`);
  }
}

export default runMemorySemanticTask;
