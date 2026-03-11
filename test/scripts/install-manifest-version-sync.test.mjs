/**
 * Version sync check: package.json and install/install-manifest.json must have the same version.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

describe("install-manifest-version-sync", () => {
  it("install-manifest.json version matches package.json version", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));
    const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "install", "install-manifest.json"), "utf8"));
    assert.strictEqual(
      manifest.version,
      pkg.version,
      `install-manifest.json version (${manifest.version}) must match package.json version (${pkg.version})`
    );
  });
});
