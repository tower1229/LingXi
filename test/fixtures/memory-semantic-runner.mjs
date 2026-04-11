function normalizeText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(values) {
  const out = [];
  const seen = new Set();
  for (const value of values || []) {
    const normalized = normalizeText(value);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

function sentenceChunks(text) {
  return String(text || "")
    .split(/[.!?。！？]/)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function flattenContextText(value) {
  if (Array.isArray(value)) {
    return value.map((item) => flattenContextText(item)).filter(Boolean).join(" ");
  }
  if (value && typeof value === "object") {
    return Object.values(value).map((item) => flattenContextText(item)).filter(Boolean).join(" ");
  }
  return normalizeText(value);
}

const CONCEPTS = [
  {
    id: "explicit_interfaces",
    kind: "preference",
    title: "Prefer explicit interfaces",
    one_liner: "Prefer explicit interfaces over hidden coupling.",
    decision: "Use explicit interfaces when module or integration boundaries matter.",
    when_to_load: ["When defining module or integration boundaries"],
    patterns: [
      /explicit interface/i,
      /explicit interfaces/i,
      /module boundaries/i,
      /hidden coupling/i,
      /make the interface explicit/i,
      /backend seam/i,
      /explicit entrypoint/i
    ]
  },
  {
    id: "rollback_notes",
    kind: "preference",
    title: "Prefer explicit rollback notes",
    one_liner: "Prefer explicit rollback path before implementation for backend integration changes.",
    decision: "Document rollback path and rollback order before implementation for backend integration changes.",
    when_to_load: ["When planning or reviewing backend integration changes"],
    patterns: [
      /rollback notes?/i,
      /rollback path/i,
      /rollback order/i,
      /rollback visibility/i,
      /make rollback explicit/i
    ]
  },
  {
    id: "small_patches",
    kind: "preference",
    title: "Prefer small reviewable patches",
    one_liner: "Prefer small reviewable patches.",
    decision: "Split changes into smaller reviewable units instead of broad refactors.",
    when_to_load: ["When planning a code change"],
    patterns: [
      /small reviewable patches?/i,
      /smaller reviewable patches?/i,
      /small patch/i,
      /smaller changes/i,
      /small reviewable units/i,
      /blast radius/i,
      /broad refactors? when a small patch is enough/i
    ]
  },
  {
    id: "stable_contracts",
    kind: "preference",
    title: "Prefer stable contracts",
    one_liner: "Prefer stable contracts over clever shortcuts.",
    decision: "Choose stable contracts over clever shortcuts when shaping interfaces.",
    when_to_load: ["When defining API or SDK contracts"],
    patterns: [
      /stable contracts?/i,
      /clever shortcuts?/i
    ]
  },
  {
    id: "reader_first_docs",
    kind: "preference",
    title: "Prefer reader-first docs structure",
    one_liner: "Prefer reader-first docs structure.",
    decision: "Optimize documentation structure for reader entrypoints and onboarding flow.",
    when_to_load: ["When updating contributor guides or docs"],
    patterns: [
      /reader-first docs?/i,
      /reader entrypoints?/i,
      /contributor guide/i,
      /onboarding section/i
    ]
  },
  {
    id: "integration_order",
    kind: "preference",
    title: "Prefer rollback path before implementation",
    one_liner: "Prefer documenting rollback path before implementation.",
    decision: "Write down rollback path, change order, and dependency coordination before implementation.",
    when_to_load: ["When planning backend integration changes"],
    patterns: [
      /integration change order/i,
      /change order/i,
      /dependency coordination/i,
      /before implementation/i
    ]
  }
];

function detectConceptIds(text) {
  const normalized = normalizeText(text);
  return CONCEPTS
    .filter((concept) => concept.patterns.some((pattern) => pattern.test(normalized)))
    .map((concept) => concept.id);
}

function conceptById(id) {
  return CONCEPTS.find((concept) => concept.id === id);
}

function candidateFromConcept(conceptId, evidenceText) {
  const concept = conceptById(conceptId);
  return {
    title: concept.title,
    scene: concept.when_to_load[0],
    content_type: concept.kind === "heuristic" ? "heuristic" : "preference",
    alternatives: ["Keep the current implicit or broader approach"],
    choice: concept.decision,
    rationale: "This direction is more reusable and safer for future engineering work.",
    kind: concept.kind,
    one_liner: concept.one_liner,
    decision: concept.decision,
    pattern_hint: concept.when_to_load[0],
    when_to_load: concept.when_to_load,
    evidence: [normalizeText(evidenceText) || concept.one_liner],
    confidence: 0.86,
    durability_reason: "This is a reusable engineering preference that should shape future task framing and review.",
    value_scores: {
      decision_gain: 3,
      reusability: 3,
      trigger_clarity: 2,
      verifiability: 2,
      stability: 3
    },
    reusability_scope: "project",
    suggested_storage_kind: concept.kind
  };
}

function normalizeCandidate(candidate) {
  return {
    title: normalizeText(candidate.title),
    kind: normalizeText(candidate.kind),
    one_liner: normalizeText(candidate.one_liner),
    decision: normalizeText(candidate.decision),
    when_to_load: uniqueStrings(candidate.when_to_load || []),
    evidence: uniqueStrings(candidate.evidence || [])
  };
}

function candidateConcepts(candidate) {
  return uniqueStrings(
    detectConceptIds(
      [
        candidate.title,
        candidate.one_liner,
        candidate.decision,
        ...(candidate.when_to_load || [])
      ].join(" ")
    )
  );
}

function mergeNote(existing, candidate, conceptIds) {
  const concepts = uniqueStrings(conceptIds).map((id) => conceptById(id)).filter(Boolean);
  const strongest = concepts[0] || {
    title: candidate.title,
    kind: candidate.kind,
    one_liner: candidate.one_liner,
    decision: candidate.decision,
    when_to_load: candidate.when_to_load
  };
  return {
    title: strongest.title,
    kind: strongest.kind,
    one_liner: strongest.one_liner.length >= existing.one_liner.length ? strongest.one_liner : existing.one_liner,
    decision: strongest.decision.length >= existing.decision.length ? strongest.decision : existing.decision,
    when_to_load: uniqueStrings([...(existing.when_to_load || []), ...(candidate.when_to_load || []), ...(strongest.when_to_load || [])]),
    evidence: uniqueStrings([...(existing.evidence || []), ...(candidate.evidence || [])])
  };
}

function lexicalTokens(text) {
  return normalizeText(text)
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fff]+/u)
    .filter(Boolean);
}

function lexicalOverlapScore(query, note) {
  const queryTokens = new Set(lexicalTokens(query));
  if (queryTokens.size === 0) return 0;
  const noteText = [
    note.title,
    note.one_liner,
    note.decision,
    ...(note.when_to_load || [])
  ].join(" ");
  let score = 0;
  for (const token of queryTokens) {
    if (lexicalTokens(noteText).includes(token)) score += 4;
  }
  return score;
}

function distill(payload) {
  const sentences = (payload.messages || []).flatMap((message) => sentenceChunks(message.content));
  const seen = new Set();
  const candidates = [];
  for (const sentence of sentences) {
    for (const conceptId of detectConceptIds(sentence)) {
      if (seen.has(conceptId)) continue;
      seen.add(conceptId);
      candidates.push(candidateFromConcept(conceptId, sentence));
    }
  }
  return {
    schema_version: "draft-2026-04-11",
    session_id: payload.session_id,
    content_fingerprint: payload.content_fingerprint,
    distill_version: payload.distill_version,
    summary: {
      session_summary: candidates.length > 0 ? "The session contains durable engineering taste." : "No durable engineering taste detected.",
      durable_candidate_count: candidates.length,
      discarded_signal_count: Math.max(0, sentences.length - candidates.length)
    },
    candidates
  };
}

function govern(payload) {
  const candidate = normalizeCandidate(payload.candidate || {});
  const concepts = candidateConcepts(candidate);
  if (concepts.length === 0) {
    return {
    schema_version: "draft-2026-04-08",
    reason_code: "skip_low_value",
    action: "skip_as_not_durable",
    reason: "The candidate does not express durable engineering taste.",
    confidence: 0.9
    };
  }

  const existingNotes = payload.existing_notes || [];
  let target = null;
  for (const note of existingNotes) {
    const noteConcepts = candidateConcepts(note);
    if (noteConcepts.some((concept) => concepts.includes(concept))) {
      target = note;
      break;
    }
  }

  if (target) {
    return {
      schema_version: "draft-2026-04-08",
      action: "merge_into_existing",
      target_note_id: target.id,
      reason_code: candidate.evidence.some((item) => /paraphrase|stronger|repeated|summarized/i.test(item)) ? "merge_strengthen" : "merge_equivalent",
      reason: "The candidate is a semantic rephrasing of an existing durable memory.",
      confidence: 0.88,
      note: mergeNote(target, candidate, concepts)
    };
  }

  const primary = conceptById(concepts[0]);
  return {
    schema_version: "draft-2026-04-08",
    action: "create",
    reason_code: "create_distinct",
    reason: "The candidate expresses a distinct durable engineering preference.",
    confidence: 0.84,
    note: {
      title: primary?.title || candidate.title,
      kind: primary?.kind || candidate.kind,
      one_liner: primary?.one_liner || candidate.one_liner,
      decision: primary?.decision || candidate.decision,
      when_to_load: uniqueStrings([...(primary?.when_to_load || []), ...(candidate.when_to_load || [])]),
      evidence: uniqueStrings(candidate.evidence || [])
    }
  };
}

function governBatch(payload) {
  const existingNotes = (payload.existing_notes || []).map((note) => ({ ...note }));
  const syntheticTargets = [];
  const decisions = (payload.candidates || []).map((candidate, index) => {
    const targetableNotes = existingNotes.concat(syntheticTargets);
    const decision = govern({
      candidate,
      existing_notes: targetableNotes
    });
    const normalizedDecision = { ...decision };
    if (decision.action === "merge_into_existing" && typeof decision.target_note_id === "string") {
      const syntheticMatch = /^candidate:(\d+)$/.exec(decision.target_note_id);
      if (syntheticMatch) {
        delete normalizedDecision.target_note_id;
        normalizedDecision.target_candidate_index = Number(syntheticMatch[1]);
      }
    }
    if (decision.action === "create" || decision.action === "merge_into_existing") {
      syntheticTargets.push({
        id: `candidate:${index}`,
        scope: payload.scope || "project",
        ...decision.note
      });
    }
    return normalizedDecision;
  });
  return {
    schema_version: "draft-2026-04-08",
    decisions
  };
}

function retrieve(payload) {
  const query = normalizeText(payload.query);
  const limit = Number.isFinite(payload.limit) && payload.limit > 0 ? payload.limit : 3;
  const contextText = flattenContextText(payload.context || {});
  const intent = normalizeText(payload?.context?.intent || payload?.context?.caller);
  const semanticQuery = [query, contextText].filter(Boolean).join(" ");
  const queryConcepts = detectConceptIds(semanticQuery);
  const hits = (payload.notes || [])
    .map((note) => {
      const noteConcepts = candidateConcepts(note);
      let score = 0;
      if (queryConcepts.length > 0) {
        score += noteConcepts.filter((concept) => queryConcepts.includes(concept)).length * 40;
      }
      score += lexicalOverlapScore(semanticQuery, note);
      if (score > 0 && note.scope === "project") {
        score += 5;
      }
      if (score > 0 && intent === "task" && ["constraint", "heuristic", "preference"].includes(note.kind)) {
        score += 6;
      }
      if (score > 0 && intent === "vet" && ["anti_pattern", "review_tendency", "constraint"].includes(note.kind)) {
        score += 6;
      }
      if (score > 0 && intent === "task") {
        score += (Number.isInteger(note.decision_gain) ? note.decision_gain : 0) * 3;
        score += (Number.isInteger(note.trigger_clarity) ? note.trigger_clarity : 0) * 2;
      }
      if (score > 0 && intent === "vet") {
        score += (Number.isInteger(note.stability) ? note.stability : 0) * 3;
      }
      return {
        note_id: note.id,
        scope: note.scope,
        score,
        reason: score > 0 ? "The note is semantically relevant to the current query." : ""
      };
    })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || (a.scope === "project" ? -1 : 1) || a.note_id.localeCompare(b.note_id));

  if (hits.length === 0) {
    return {
      schema_version: "draft-2026-04-08",
      query,
      hits: []
    };
  }

  const topScore = hits[0].score;
  const filtered = hits
    .filter((hit) => hit.score >= Math.max(10, topScore - 20))
    .slice(0, limit)
    .map((hit) => ({
      note_id: hit.note_id,
      score: Math.max(1, Math.min(100, hit.score)),
      reason: hit.reason
    }));

  return {
    schema_version: "draft-2026-04-08",
    query,
    hits: filtered
  };
}

export async function runMemorySemanticTask(request) {
  switch (request.operation) {
    case "distill":
      return distill(request.payload || {});
    case "govern":
      return govern(request.payload || {});
    case "govern_batch":
      return governBatch(request.payload || {});
    case "retrieve":
      return retrieve(request.payload || {});
    default:
      throw new Error(`Unsupported test semantic operation: ${request.operation}`);
  }
}

export default runMemorySemanticTask;
