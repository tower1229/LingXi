export async function runMemorySemanticTask(request) {
  switch (request.operation) {
    case "distill":
      return {
        schema_version: "draft-2026-04-11",
        session_id: request.payload?.session_id || "session-invalid",
        content_fingerprint: request.payload?.content_fingerprint || "sha256:test",
        distill_version: request.payload?.distill_version || "v2",
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
        action: "invalid_action",
        reason: "invalid governance action for fail-fast coverage",
        confidence: 0.5
      };
    case "govern_batch":
      return {
        schema_version: "draft-2026-04-08",
        decisions: (request.payload?.candidates || []).map(() => ({
          action: "invalid_action",
          reason: "invalid batch governance action for fail-fast coverage",
          confidence: 0.5
        }))
      };
    case "retrieve":
      return {
        schema_version: "draft-2026-04-08",
        query: request.payload?.query || "",
        hits: []
      };
    default:
      throw new Error(`Unsupported test semantic operation: ${request.operation}`);
  }
}

export default runMemorySemanticTask;
