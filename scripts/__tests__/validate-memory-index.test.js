/**
 * 单元测试：validate-memory-index.js（最小保障）
 *
 * 目标：
 * - 防止 Experience 表格字段错位（Level 被写进 Strength）
 * - 确保触发条件（Trigger）能从列表写法提取
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  generateMemoryIndexContent,
  extractExperienceFields,
} = require('../validate-memory-index.js');

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

test('Experience: Level 不应覆盖 Strength', () => {
  const files = {
    experience: [
      {
        tag: 'exp-demo',
        type: 'knowledge',
        title: 'Demo',
        trigger: '当需要做决策',
        level: 'team',
        file: 'memory/experience/team/knowledge/exp-demo.md',
      },
    ],
    tech: [],
    business: [],
  };

  const existingIndex = {
    experience: { header: null, rows: [] },
    tech: { header: null, rows: [] },
    business: { header: null, rows: [] },
  };

  const content = generateMemoryIndexContent(files, existingIndex);
  const expectedRow = '| exp-demo | knowledge | Demo | 当需要做决策 |  |  | active | medium | hypothesis | team |  |  | `memory/experience/team/knowledge/exp-demo.md` |';

  assert(
    content.includes(expectedRow),
    `索引行字段错位或内容不匹配。\n期望包含：\n${expectedRow}\n实际内容：\n${content}`
  );
});

test('Experience: Trigger 支持列表写法提取', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lx-memory-'));
  const filePath = path.join(dir, 'exp-trigger.md');

  fs.writeFileSync(
    filePath,
    [
      '# 测试经验',
      '',
      '## 触发条件（When to load）',
      '',
      '- 设计 workflow 功能时',
      '- 需要处理自然语言输入时',
      '',
      '## 解决方案（Fix）',
      '- foo',
      '',
    ].join('\n'),
    'utf8'
  );

  const extracted = extractExperienceFields(filePath, 'team', 'knowledge');
  assert(
    extracted.trigger.includes('设计 workflow 功能时') &&
      extracted.trigger.includes('需要处理自然语言输入时'),
    `Trigger 提取失败：${JSON.stringify(extracted)}`
  );
});

