/**
 * 单元测试：validate-memory-index.js（Memory-first）
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const { generateIndexContent, extractWhenToLoad, updateIndexAt, checkIndexAt } = require('../validate-memory-index.js');

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

test('INDEX: 生成表头与行字段顺序正确', () => {
  const notes = [
    {
      id: 'MEM-demo',
      kind: 'principle',
      title: 'Demo',
      whenToLoad: '当需要做决策',
      status: 'active',
      strength: 'validated',
      scope: 'broad',
      supersedes: '',
      file: '`memory/notes/MEM-demo.md`',
    },
  ];

  const existing = { header: null, rows: [] };
  const content = generateIndexContent(notes, existing);

  const expectedRow =
    '| MEM-demo | principle | Demo | 当需要做决策 | active | validated | broad |  | `memory/notes/MEM-demo.md` |';

  assert(content.includes('| Id | Kind | Title | When to load | Status | Strength | Scope | Supersedes | File |'), '缺少表头');
  assert(content.includes(expectedRow), `索引行不匹配。\n期望：${expectedRow}\n实际：\n${content}`);
});

test('WhenToLoad: 支持列表写法提取', () => {
  const lines = [
    '# Title',
    '',
    '## When to load',
    '',
    '- 设计 workflow 功能时',
    '- 需要处理自然语言输入时',
    '',
    '## One-liner (for injection)',
    'x',
  ];

  const extracted = extractWhenToLoad(lines);
  assert(
    extracted.includes('设计 workflow 功能时') && extracted.includes('需要处理自然语言输入时'),
    `WhenToLoad 提取失败：${extracted}`
  );
});

test('Root: 支持自定义 memory root 更新与检查', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lingxi-memory-root-'));
  const memoryRoot = path.join(tmp, 'memory');
  const notesDir = path.join(memoryRoot, 'notes');
  fs.mkdirSync(notesDir, { recursive: true });

  fs.writeFileSync(
    path.join(notesDir, 'MEM-demo.md'),
    [
      '# Demo',
      '',
      '## Meta',
      '',
      '- **Id**: MEM-demo',
      '- **Kind**: principle',
      '- **Status**: active',
      '- **Strength**: validated',
      '- **Scope**: broad',
      '',
      '## When to load',
      '',
      '- 当需要做决策',
      '',
    ].join('\n'),
    'utf8'
  );

  // 1) update: 生成 INDEX
  updateIndexAt(memoryRoot);
  const indexPath = path.join(memoryRoot, 'INDEX.md');
  assert(fs.existsSync(indexPath), 'INDEX.md 未生成');

  const content = fs.readFileSync(indexPath, 'utf8');
  assert(content.includes('| MEM-demo |'), 'INDEX.md 未包含 MEM-demo');
  assert(content.includes('`memory/notes/MEM-demo.md`'), 'INDEX.md File 字段不正确');

  // 2) check: 不应报错退出（这里通过函数调用覆盖检查逻辑）
  checkIndexAt(memoryRoot);

  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Recursive + Dedup: 扫描子目录并按 project-over-share 选择 winner', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lingxi-memory-recursive-'));
  const memoryRoot = path.join(tmp, 'memory');
  const notesDir = path.join(memoryRoot, 'notes');

  // project 顶层
  fs.mkdirSync(notesDir, { recursive: true });
  fs.writeFileSync(
    path.join(notesDir, 'MEM-dup.md'),
    [
      '# ProjectVersion',
      '',
      '## Meta',
      '',
      '- **Id**: MEM-dup',
      '- **Kind**: principle',
      '- **Status**: active',
      '- **Strength**: validated',
      '- **Scope**: broad',
      '',
    ].join('\n'),
    'utf8'
  );

  // share 子目录（重复 id）
  const shareDir = path.join(notesDir, 'share', 'team');
  fs.mkdirSync(shareDir, { recursive: true });
  fs.writeFileSync(
    path.join(shareDir, 'MEM-dup.md'),
    [
      '# ShareVersion',
      '',
      '## Meta',
      '',
      '- **Id**: MEM-dup',
      '- **Kind**: principle',
      '- **Status**: active',
      '- **Strength**: enforced',
      '- **Scope**: broad',
      '',
    ].join('\n'),
    'utf8'
  );

  updateIndexAt(memoryRoot);
  const indexPath = path.join(memoryRoot, 'INDEX.md');
  const content = fs.readFileSync(indexPath, 'utf8');

  // winner 应为顶层的 `memory/notes/MEM-dup.md`
  assert(content.includes('`memory/notes/MEM-dup.md`'), '未选择 project 顶层作为 winner');
  assert(!content.includes('`memory/notes/share/team/MEM-dup.md`'), '不应把 share 版本写进 INDEX（被 project 覆盖）');

  fs.rmSync(tmp, { recursive: true, force: true });
});

