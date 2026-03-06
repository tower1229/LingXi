/**
 * Install manifest path existence check.
 * Asserts that all paths listed in install/install-manifest.json exist in the repo
 * (supports TC-001 / TC-004: manifest is self-consistent).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

function resolveManifestPath(manifestPath) {
  if (manifestPath.startsWith(".cursor/")) return path.join(REPO_ROOT, manifestPath);
  if (manifestPath.startsWith("scripts/")) return path.join(REPO_ROOT, manifestPath);
  return path.join(REPO_ROOT, ".cursor", manifestPath);
}

describe("install-manifest-exists", () => {
  it("manifest file exists", () => {
    const manifestPath = path.join(REPO_ROOT, "install", "install-manifest.json");
    assert.ok(fs.existsSync(manifestPath), "install/install-manifest.json should exist");
  });

  it("all manifest paths exist in repo", () => {
    const manifestPath = path.join(REPO_ROOT, "install", "install-manifest.json");
    let raw = fs.readFileSync(manifestPath, "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    let manifest;
    try {
      manifest = JSON.parse(raw);
    } catch (err) {
      const pos = parseInt(err.message.match(/position (\d+)/)?.[1], 10) || 0;
      const snippet = raw.slice(Math.max(0, pos - 30), pos + 30);
      throw new Error(`install-manifest.json parse error: ${err.message}. Snippet: ${JSON.stringify(snippet)}`);
    }
    const missing = [];

    (manifest.commands || []).forEach((p) => {
      const full = resolveManifestPath(".cursor/" + p);
      if (!fs.existsSync(full)) missing.push(full);
    });
    (manifest.rules || []).forEach((p) => {
      const full = resolveManifestPath(".cursor/" + p);
      if (!fs.existsSync(full)) missing.push(full);
    });
    (manifest.hooks?.files || []).forEach((p) => {
      const full = resolveManifestPath(".cursor/" + p);
      if (!fs.existsSync(full)) missing.push(full);
    });
    (manifest.skills || []).forEach((p) => {
      const full = resolveManifestPath(".cursor/" + p);
      if (!fs.existsSync(full)) missing.push(full);
    });
    (manifest.agents?.files || []).forEach((p) => {
      const full = resolveManifestPath(".cursor/" + p);
      if (!fs.existsSync(full)) missing.push(full);
    });
    const refs = manifest.references || {};
    for (const key of Object.keys(refs)) {
      (refs[key] || []).forEach((p) => {
        const full = resolveManifestPath(".cursor/" + p);
        if (!fs.existsSync(full)) missing.push(full);
      });
    }
    (manifest.scripts || []).forEach((p) => {
      const full = path.join(REPO_ROOT, "scripts", p);
      if (!fs.existsSync(full)) missing.push(full);
    });

    assert.ok(missing.length === 0, "Missing paths: " + missing.join(", "));
  });
});
