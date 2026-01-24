#!/usr/bin/env node

/**
 * export-pack.js
 *
 * 从当前项目的 `.cursor/.lingxi/memory/notes/` 中筛选“团队级可跨项目复用”的记忆，
 * 导出到独立 memory-pack 仓库目录，并在 pack 内生成/更新 `memory/INDEX.md`。
 *
 * 用法：
 *   node scripts/memory-pack/export-pack.js --pack <packRepoRoot> [options]
 *
 * 选项：
 *   --audience team|project|personal          (默认 team)
 *   --portability cross-project|project-only (默认 cross-project)
 *   --min-strength hypothesis|validated|enforced (默认 validated)
 *   --tags tag1,tag2                         (可选：匹配任意 tag)
 *   --dry-run                                (只输出计划，不写文件)
 */

const fs = require('fs');
const path = require('path');

const { listMarkdownFiles, readText, writeText, parseNoteMeta, strengthAtLeast } = require('./lib');
const { updateIndexAt } = require('../validate-memory-index');

function parseArgs(argv) {
  const args = argv.slice(2);
  const out = {
    pack: null,
    audience: 'team',
    portability: 'cross-project',
    minStrength: 'validated',
    tags: [],
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--pack' && args[i + 1]) out.pack = args[++i];
    else if (a.startsWith('--pack=')) out.pack = a.slice('--pack='.length);
    else if (a === '--audience' && args[i + 1]) out.audience = args[++i];
    else if (a.startsWith('--audience=')) out.audience = a.slice('--audience='.length);
    else if (a === '--portability' && args[i + 1]) out.portability = args[++i];
    else if (a.startsWith('--portability=')) out.portability = a.slice('--portability='.length);
    else if (a === '--min-strength' && args[i + 1]) out.minStrength = args[++i];
    else if (a.startsWith('--min-strength=')) out.minStrength = a.slice('--min-strength='.length);
    else if (a === '--tags' && args[i + 1]) out.tags = args[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a.startsWith('--tags=')) out.tags = a.slice('--tags='.length).split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--dry-run') out.dryRun = true;
  }

  return out;
}

function loadPackInfo(packRoot) {
  const packJsonPath = path.join(packRoot, 'pack.json');
  if (!fs.existsSync(packJsonPath)) return null;
  try {
    return JSON.parse(readText(packJsonPath));
  } catch {
    return null;
  }
}

function ensurePackJson(packRoot, selectionRules) {
  const packJsonPath = path.join(packRoot, 'pack.json');
  if (fs.existsSync(packJsonPath)) return;

  const name = path.basename(path.resolve(packRoot));
  const content = {
    name,
    version: '0.1.0',
    updatedAt: new Date().toISOString(),
    selectionRules,
  };
  writeText(packJsonPath, `${JSON.stringify(content, null, 2)}\n`);
}

function exportPack({
  projectRoot,
  packRoot,
  audience,
  portability,
  minStrength,
  tags,
  dryRun,
}) {
  const projectMemoryNotes = path.join(projectRoot, '.cursor/.lingxi/memory/notes');
  const srcFiles = listMarkdownFiles(projectMemoryNotes);

  const selection = [];
  const warnings = [];

  for (const filePath of srcFiles) {
    const md = readText(filePath);
    const fallbackId = path.basename(filePath, '.md');
    const meta = parseNoteMeta(md, fallbackId);

    if ((meta.status || 'active') !== 'active') continue;
    if (audience && (meta.audience || '') !== audience) continue;
    if (portability && (meta.portability || '') !== portability) continue;
    if (!strengthAtLeast(meta.strength, minStrength)) continue;

    if (tags && tags.length > 0) {
      const set = new Set(meta.tags || []);
      const ok = tags.some((t) => set.has(t));
      if (!ok) continue;
    }

    if (!meta.id) {
      warnings.push(`缺少 Id: ${path.basename(filePath)}`);
      continue;
    }

    selection.push({
      id: meta.id,
      srcPath: filePath,
      content: md,
      meta,
    });
  }

  const packMemoryRoot = path.join(packRoot, 'memory');
  const packNotesDir = path.join(packMemoryRoot, 'notes');

  const actions = selection.map((s) => ({
    id: s.id,
    from: path.relative(projectRoot, s.srcPath),
    to: path.join('memory/notes', `${s.id}.md`),
  }));

  if (dryRun) {
    return { selectionCount: selection.length, warnings, actions, packMemoryRoot };
  }

  ensurePackJson(packRoot, { audience, portability, minStrength, tags });
  fs.mkdirSync(packNotesDir, { recursive: true });

  for (const s of selection) {
    const dest = path.join(packNotesDir, `${s.id}.md`);
    writeText(dest, s.content);
  }

  updateIndexAt(packMemoryRoot);

  const packInfo = loadPackInfo(packRoot);
  if (packInfo) {
    packInfo.updatedAt = new Date().toISOString();
    packInfo.selectionRules = { audience, portability, minStrength, tags };
    writeText(path.join(packRoot, 'pack.json'), `${JSON.stringify(packInfo, null, 2)}\n`);
  }

  return { selectionCount: selection.length, warnings, actions, packMemoryRoot };
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.pack) {
    console.error('缺少 --pack <packRepoRoot>');
    process.exit(1);
  }

  const projectRoot = process.cwd();
  const packRoot = path.resolve(args.pack);

  const result = exportPack({
    projectRoot,
    packRoot,
    audience: args.audience,
    portability: args.portability,
    minStrength: args.minStrength,
    tags: args.tags,
    dryRun: args.dryRun,
  });

  // 输出简洁摘要（脚本用途：CI/自动化）
  if (result.warnings.length) {
    for (const w of result.warnings) console.warn(`⚠ ${w}`);
  }
  console.log(
    `✓ export-pack: selected=${result.selectionCount}, pack=${packRoot}, memoryRoot=${result.packMemoryRoot}${args.dryRun ? ' (dry-run)' : ''}`
  );
}

if (require.main === module) main();

module.exports = { exportPack, parseArgs };

