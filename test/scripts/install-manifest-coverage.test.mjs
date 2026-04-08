/**
 * Structural coverage check for install/install-manifest.json.
 *
 * Scans the supported LingXi 2.0 distribution surface and verifies it is listed
 * in manifest.files. This catches repo assets that would otherwise be omitted
 * from the remote installer.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

function loadManifest() {
  const raw = fs.readFileSync(path.join(REPO_ROOT, "install", "install-manifest.json"), "utf8");
  return JSON.parse(raw);
}

function walkFiles(relativeDir) {
  const root = path.join(REPO_ROOT, relativeDir);
  const out = [];
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        out.push(path.relative(REPO_ROOT, full).split(path.sep).join("/"));
      }
    }
  }

  return out.sort();
}

function runtimeScriptFiles() {
  return [
    "scripts/_lingxi-memory.mjs",
    "scripts/_lingxi-memory-semantic.mjs",
    "scripts/lingxi-memory-index.mjs",
    "scripts/lingxi-setup.mjs",
    "scripts/lx-uninstall.mjs"
  ];
}

describe("install-manifest-coverage", () => {
  it("covers all supported Codex-native distribution files", () => {
    const manifest = loadManifest();
    const manifestFiles = new Set(manifest.files || []);
    const repoFiles = [
      ...walkFiles(".codex-plugin"),
      ...walkFiles("skills"),
      ...walkFiles("templates"),
      ...runtimeScriptFiles()
    ].sort();
    const missing = repoFiles.filter((file) => !manifestFiles.has(file));

    assert.deepStrictEqual(missing, [], `Distribution files missing from manifest.files:\n  ${missing.join("\n  ")}`);
  });
});
