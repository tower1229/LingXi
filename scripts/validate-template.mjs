#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const errors = [];
const warnings = [];

const pluginNamePattern = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const marketplaceNamePattern = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function addError(message) {
  errors.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDirectory(targetPath, context) {
  try {
    const stat = await fs.stat(targetPath);
    if (!stat.isDirectory()) {
      addError(`${context} exists but is not a directory: ${targetPath}`);
      return false;
    }
    return true;
  } catch {
    addError(`${context} directory is missing: ${targetPath}`);
    return false;
  }
}

async function readJsonFile(filePath, context) {
  let raw;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    addError(`${context} is missing: ${filePath}`);
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    addError(`${context} contains invalid JSON (${filePath}): ${error.message}`);
    return null;
  }
}

function normalizeNewlines(content) {
  return content.replace(/\r\n/g, "\n");
}

function parseFrontmatter(content) {
  const normalized = normalizeNewlines(content);
  if (!normalized.startsWith("---\n")) {
    return null;
  }

  const closingIndex = normalized.indexOf("\n---\n", 4);
  if (closingIndex === -1) {
    return null;
  }

  const frontmatterBlock = normalized.slice(4, closingIndex);
  const fields = {};

  for (const line of frontmatterBlock.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    fields[key] = value;
  }

  return fields;
}

async function walkFiles(dirPath) {
  const files = [];
  const stack = [dirPath];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  }

  return files;
}

function isSafeRelativePath(value) {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return true;
  }
  if (path.isAbsolute(value)) {
    return false;
  }
  const normalized = path.posix.normalize(value.replace(/\\/g, "/"));
  return !normalized.startsWith("../") && normalized !== "..";
}

function extractPathValues(value) {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => extractPathValues(entry));
  }

  if (value && typeof value === "object") {
    const candidates = [];
    if (typeof value.path === "string") {
      candidates.push(value.path);
    }
    if (typeof value.file === "string") {
      candidates.push(value.file);
    }
    return candidates;
  }

  return [];
}

/** Resolve first directory path from plugin manifest for a given field (commands, skills, agents, rules). */
function getManifestDirPath(manifest, field) {
  if (!manifest || manifest[field] == null) return null;
  const values = extractPathValues(manifest[field]);
  return values.length > 0 ? values[0] : null;
}

async function validateReferencedPath(pluginDir, fieldName, pathValue, pluginName) {
  if (pathValue.startsWith("http://") || pathValue.startsWith("https://")) {
    return;
  }

  if (!isSafeRelativePath(pathValue)) {
    addError(
      `${pluginName}: field "${fieldName}" has invalid path "${pathValue}". Use a relative path without ".." or absolute prefixes.`
    );
    return;
  }

  const resolved = path.resolve(pluginDir, pathValue);
  const exists = await pathExists(resolved);
  if (!exists) {
    addError(`${pluginName}: field "${fieldName}" references missing path "${pathValue}".`);
  }
}

async function validateFrontmatterFile(filePath, componentName, requiredKeys, pluginName) {
  const content = await fs.readFile(filePath, "utf8");
  const parsed = parseFrontmatter(content);
  const relativeFile = path.relative(repoRoot, filePath);

  if (!parsed) {
    addError(`${pluginName}: ${componentName} file missing YAML frontmatter: ${relativeFile}`);
    return;
  }

  for (const key of requiredKeys) {
    if (!parsed[key] || parsed[key].length === 0) {
      addError(`${pluginName}: ${componentName} file missing "${key}" in frontmatter: ${relativeFile}`);
    }
  }
}

async function validateComponentFrontmatter(pluginDir, pluginName, pluginManifest) {
  const dir = (field, defaultSubdir) => {
    const manifestPath = pluginManifest ? getManifestDirPath(pluginManifest, field) : null;
    return manifestPath ? path.join(pluginDir, manifestPath) : path.join(pluginDir, defaultSubdir);
  };

  const rulesDir = dir("rules", "rules");
  if (await pathExists(rulesDir)) {
    const files = await walkFiles(rulesDir);
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ext === ".md" || ext === ".mdc" || ext === ".markdown") {
        await validateFrontmatterFile(file, "rule", ["description"], pluginName);
      }
    }
  }

  const skillsDir = dir("skills", "skills");
  if (await pathExists(skillsDir)) {
    const files = await walkFiles(skillsDir);
    for (const file of files) {
      if (path.basename(file) === "SKILL.md") {
        await validateFrontmatterFile(file, "skill", ["name", "description"], pluginName);
      }
    }
  }

  const agentsDir = dir("agents", "agents");
  if (await pathExists(agentsDir)) {
    const files = await walkFiles(agentsDir);
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ext === ".md" || ext === ".mdc" || ext === ".markdown") {
        await validateFrontmatterFile(file, "agent", ["name", "description"], pluginName);
      }
    }
  }

  const commandsDir = dir("commands", "commands");
  if (await pathExists(commandsDir)) {
    const files = await walkFiles(commandsDir);
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ext === ".md" || ext === ".mdc" || ext === ".markdown" || ext === ".txt") {
        await validateFrontmatterFile(file, "command", ["name", "description"], pluginName);
      }
    }
  }
}

function resolveMarketplaceSource(source, pluginRoot) {
  if (typeof source !== "string" || source.length === 0) {
    return null;
  }
  if (!pluginRoot) {
    return source;
  }
  const normalizedRoot = pluginRoot.replace(/\\/g, "/").replace(/\/+$/, "");
  const normalizedSource = source.replace(/\\/g, "/");
  if (normalizedSource === normalizedRoot || normalizedSource.startsWith(`${normalizedRoot}/`)) {
    return normalizedSource;
  }
  return `${normalizedRoot}/${normalizedSource}`;
}

function getMarketplaceSourcePath(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  if (typeof entry.source === "string") {
    return entry.source;
  }

  if (entry.source && typeof entry.source === "object" && typeof entry.source.path === "string") {
    return entry.source.path;
  }

  return null;
}

function collectManifestPathFields(pluginManifest) {
  const values = [];
  const topLevelFields = ["logo", "rules", "skills", "agents", "commands", "hooks", "mcpServers", "apps"];
  for (const field of topLevelFields) {
    values.push([field, ...extractPathValues(pluginManifest[field])]);
  }

  const interfaceFields = pluginManifest?.interface ?? {};
  values.push(["interface.composerIcon", ...extractPathValues(interfaceFields.composerIcon)]);
  values.push(["interface.logo", ...extractPathValues(interfaceFields.logo)]);
  values.push(["interface.screenshots", ...extractPathValues(interfaceFields.screenshots)]);

  return values.filter(([, ...paths]) => paths.length > 0);
}

async function validateSinglePluginManifest() {
  const manifestPath = path.join(repoRoot, ".codex-plugin", "plugin.json");
  const pluginManifest = await readJsonFile(manifestPath, "Plugin manifest");
  if (!pluginManifest) {
    return;
  }

  const pluginName = typeof pluginManifest.name === "string" ? pluginManifest.name : "plugin";

  if (typeof pluginManifest.name !== "string" || !pluginNamePattern.test(pluginManifest.name)) {
    addError('"name" in plugin.json must be lowercase and use only alphanumerics, hyphens, and periods.');
  }

  for (const [field, ...values] of collectManifestPathFields(pluginManifest)) {
    for (const value of values) {
      await validateReferencedPath(repoRoot, field, value, pluginName);
    }
  }

  await validateComponentFrontmatter(repoRoot, pluginName, pluginManifest);
}

async function main() {
  const marketplacePath = path.join(repoRoot, ".agents", "plugins", "marketplace.json");
  const hasMarketplaceManifest = await pathExists(marketplacePath);

  if (!hasMarketplaceManifest) {
    addWarning(
      'Marketplace manifest not found at ".agents/plugins/marketplace.json". Falling back to ".codex-plugin/plugin.json" validation.'
    );
    await validateSinglePluginManifest();
    summarizeAndExit();
    return;
  }

  const marketplace = await readJsonFile(marketplacePath, "Marketplace manifest");
  if (!marketplace) {
    summarizeAndExit();
    return;
  }

  if (typeof marketplace.name !== "string" || !marketplaceNamePattern.test(marketplace.name)) {
    addError(
      'Marketplace "name" must be lowercase kebab-case and start/end with an alphanumeric character.'
    );
  }

  if (
    marketplace.interface !== undefined &&
    (
      !marketplace.interface ||
      typeof marketplace.interface !== "object" ||
      (
        marketplace.interface.displayName !== undefined &&
        typeof marketplace.interface.displayName !== "string"
      )
    )
  ) {
    addError('Marketplace "interface.displayName" must be a string when provided.');
  }

  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
    addError('Marketplace "plugins" must be a non-empty array.');
    summarizeAndExit();
    return;
  }

  const seenNames = new Set();
  for (const [index, entry] of marketplace.plugins.entries()) {
    const label = `plugins[${index}]`;

    if (!entry || typeof entry !== "object") {
      addError(`${label} must be an object.`);
      continue;
    }

    if (typeof entry.name !== "string" || !pluginNamePattern.test(entry.name)) {
      addError(`${label}.name must be lowercase and use only alphanumerics, hyphens, and periods.`);
      continue;
    }

    if (seenNames.has(entry.name)) {
      addError(`Duplicate plugin name in marketplace manifest: "${entry.name}"`);
    }
    seenNames.add(entry.name);

    if (!entry.source || typeof entry.source !== "object") {
      addError(`${label}.source must be an object with "source" and "path".`);
      continue;
    }

    if (entry.source.source !== "local") {
      addError(`${label}.source.source must be "local".`);
      continue;
    }

    const sourcePath = resolveMarketplaceSource(getMarketplaceSourcePath(entry), "");
    if (!sourcePath) {
      addError(`${label}.source.path must be a string path.`);
      continue;
    }
    if (!isSafeRelativePath(sourcePath)) {
      addError(`${label}.source.path is not a safe relative path: "${sourcePath}"`);
      continue;
    }

    const pluginDir = path.join(repoRoot, sourcePath);
    const pluginDirExists = await ensureDirectory(pluginDir, `${label}.source`);
    if (!pluginDirExists) {
      continue;
    }

    const manifestPath = path.join(pluginDir, ".codex-plugin", "plugin.json");
    const pluginManifest = await readJsonFile(manifestPath, `${entry.name} plugin manifest`);
    if (!pluginManifest) {
      continue;
    }

    if (typeof pluginManifest.name !== "string" || !pluginNamePattern.test(pluginManifest.name)) {
      addError(
        `${entry.name}: "name" in plugin.json must be lowercase and use only alphanumerics, hyphens, and periods.`
      );
    }

    if (pluginManifest.name && pluginManifest.name !== entry.name) {
      addError(
        `${entry.name}: marketplace entry name does not match plugin.json name ("${pluginManifest.name}").`
      );
    }

    if (!entry.policy || typeof entry.policy !== "object") {
      addError(`${label}.policy must be an object.`);
    } else {
      const allowedInstallations = new Set(["NOT_AVAILABLE", "AVAILABLE", "INSTALLED_BY_DEFAULT"]);
      const allowedAuthentication = new Set(["ON_INSTALL", "ON_USE"]);
      if (!allowedInstallations.has(entry.policy.installation)) {
        addError(
          `${label}.policy.installation must be one of NOT_AVAILABLE, AVAILABLE, or INSTALLED_BY_DEFAULT.`
        );
      }
      if (!allowedAuthentication.has(entry.policy.authentication)) {
        addError(`${label}.policy.authentication must be either ON_INSTALL or ON_USE.`);
      }
    }

    if (typeof entry.category !== "string" || entry.category.length === 0) {
      addError(`${label}.category must be a non-empty string.`);
    }

    for (const [field, ...values] of collectManifestPathFields(pluginManifest)) {
      for (const value of values) {
        await validateReferencedPath(pluginDir, field, value, entry.name);
      }
    }

    await validateComponentFrontmatter(pluginDir, entry.name, pluginManifest);
  }

  summarizeAndExit();
}

function summarizeAndExit() {
  if (warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
    console.log("");
  }

  if (errors.length > 0) {
    console.error("Validation failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("Validation passed.");
}

await main();
