/**
 * Install manifest path existence check.
 * Asserts that all static assets listed in install/install-manifest.json exist in the repo.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

describe("install-manifest-exists", () => {
  it("manifest file exists", () => {
    const manifestPath = path.join(REPO_ROOT, "install", "install-manifest.json");
    assert.ok(fs.existsSync(manifestPath), "install/install-manifest.json should exist");
  });

  it("all manifest paths exist in repo", () => {
    const manifestPath = path.join(REPO_ROOT, "install", "install-manifest.json");
    let raw = fs.readFileSync(manifestPath, "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    // Normalize fullwidth punctuation that can break JSON.parse
    raw = raw.replace(/\uFF0C/g, ",").replace(/\uFF3D/g, "]").replace(/\uFF5D/g, "}");
    // Allow trailing commas: remove comma (ASCII or fullwidth) before ] or }
    let prev;
    do {
      prev = raw;
      raw = raw.replace(/[,\uFF0C](\s*[}\]])/g, "$1");
    } while (prev !== raw);
    let manifest;
    try {
      manifest = JSON.parse(raw);
    } catch (err) {
      const pos = parseInt(err.message.match(/position (\d+)/)?.[1], 10) || 0;
      const snippet = raw.slice(Math.max(0, pos - 30), pos + 30);
      throw new Error(`install-manifest.json parse error: ${err.message}. Snippet: ${JSON.stringify(snippet)}`);
    }
    const missing = [];

    (manifest.files || []).forEach((p) => {
      const full = path.join(REPO_ROOT, p);
      if (!fs.existsSync(full)) missing.push(full);
    });

    assert.ok(missing.length === 0, "Missing paths: " + missing.join(", "));
  });
});
