/**
 * Structural coverage check for install/install-manifest.json.
 *
 * Scans well-known convention paths and verifies they are listed in the manifest:
 *   - .cursor/skills/*\/SKILL.md and .claude/skills/*\/SKILL.md → manifest.cursorFiles / manifest.claudeFiles
 *   - .cursor/agents\/*.md and .claude/agents\/*.md            → manifest.cursorFiles / manifest.claudeFiles
 *   - hooks\/*.mjs                                               → manifest.sharedFiles
 *
 * This catches the reverse of the existence check: files present in repo but
 * missing from the manifest (would not be distributed to users).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
// 文件已迁移到根目录，不再使用 plugin/ 前缀

function loadManifest() {
  const raw = fs.readFileSync(path.join(REPO_ROOT, "install", "install-manifest.json"), "utf8");
  return JSON.parse(raw);
}

/** Collect all SKILL.md paths as manifest-relative strings for one IDE root. */
function scanSkills(ideRoot) {
  const skillsDir = path.join(REPO_ROOT, ideRoot, "skills");
  return fs
    .readdirSync(skillsDir)
    .filter((name) => {
      const skillFile = path.join(skillsDir, name, "SKILL.md");
      return fs.existsSync(skillFile);
    })
    .map((name) => `${ideRoot}/skills/${name}/SKILL.md`);
}

/** Collect top-level agent .md files for one IDE root. */
function scanAgents(ideRoot) {
  const agentsDir = path.join(REPO_ROOT, ideRoot, "agents");
  return fs
    .readdirSync(agentsDir)
    .filter((f) => f.endsWith(".md") && fs.statSync(path.join(agentsDir, f)).isFile())
    .map((f) => `${ideRoot}/agents/${f}`);
}

/** Collect hook .mjs files (top-level only), e.g. "hooks/session-init.mjs" */
function scanHooks() {
  const hooksDir = path.join(REPO_ROOT, "hooks");
  return fs
    .readdirSync(hooksDir)
    .filter((f) => f.endsWith(".mjs") && fs.statSync(path.join(hooksDir, f)).isFile())
    .map((f) => `hooks/${f}`);
}

describe("install-manifest-coverage", () => {
  it("all .cursor SKILL.md files are listed in manifest.cursorFiles", () => {
    const manifest = loadManifest();
    const manifestSkills = new Set(manifest.cursorFiles || []);
    const repoSkills = scanSkills(".cursor");
    const missing = repoSkills.filter((s) => !manifestSkills.has(s));
    assert.deepStrictEqual(
      missing,
      [],
      `.cursor SKILL.md files not in manifest.cursorFiles:\n  ${missing.join("\n  ")}`
    );
  });

  it("all .claude SKILL.md files are listed in manifest.claudeFiles", () => {
    const manifest = loadManifest();
    const manifestSkills = new Set(manifest.claudeFiles || []);
    const repoSkills = scanSkills(".claude");
    const missing = repoSkills.filter((s) => !manifestSkills.has(s));
    assert.deepStrictEqual(
      missing,
      [],
      `.claude SKILL.md files not in manifest.claudeFiles:\n  ${missing.join("\n  ")}`
    );
  });

  it("all .cursor top-level agent .md files are listed in manifest.cursorFiles", () => {
    const manifest = loadManifest();
    const manifestAgents = new Set(manifest.cursorFiles || []);
    const repoAgents = scanAgents(".cursor");
    const missing = repoAgents.filter((a) => !manifestAgents.has(a));
    assert.deepStrictEqual(
      missing,
      [],
      `.cursor Agent .md files not in manifest.cursorFiles:\n  ${missing.join("\n  ")}`
    );
  });

  it("all .claude top-level agent .md files are listed in manifest.claudeFiles", () => {
    const manifest = loadManifest();
    const manifestAgents = new Set(manifest.claudeFiles || []);
    const repoAgents = scanAgents(".claude");
    const missing = repoAgents.filter((a) => !manifestAgents.has(a));
    assert.deepStrictEqual(
      missing,
      [],
      `.claude Agent .md files not in manifest.claudeFiles:\n  ${missing.join("\n  ")}`
    );
  });

  it("all hook .mjs files are listed in manifest.sharedFiles", () => {
    const manifest = loadManifest();
    const manifestHooks = new Set(manifest.sharedFiles || []);
    const repoHooks = scanHooks();
    const missing = repoHooks.filter((h) => !manifestHooks.has(h));
    assert.deepStrictEqual(
      missing,
      [],
      `Hook .mjs files not in manifest.sharedFiles:\n  ${missing.join("\n  ")}`
    );
  });
});
