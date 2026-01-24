/**
 * 单元测试：memory-pack 导出/导入
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const { exportPack } = require('../memory-pack/export-pack');
const { importPack } = require('../memory-pack/import-pack');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}`);
    console.error(`  ${e.message}`);
    process.exitCode = 1;
  }
}

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function mkTemp(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function demoNote({ id, audience, portability, strength }) {
  return [
    `# ${id}`,
    '',
    '## Meta',
    '',
    `- **Id**: ${id}`,
    '- **Kind**: principle',
    '- **Status**: active',
    `- **Strength**: ${strength}`,
    '- **Scope**: broad',
    `- **Audience**: ${audience}`,
    `- **Portability**: ${portability}`,
    '- **Source**: manual',
    '- **Tags**: ops,deploy',
    '',
    '## When to load',
    '',
    '- 当需要做决策',
    '',
  ].join('\n');
}

test('export-pack: 只导出 team + cross-project + strength>=validated', () => {
  const projectRoot = mkTemp('lingxi-proj-');
  const packRoot = mkTemp('lingxi-pack-');

  const notesDir = path.join(projectRoot, '.cursor/.lingxi/memory/notes');
  write(path.join(notesDir, 'MEM-team-1.md'), demoNote({ id: 'MEM-team-1', audience: 'team', portability: 'cross-project', strength: 'validated' }));
  write(path.join(notesDir, 'MEM-team-2.md'), demoNote({ id: 'MEM-team-2', audience: 'team', portability: 'cross-project', strength: 'hypothesis' }));
  write(path.join(notesDir, 'MEM-proj-1.md'), demoNote({ id: 'MEM-proj-1', audience: 'project', portability: 'project-only', strength: 'validated' }));

  const result = exportPack({
    projectRoot,
    packRoot,
    audience: 'team',
    portability: 'cross-project',
    minStrength: 'validated',
    tags: [],
    dryRun: false,
  });

  assert(result.selectionCount === 1, `期望导出 1 条，实际 ${result.selectionCount}`);
  assert(fs.existsSync(path.join(packRoot, 'memory/notes/MEM-team-1.md')), 'pack 中缺少 MEM-team-1.md');
  assert(!fs.existsSync(path.join(packRoot, 'memory/notes/MEM-team-2.md')), '不应导出 hypothesis');
  assert(!fs.existsSync(path.join(packRoot, 'memory/notes/MEM-proj-1.md')), '不应导出 project-only');

  // pack index 应生成
  assert(fs.existsSync(path.join(packRoot, 'memory/INDEX.md')), 'pack INDEX.md 未生成');

  fs.rmSync(projectRoot, { recursive: true, force: true });
  fs.rmSync(packRoot, { recursive: true, force: true });
});

test('import-pack: safe 策略遇到同 Id 不覆盖，标记 conflict', () => {
  const projectRoot = mkTemp('lingxi-proj-');
  const packRoot = mkTemp('lingxi-pack-');

  write(
    path.join(packRoot, 'pack.json'),
    JSON.stringify({ name: 'team-pack', version: '1.0.0', updatedAt: new Date().toISOString() }, null, 2) + '\n'
  );
  write(path.join(packRoot, 'memory/notes/MEM-team-1.md'), demoNote({ id: 'MEM-team-1', audience: 'team', portability: 'cross-project', strength: 'enforced' }));

  const projectNotesDir = path.join(projectRoot, '.cursor/.lingxi/memory/notes');
  write(path.join(projectNotesDir, 'MEM-team-1.md'), demoNote({ id: 'MEM-team-1', audience: 'team', portability: 'cross-project', strength: 'validated' }));

  const report = importPack({
    packRoot,
    projectRoot,
    strategy: 'safe',
    apply: false,
    reportPath: null,
  });

  const action = report.actions.find((a) => a.id === 'MEM-team-1');
  assert(action && action.action === 'conflict', `期望 conflict，实际 ${(action && action.action) || 'none'}`);

  fs.rmSync(projectRoot, { recursive: true, force: true });
  fs.rmSync(packRoot, { recursive: true, force: true });
});

test('import-pack: replaceTeam 策略在 team 资产上允许 replace（建议）', () => {
  const projectRoot = mkTemp('lingxi-proj-');
  const packRoot = mkTemp('lingxi-pack-');

  write(
    path.join(packRoot, 'pack.json'),
    JSON.stringify({ name: 'team-pack', version: '1.0.0', updatedAt: new Date().toISOString() }, null, 2) + '\n'
  );
  write(path.join(packRoot, 'memory/notes/MEM-team-1.md'), demoNote({ id: 'MEM-team-1', audience: 'team', portability: 'cross-project', strength: 'enforced' }));

  const projectNotesDir = path.join(projectRoot, '.cursor/.lingxi/memory/notes');
  write(path.join(projectNotesDir, 'MEM-team-1.md'), demoNote({ id: 'MEM-team-1', audience: 'team', portability: 'cross-project', strength: 'validated' }));

  const report = importPack({
    packRoot,
    projectRoot,
    strategy: 'replaceTeam',
    apply: false,
    reportPath: null,
  });

  const action = report.actions.find((a) => a.id === 'MEM-team-1');
  assert(action && action.action === 'replace', `期望 replace，实际 ${(action && action.action) || 'none'}`);

  fs.rmSync(projectRoot, { recursive: true, force: true });
  fs.rmSync(packRoot, { recursive: true, force: true });
});

