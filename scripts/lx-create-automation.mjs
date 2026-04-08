#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const projectRoot = path.resolve(process.env.CODEX_PROJECT_DIR || process.cwd());
const codexHome = path.resolve(process.env.CODEX_HOME || path.join(os.homedir(), ".codex"));
const artifactPath = path.join(projectRoot, ".lingxi", "setup", "automation.session-distill.toml");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readTomlString(content, key) {
  const pattern = new RegExp(`^${escapeRegExp(key)}\\s*=\\s*"((?:\\\\.|[^"\\\\])*)"\\s*$`, "m");
  const match = content.match(pattern);
  if (!match) {
    throw new Error(`Missing string field: ${key}`);
  }
  return JSON.parse(`"${match[1]}"`);
}

function readTomlStringArray(content, key) {
  const pattern = new RegExp(`^${escapeRegExp(key)}\\s*=\\s*\\[(.*)\\]\\s*$`, "m");
  const match = content.match(pattern);
  if (!match) {
    throw new Error(`Missing string array field: ${key}`);
  }
  return JSON.parse(`[${match[1]}]`);
}

function readTomlInteger(content, key) {
  const pattern = new RegExp(`^${escapeRegExp(key)}\\s*=\\s*(\\d+)\\s*$`, "m");
  const match = content.match(pattern);
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1], 10);
}

function readAutomationArtifact() {
  if (!fs.existsSync(artifactPath)) {
    console.error("[lx-create-automation] 未找到 .lingxi/setup/automation.session-distill.toml。请先运行 node scripts/lingxi-setup.mjs。");
    process.exit(1);
  }

  const content = fs.readFileSync(artifactPath, "utf8");
  try {
    return {
      name: readTomlString(content, "name"),
      prompt: readTomlString(content, "prompt"),
      status: readTomlString(content, "status"),
      rrule: readTomlString(content, "rrule"),
      cwds: readTomlStringArray(content, "cwds")
    };
  } catch (error) {
    console.error("[lx-create-automation] 自动化配置解析失败:", error.message);
    process.exit(1);
  }
}

function readExistingAutomation(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, "utf8");
  return {
    createdAt: readTomlInteger(content, "created_at"),
    status: readTomlString(content, "status")
  };
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "project";
}

function automationIdFor(projectDir) {
  const hash = crypto.createHash("sha256").update(projectDir).digest("hex").slice(0, 8);
  return `lingxi-session-distill-${slugify(path.basename(projectDir))}-${hash}`;
}

function escapeTomlString(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/"/g, "\\\"");
}

function formatStringArray(values) {
  return `[${values.map((value) => `"${escapeTomlString(value)}"`).join(", ")}]`;
}

function normalizeRRule(value) {
  return value.startsWith("RRULE:") ? value : `RRULE:${value}`;
}

function main() {
  const artifact = readAutomationArtifact();
  const automationId = automationIdFor(projectRoot);
  const automationDir = path.join(codexHome, "automations", automationId);
  const automationPath = path.join(automationDir, "automation.toml");
  fs.mkdirSync(automationDir, { recursive: true });

  const existing = readExistingAutomation(automationPath);
  const now = Date.now();
  const createdAt = existing?.createdAt ?? now;
  const status = existing?.status || artifact.status;

  const automationToml = [
    "version = 1",
    `id = "${escapeTomlString(automationId)}"`,
    `name = "${escapeTomlString(artifact.name)}"`,
    `prompt = "${escapeTomlString(artifact.prompt)}"`,
    `status = "${escapeTomlString(status)}"`,
    `rrule = "${escapeTomlString(normalizeRRule(artifact.rrule))}"`,
    'execution_environment = "worktree"',
    `cwds = ${formatStringArray(artifact.cwds)}`,
    `created_at = ${createdAt}`,
    `updated_at = ${now}`
  ].join("\n") + "\n";

  fs.writeFileSync(automationPath, automationToml, "utf8");

  process.stdout.write(JSON.stringify({
    automation_id: automationId,
    automation_path: automationPath,
    codex_home: codexHome,
    created: existing == null,
    source_artifact: artifactPath
  }, null, 2) + "\n");
}

main();
