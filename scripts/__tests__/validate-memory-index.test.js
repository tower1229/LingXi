/**
 * 单元测试：validate-memory-index.js（Memory-first）
 */

const { generateIndexContent, extractWhenToLoad } = require('../validate-memory-index.js');

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

