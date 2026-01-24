#!/usr/bin/env node

/**
 * import-pack.js
 *
 * 从 memory-pack 仓库导入团队级记忆到目标项目：
 * - 默认 dry-run：生成导入报告，不写入
 * - --apply：执行写入（新增/按策略覆盖），并更新项目 memory/INDEX.md
 *
 * 用法：
 *   node scripts/memory-pack/import-pack.js --pack <packRepoRoot> [options]
 *
 * 选项：
 *   --project <projectRoot>     (默认当前目录)
 *   --strategy safe|replaceTeam (默认 safe)
 *   --apply                     (默认不写入，仅 dry-run)
 *   --report <path>             (可选：写入 JSON 报告)
 */

const fs = require('fs');
const path = require('path');

const { listMarkdownFiles, readText, writeText, parseNoteMeta, strengthAtLeast, upsertMetaField } = require('./lib');
const { updateIndexAt } = require('../validate-memory-index');

function parseArgs(argv) {
  const args = argv.slice(2);
  const out = {
    pack: null,
    project: process.cwd(),
    strategy: 'safe',
    apply: false,
    report: null,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--pack' && args[i + 1]) out.pack = args[++i];
    else if (a.startsWith('--pack=')) out.pack = a.slice('--pack='.length);
    else if (a === '--project' && args[i + 1]) out.project = args[++i];
    else if (a.startsWith('--project=')) out.project = a.slice('--project='.length);
    else if (a === '--strategy' && args[i + 1]) out.strategy = args[++i];
    else if (a.startsWith('--strategy=')) out.strategy = a.slice('--strategy='.length);
    else if (a === '--apply') out.apply = true;
    else if (a === '--report' && args[i + 1]) out.report = args[++i];
    else if (a.startsWith('--report=')) out.report = a.slice('--report='.length);
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

function rank(strength) {
  if (strength === 'enforced') return 3;
  if (strength === 'validated') return 2;
  return 1;
}

function shouldReplaceByStrategy({ strategy, packMeta, existingMeta, existingContent, sourceValue }) {
  if (strategy !== 'replaceTeam') return { ok: false, reason: 'strategy=safe' };

  const existingAudience = existingMeta.audience || 'project';
  const packAudience = packMeta.audience || 'team';
  if (packAudience !== 'team') return { ok: false, reason: 'pack audience not team' };

  // 仅允许覆盖：1) 目标也是 team，或 2) 目标 Source 已经来自同一个 pack
  const existingSource = existingMeta.source || '';
  const samePack = sourceValue && existingSource === sourceValue;
  if (existingAudience !== 'team' && !samePack) return { ok: false, reason: `existing audience=${existingAudience}` };

  // strength 升级或持平才允许覆盖
  if (rank(packMeta.strength) < rank(existingMeta.strength)) {
    return { ok: false, reason: `pack strength lower (${packMeta.strength} < ${existingMeta.strength})` };
  }

  // 若 existingContent 缺少必要字段，允许覆盖（由 pack 补齐）
  if (!existingMeta.portability || !existingMeta.audience) return { ok: true, reason: 'existing meta incomplete' };

  // 否则：允许覆盖（team 资产以 pack 为准，但仍建议人工 review）
  return { ok: true, reason: 'replaceTeam allowed' };
}

function importPack({ packRoot, projectRoot, strategy, apply, reportPath }) {
  const packInfo = loadPackInfo(packRoot);
  const sourceValue = packInfo?.name && packInfo?.version ? `${packInfo.name}@${packInfo.version}` : '';

  const packNotesDir = path.join(packRoot, 'memory', 'notes');
  const packFiles = listMarkdownFiles(packNotesDir);

  const projectMemoryRoot = path.join(projectRoot, '.cursor/.lingxi/memory');
  const projectNotesDir = path.join(projectMemoryRoot, 'notes');

  const warnings = [];
  const actions = [];

  for (const filePath of packFiles) {
    const md = readText(filePath);
    const fallbackId = path.basename(filePath, '.md');
    const meta = parseNoteMeta(md, fallbackId);

    if (!meta.id) {
      warnings.push(`pack note 缺少 Id，已跳过：${path.basename(filePath)}`);
      continue;
    }

    const destPath = path.join(projectNotesDir, `${meta.id}.md`);
    if (!fs.existsSync(destPath)) {
      actions.push({
        id: meta.id,
        action: 'add',
        reason: 'not exists',
        from: path.join('memory/notes', path.basename(filePath)),
        to: path.join('.cursor/.lingxi/memory/notes', `${meta.id}.md`),
      });
      continue;
    }

    const existingContent = readText(destPath);
    if (existingContent === md) {
      actions.push({ id: meta.id, action: 'skip', reason: 'identical' });
      continue;
    }

    const existingMeta = parseNoteMeta(existingContent, meta.id);
    const replace = shouldReplaceByStrategy({
      strategy,
      packMeta: meta,
      existingMeta,
      existingContent,
      sourceValue,
    });

    if (replace.ok) {
      actions.push({ id: meta.id, action: 'replace', reason: replace.reason });
    } else {
      actions.push({
        id: meta.id,
        action: 'conflict',
        reason: replace.reason,
      });
    }
  }

  const stats = actions.reduce(
    (acc, a) => {
      if (a.action === 'add') acc.added++;
      else if (a.action === 'replace') acc.replaced++;
      else if (a.action === 'conflict') acc.conflicts++;
      else acc.skipped++;
      return acc;
    },
    { added: 0, replaced: 0, conflicts: 0, skipped: 0 }
  );

  const report = {
    packRoot,
    projectRoot,
    apply,
    strategy,
    sourceValue,
    stats,
    warnings,
    actions,
  };

  if (apply) {
    fs.mkdirSync(projectNotesDir, { recursive: true });

    for (const a of actions) {
      if (a.action !== 'add' && a.action !== 'replace') continue;

      const packFile = path.join(packNotesDir, `${a.id}.md`);
      // 导入时以 Id 为主键：pack 端文件名应已标准化为 <Id>.md
      const raw = fs.existsSync(packFile) ? readText(packFile) : readText(path.join(packNotesDir, a.from.split('/').pop()));

      let content = raw;
      if (sourceValue) content = upsertMetaField(content, 'Source', sourceValue);

      writeText(path.join(projectNotesDir, `${a.id}.md`), content);
    }

    updateIndexAt(projectMemoryRoot);
  }

  if (reportPath) {
    writeText(path.resolve(reportPath), `${JSON.stringify(report, null, 2)}\n`);
  }

  return report;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.pack) {
    console.error('缺少 --pack <packRepoRoot>');
    process.exit(1);
  }

  const packRoot = path.resolve(args.pack);
  const projectRoot = path.resolve(args.project);

  const report = importPack({
    packRoot,
    projectRoot,
    strategy: args.strategy,
    apply: args.apply,
    reportPath: args.report,
  });

  console.log(
    `✓ import-pack: added=${report.stats.added}, replaced=${report.stats.replaced}, conflicts=${report.stats.conflicts}, skipped=${report.stats.skipped}, project=${projectRoot}${args.apply ? ' (applied)' : ' (dry-run)'}`
  );
}

if (require.main === module) main();

module.exports = { importPack, parseArgs };

