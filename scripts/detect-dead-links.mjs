#!/usr/bin/env node
/**
 * 死链检测脚本
 * 检测项目中被引用但实际不存在的文件
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const IGNORE_DIRS = [
  'node_modules',
  '.git',
  '.lingxi/os/sessions',
  '.lingxi/memory/project',
  '.cursor',
  '.claude',
  '.cursor-plugin',
  '.claude-plugin',
  'test/fixtures',
];

const IGNORE_EXTENSIONS = ['.test.mjs', '.default.md', '.default.json'];

function shouldIgnore(filePath) {
  const relativePath = path.relative(ROOT, filePath);
  for (const ignoreDir of IGNORE_DIRS) {
    if (relativePath.startsWith(ignoreDir)) return true;
  }
  for (const ext of IGNORE_EXTENSIONS) {
    if (filePath.endsWith(ext)) return true;
  }
  return false;
}

function getAllFiles(dir, extensions) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (shouldIgnore(fullPath)) continue;

    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, extensions));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (extensions.includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function extractMarkdownLinks(content, filePath) {
  const links = [];
  // Match [text](path) or [text](path "title")
  const regex = /\[([^\]]+)\]\(([^)\s"]+)(?:\s+"[^"]*")?\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const link = match[2];
    // Skip external URLs and anchors
    if (link.startsWith('http') || link.startsWith('mailto:') || link.startsWith('#')) continue;
    links.push({ link, line: content.substring(0, match.index).split('\n').length });
  }
  return links;
}

function extractMjsImports(content, filePath) {
  const imports = [];
  // Match import ... from 'path' or import 'path'
  const regex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const importPath = match[1];
    // Skip external packages (not starting with . or /)
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) continue;
    imports.push({ link: importPath, line: content.substring(0, match.index).split('\n').length });
  }
  return imports;
}

function resolvePath(basePath, link) {
  // Handle various link formats - normalize slashes for cross-platform
  const normalizedLink = link.replace(/\\/g, '/');

  // Check if it's a root-relative path (starts with skill/ or commands/ etc.)
  let resolved;
  if (normalizedLink.startsWith('skills/') || normalizedLink.startsWith('commands/') ||
      normalizedLink.startsWith('agents/') || normalizedLink.startsWith('rules/') ||
      normalizedLink.startsWith('hooks/') || normalizedLink.startsWith('heartbeat-plugins/')) {
    resolved = path.join(ROOT, normalizedLink);
  } else {
    // Relative path from current file
    resolved = path.resolve(path.dirname(basePath), normalizedLink);
  }
  // Try adding extensions
  if (!fs.existsSync(resolved)) {
    const exts = ['.md', '.mjs', '.js', '.json', '/SKILL.md', '/index.mjs', '/index.js'];
    for (const ext of exts) {
      if (fs.existsSync(resolved + ext)) {
        return resolved + ext;
      }
    }
    // Handle directory index
    if (fs.existsSync(path.join(resolved, 'SKILL.md'))) {
      return path.join(resolved, 'SKILL.md');
    }
  }
  return resolved;
}

function checkLink(basePath, link) {
  const resolved = resolvePath(basePath, link);
  const exists = fs.existsSync(resolved);
  return { link, resolved, exists };
}

function main() {
  console.log('🔍 死链检测开始...\n');

  const mdFiles = getAllFiles(ROOT, ['.md']);
  const mjsFiles = getAllFiles(ROOT, ['.mjs']);

  console.log(`📄 扫描文件: ${mdFiles.length} 个 .md, ${mjsFiles.length} 个 .mjs\n`);

  const brokenLinks = [];

  // Check markdown files
  for (const file of mdFiles) {
    if (shouldIgnore(file)) continue;
    const content = fs.readFileSync(file, 'utf-8');
    const links = extractMarkdownLinks(content, file);

    for (const { link, line } of links) {
      const result = checkLink(file, link);
      if (!result.exists) {
        brokenLinks.push({
          file,
          line,
          link,
          type: 'markdown'
        });
      }
    }
  }

  // Check mjs files
  for (const file of mjsFiles) {
    if (shouldIgnore(file)) continue;
    const content = fs.readFileSync(file, 'utf-8');
    const imports = extractMjsImports(content, file);

    for (const { link, line } of imports) {
      const result = checkLink(file, link);
      if (!result.exists) {
        brokenLinks.push({
          file,
          line,
          link,
          type: 'import'
        });
      }
    }
  }

  // Output results
  if (brokenLinks.length === 0) {
    console.log('✅ 未发现死链!');
    return;
  }

  console.log(`⚠️  发现 ${brokenLinks.length} 个死链:\n`);
  console.log('─'.repeat(80));

  for (const { file, line, link, type } of brokenLinks) {
    const relativePath = path.relative(ROOT, file);
    const typeLabel = type === 'markdown' ? '[MD链接]' : '[import]';
    console.log(`${typeLabel} ${relativePath}:${line}`);
    console.log(`   → ${link}`);
    console.log('');
  }

  console.log('─'.repeat(80));
  console.log(`\n📊 总计: ${brokenLinks.length} 个死链`);
}

main();
