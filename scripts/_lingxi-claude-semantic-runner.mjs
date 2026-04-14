import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function normalizeText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveMemorySemanticTempRoot() {
  const candidate = normalizeText(process.env.TEST_TMPDIR) || normalizeText(process.env.LINGXI_TMPDIR) || "/tmp";
  const resolved = path.resolve(candidate);
  try {
    fs.mkdirSync(resolved, { recursive: true });
    fs.accessSync(resolved, fs.constants.W_OK);
  } catch (error) {
    throw new Error(`Memory semantic temp dir is not writable: ${resolved} (${error.message})`);
  }
  return resolved;
}

function removeTempDir(dir) {
  if (dir && fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function resolveClaudeBin() {
  return process.env.LINGXI_MEMORY_SEMANTIC_CLAUDE_BIN || "claude";
}

function extractJsonFromOutput(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // Claude CLI may wrap JSON in markdown fences or include preamble text.
    // Try to extract the first JSON object/array from the output.
  }

  const jsonBlockMatch = /```(?:json)?\s*\n([\s\S]*?)\n\s*```/.exec(trimmed);
  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[1].trim());
    } catch {
      // fall through
    }
  }

  const objectMatch = /(\{[\s\S]*\})/.exec(trimmed);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[1]);
    } catch {
      // fall through
    }
  }

  return null;
}

export function runClaudeStructuredOutput(projectRoot, prompt, schema, operation) {
  const promptDir = fs.mkdtempSync(path.join(resolveMemorySemanticTempRoot(), "lingxi-claude-prompt-"));
  const promptFile = path.join(promptDir, "prompt.txt");
  fs.writeFileSync(promptFile, prompt, "utf8");
  try {
    const result = spawnSync(
      resolveClaudeBin(),
      [
        "-p",
        `Read the prompt from ${promptFile} and respond with ONLY valid JSON matching the requested schema. No markdown fences, no explanation, just the JSON object.`,
        "--output-format", "text",
        "--bare"
      ],
      {
        cwd: projectRoot,
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024
      }
    );
    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(
        `claude exec failed for ${operation}: ${normalizeText(result.stderr) || normalizeText(result.stdout) || "unknown error"}`
      );
    }
    const parsed = extractJsonFromOutput(result.stdout);
    if (!parsed) {
      throw new Error(`claude exec returned no parseable JSON for ${operation}.`);
    }
    return parsed;
  } catch (error) {
    if (error.message?.startsWith("Memory semantic engine failed")) throw error;
    throw new Error(`Memory semantic engine failed for ${operation}: ${error.message}`);
  } finally {
    removeTempDir(promptDir);
  }
}

export async function runMemorySemanticTask({ operation, projectRoot, prompt, schema }) {
  return runClaudeStructuredOutput(projectRoot, prompt, schema, operation);
}
