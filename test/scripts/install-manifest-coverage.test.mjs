/**
 * Structural coverage check for install/install-manifest.json.
 *
 * Scans well-known convention paths and verifies they are listed in the manifest:
 *   - skills/*\/SKILL.md  → manifest.skills
 *   - agents\/*.md        → manifest.agents.files
 *   - hooks\/*.mjs        → manifest.hooks.files
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

/** Collect all SKILL.md paths as manifest-relative strings, e.g. "skills/foo/SKILL.md" */
function scanSkills() {
  const skillsDir = path.join(REPO_ROOT, "skills");
  return fs
    .readdirSync(skillsDir)
    .filter((name) => {
      const skillFile = path.join(skillsDir, name, "SKILL.md");
      return fs.existsSync(skillFile);
    })
    .map((name) => `skills/${name}/SKILL.md`);
}

/** Collect top-level agent .md files, e.g. "agents/lingxi-foo.md" */
function scanAgents() {
  const agentsDir = path.join(REPO_ROOT, "agents");
  return fs
    .readdirSync(agentsDir)
    .filter((f) => f.endsWith(".md") && fs.statSync(path.join(agentsDir, f)).isFile())
    .map((f) => `agents/${f}`);
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
  it("all SKILL.md files are listed in manifest.skills", () => {
    const manifest = loadManifest();
    const manifestSkills = new Set(manifest.skills || []);
    const repoSkills = scanSkills();
    const missing = repoSkills.filter((s) => !manifestSkills.has(s));
    assert.deepStrictEqual(
      missing,
      [],
      `SKILL.md files not in manifest.skills:\n  ${missing.join("\n  ")}`
    );
  });

  it("all top-level agent .md files are listed in manifest.agents.files", () => {
    const manifest = loadManifest();
    const manifestAgents = new Set(manifest.agents?.files || []);
    const repoAgents = scanAgents();
    const missing = repoAgents.filter((a) => !manifestAgents.has(a));
    assert.deepStrictEqual(
      missing,
      [],
      `Agent .md files not in manifest.agents.files:\n  ${missing.join("\n  ")}`
    );
  });

  it("all hook .mjs files are listed in manifest.hooks.files", () => {
    const manifest = loadManifest();
    const manifestHooks = new Set(manifest.hooks?.files || []);
    const repoHooks = scanHooks();
    const missing = repoHooks.filter((h) => !manifestHooks.has(h));
    assert.deepStrictEqual(
      missing,
      [],
      `Hook .mjs files not in manifest.hooks.files:\n  ${missing.join("\n  ")}`
    );
  });
});
