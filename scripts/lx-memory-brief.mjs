#!/usr/bin/env node

import process from "node:process";
import {
  detectProjectContext,
  formatMemoryRef,
  normalizeText,
  resolveProjectRoot,
  retrieveRelevantMemoryHits
} from "./_lingxi-memory.mjs";

function parseArgs(argv) {
  const args = { projectRoot: null, prompt: "", limit: 3 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--project-root") {
      args.projectRoot = argv[i + 1] || null;
      i += 1;
      continue;
    }
    if (arg === "--prompt") {
      args.prompt = argv[i + 1] || "";
      i += 1;
      continue;
    }
    if (arg === "--limit") {
      args.limit = Number(argv[i + 1] || "3");
      i += 1;
    }
  }
  return args;
}

async function readStdinText() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function lexicalTokenCount(text) {
  return normalizeText(text)
    .split(/[^a-z0-9\u4e00-\u9fff]+/iu)
    .filter(Boolean)
    .length;
}

function inferRequestKind(prompt) {
  const normalized = normalizeText(prompt).toLowerCase();
  if (/(review|vet|审查|评审)/i.test(normalized)) return "review";
  if (/(debug|trace|报错|错误|异常|故障|排查)/i.test(normalized)) return "debug";
  if (/(docs|documentation|文档|readme|guide|onboarding)/i.test(normalized)) return "docs";
  if (/(design|architecture|方案|架构|tradeoff|取舍)/i.test(normalized)) return "design";
  if (/(implement|build|fix|refactor|change|实现|修复|改造|重构|开发)/i.test(normalized)) return "implementation";
  return "general_repo_work";
}

function isMeaningfulRepoTurn(prompt) {
  const normalized = normalizeText(prompt);
  if (!normalized) {
    return { meaningful: false, reason: "empty_prompt" };
  }

  if (/^(hi|hello|hey|thanks|thank you|ok|okay|好的|谢谢|收到|继续|继续吧|在吗|辛苦了)[.!?。！？]*$/i.test(normalized)) {
    return { meaningful: false, reason: "trivial_conversation" };
  }

  if (
    /(`[^`]+`|\/[A-Za-z0-9._/-]+|[A-Za-z0-9._-]+\.(js|ts|tsx|jsx|mjs|json|md|py|go|rs|java|toml|yaml|yml)|task|vet|memory|bug|fix|feature|test|refactor|api|docs|build|debug|review|implement|repository|repo|project|module|function|class|frontend|backend|sdk|contract|rollback|schema|文档|任务|实现|接口|测试|重构|调试|代码|仓库|模块|前端|后端|契约|回滚)/i.test(normalized)
  ) {
    return { meaningful: true, reason: "repo_or_engineering_signal" };
  }

  if (lexicalTokenCount(normalized) >= 8 || /[?？]$/.test(normalized)) {
    return { meaningful: true, reason: "non_trivial_request" };
  }

  return { meaningful: false, reason: "likely_non_repo_turn" };
}

function buildActiveMemoryBrief(hits) {
  if (!Array.isArray(hits) || hits.length === 0) return "";
  return [
    "Active LingXi Memory:",
    ...hits.map((note) => `- ${formatMemoryRef(note)}`)
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const stdinPrompt = await readStdinText();
  const prompt = normalizeText(args.prompt || stdinPrompt);
  const projectRoot = resolveProjectRoot(args.projectRoot);
  const limit = Number.isFinite(args.limit) && args.limit > 0 ? args.limit : 3;
  const applicability = isMeaningfulRepoTurn(prompt);
  const projectContext = detectProjectContext(projectRoot);
  const requestKind = inferRequestKind(prompt);

  if (!applicability.meaningful) {
    process.stdout.write(JSON.stringify({
      operation: "skipped_not_meaningful",
      prompt,
      skip_reason: applicability.reason,
      request_kind: requestKind,
      project_context: projectContext,
      hit_count: 0,
      hits: [],
      active_memory_brief: ""
    }, null, 2) + "\n");
    return;
  }

  const hits = await retrieveRelevantMemoryHits(projectRoot, prompt, limit, {
    caller: "memory-brief",
    interaction_mode: "conversation",
    request_kind: requestKind,
    project_context: projectContext,
    raw_prompt: prompt
  });

  const resultHits = hits.map((note) => ({
    note_id: note.id,
    title: note.title,
    kind: note.kind,
    scope: note.scope,
    score: note.score,
    when_to_load: note.when_to_load,
    one_liner: note.one_liner,
    file: note.file,
    memory_ref: formatMemoryRef(note)
  }));

  process.stdout.write(JSON.stringify({
    operation: resultHits.length > 0 ? "applied_memory" : "no_relevant_memory",
    prompt,
    request_kind: requestKind,
    project_context: projectContext,
    hit_count: resultHits.length,
    hits: resultHits,
    active_memory_brief: buildActiveMemoryBrief(hits)
  }, null, 2) + "\n");
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
