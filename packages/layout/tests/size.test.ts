// sizeTier (D-030, components.md § Node size points 2-3): the auto tier from the body Markdown,
// the agent's suggestion above it, the person's pick above both, emphasis one tier up.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { autoTier, measureBody, sizeTier } from '../src/index.ts';
import { TABLE_COLUMNS } from '../src/size.ts';

const chars = (n: number) => 'x'.repeat(n);
const list = (items: number) => Array.from({ length: items }, (_, i) => `- item ${i + 1}`).join('\n');

test('auto: no body, or 140 characters or fewer, is S', () => {
  assert.equal(autoTier(undefined), 's');
  assert.equal(autoTier(''), 's');
  assert.equal(autoTier(chars(140)), 's');
});

test('auto: over 140 characters is M, up to 480', () => {
  assert.equal(autoTier(chars(141)), 'm');
  assert.equal(autoTier(chars(480)), 'm');
});

test('auto: over 480 characters is L', () => {
  assert.equal(autoTier(chars(481)), 'l');
});

test('auto: surrounding whitespace does not count', () => {
  assert.equal(autoTier(`\n\n${chars(140)}   \n`), 's');
});

test('auto: a fenced code block makes a short body M', () => {
  assert.equal(autoTier('Run:\n\n```\nnpm test\n```'), 'm');
  assert.equal(autoTier('~~~\nx\n~~~'), 'm');
  assert.equal(autoTier('> ```\n> quoted code\n> ```'), 'm');
  // Inline code is not a block.
  assert.equal(autoTier('Run `npm test` first.'), 's');
});

test('auto: more than 6 list items is M; 6 is not', () => {
  assert.equal(autoTier(list(6)), 's');
  assert.equal(autoTier(list(7)), 'm');
  assert.equal(autoTier('1. a\n2. b\n3. c\n4. d\n5. e\n6. f\n7) g'), 'm');
  assert.equal(autoTier('* a\n+ b\n- c\n  - d\n  - e\n- f\n- g'), 'm');
});

test('auto: list markers inside a code block are not list items', () => {
  assert.deepEqual(measureBody(`${list(5)}\n\n\`\`\`\n- a\n- b\n\`\`\``), { chars: 61, code: true, items: 5, table: false });
  assert.deepEqual(measureBody(`${list(5)}\n- a\n- b`), { chars: 52, code: false, items: 7, table: false });
  assert.equal(autoTier(list(5)), 's');
});

test('auto: a rule or emphasis line is not a list item', () => {
  assert.equal(autoTier('---\n*not a list*\n**bold**\n-x\n1.5 percent\n- a\n- b'), 's');
});

test('auto: a table of up to 4 columns makes a short body L (markdownMore); 5 columns, or the flag off, do not', () => {
  const table = (n: number) => `${'| h '.repeat(n)}|\n${'|:-:'.repeat(n)}|\n${'| x '.repeat(n)}|`;
  assert.equal(TABLE_COLUMNS, 4);
  assert.equal(autoTier(table(1)), 'l');
  assert.equal(autoTier(`Two options:\n${table(4)}`), 'l');
  assert.equal(autoTier('a | b\n- | -'), 's', 'a delimiter row starting "- " is a list item, not a table');
  assert.equal(autoTier('a | b\n--|--'), 'l', 'outer pipes are optional');
  assert.equal(autoTier(`> ${table(2).replace(/\n/g, '\n> ')}`), 'l', 'in a quote');
  assert.equal(autoTier(table(5)), 's');
  assert.equal(autoTier(table(2), false), 's');
  assert.equal(sizeTier({ body: table(2) }, undefined, false), 's');
  assert.equal(sizeTier({ body: table(2) }), 'l');
  // Not a table: a delimiter row with no pipe, a column count that differs, a blank line between, in a code block, under a heading.
  for (const src of ['a\n---', '| a | b |\n|---|', '| a |\n\n|---|', '```\n| a |\n|---|\n```', '# a | b\n|-|-|']) {
    assert.equal(measureBody(src).table, false, src);
  }
  // The agent's suggestion and the person's pick still win over it.
  assert.equal(sizeTier({ body: table(2), size: 's' }), 's');
  assert.equal(sizeTier({ body: table(2) }, 'm'), 'm');
});

test('auto: the over-480 rule wins over the M rules', () => {
  assert.equal(autoTier(`${list(7)}\n${chars(481)}`), 'l');
});

test('the agent suggestion overrides the auto tier', () => {
  assert.equal(sizeTier({ body: chars(600), size: 's' }), 's');
  assert.equal(sizeTier({ body: 'short', size: 'l' }), 'l');
  assert.equal(sizeTier({ body: 'short' }), 's');
});

test('the person pick overrides the agent and the auto tier', () => {
  assert.equal(sizeTier({ body: chars(600), size: 'm' }, 's'), 's');
  assert.equal(sizeTier({ body: 'short' }, 'l'), 'l');
});

test('the person picking auto removes their pick', () => {
  assert.equal(sizeTier({ body: chars(600) }, 'auto'), 'l');
  assert.equal(sizeTier({ body: 'short', size: 'm' }, 'auto'), 'm');
});

test('emphasis raises the auto or agent tier one step, up to L', () => {
  assert.equal(sizeTier({ body: 'short', emphasis: true }), 'm');
  assert.equal(sizeTier({ body: chars(200), emphasis: true }), 'l');
  assert.equal(sizeTier({ body: chars(600), emphasis: true }), 'l');
  assert.equal(sizeTier({ body: 'short', size: 'm', emphasis: true }), 'l');
  assert.equal(sizeTier({ body: 'short', size: 'l', emphasis: true }), 'l');
  assert.equal(sizeTier({ body: 'short', emphasis: false }), 's');
});

test('emphasis does not change the person pick: the size they chose is the size they get', () => {
  assert.equal(sizeTier({ body: 'short', emphasis: true }, 's'), 's');
  assert.equal(sizeTier({ body: 'short', emphasis: true }, 'm'), 'm');
  assert.equal(sizeTier({ body: 'short', emphasis: true }, 'auto'), 'm');
});

test('title and tags do not count, only the body', () => {
  assert.equal(sizeTier({ body: 'short', title: chars(600), tags: ['a'.repeat(40), 'b'.repeat(40)] } as never), 's');
});
