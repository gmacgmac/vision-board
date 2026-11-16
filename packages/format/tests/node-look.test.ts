// How a board looks in ledger v20 (D-100, api.md 183-189): a node's icon (a built-in name, or a library name that
// starts `x-`, so a built-in added later never clashes) and tone (a palette name or a whole OKLCH hue, one spelling
// per colour), a board's skin, a flow's direction; the library's `icon` line (a name is given once; the person accepts
// a changed drawing); and the view check holding a view to the same values.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DIRECTIONS, ICON_NAMES, LEDGER_FORMAT, LIBRARY_ICON_PATTERN, SKINS, TONES, eventProblems, isIconName, isLibraryIcon, isTone, readLedger, validateView,
} from '../src/index.ts';

const AT = '2026-11-16T09:00:00Z';
const agent = (seq: number, e: object) => JSON.stringify({ v: LEDGER_FORMAT, seq, at: AT, by: 'agent', agent: 'a-abcd1234', ...e });
const person = (seq: number, e: object) => JSON.stringify({ v: LEDGER_FORMAT, seq, at: AT, by: 'person', ...e });
const HASH = 'a'.repeat(64);
const OTHER = 'b'.repeat(64);
const board = [
  agent(1, { type: 'join', label: 'Chat' }),
  agent(2, { type: 'board', board: 'p', title: 'Plan', skin: 'command-lens' }),
  agent(3, { type: 'region', board: 'p', region: { id: 'r', title: 'R', mode: 'flow', direction: 'down' } }),
];
const node = (seq: number, n: number, extra: object) =>
  agent(seq, { type: 'node', board: 'p', n, ver: 1, node: { region: 'r', kind: 'topic', title: `Card ${n}`, ...extra } });

test('the built-in icons: about 48 generic names, lowercase kebab-case, none starting with the library\'s `x-`', () => {
  assert.ok(ICON_NAMES.length >= 40 && ICON_NAMES.length <= 56, String(ICON_NAMES.length));
  assert.equal(new Set(ICON_NAMES).size, ICON_NAMES.length);
  for (const name of ICON_NAMES) {
    assert.match(name, /^[a-z][a-z0-9-]*$/, name);
    assert.ok(!name.startsWith('x-') && !isLibraryIcon(name), `${name} would clash with a library name`);
    assert.ok(isIconName(name));
  }
});

test('library names: `x-` then up to 38 more of a-z, 0-9 and -, starting with a letter or digit', () => {
  for (const ok of ['x-encoder', 'x-encoder-audio', 'x-4k', `x-${'a'.repeat(38)}`]) assert.ok(isLibraryIcon(ok) && isIconName(ok), ok);
  for (const bad of ['encoder-x', 'x-', 'x--a', 'X-encoder', 'x-Encoder', `x-${'a'.repeat(39)}`, 'x-a_b', 'y-encoder'])
    assert.ok(!isLibraryIcon(bad), bad);
  assert.equal(LIBRARY_ICON_PATTERN.source, '^x-[a-z0-9][a-z0-9-]{0,37}$');
  assert.ok(!isIconName('rocket'), 'an unknown built-in is no icon');
});

test('tones: a palette name, or a whole hue 0 to 359; never 360, a fraction or a number written as text', () => {
  for (const ok of [...TONES, 0, 210, 359]) assert.ok(isTone(ok), String(ok));
  for (const bad of ['pink', 'Teal', 360, -1, 12.5, '210', null, true]) assert.ok(!isTone(bad), String(bad));
});

test('a node line: an unknown icon or tone, a skin or direction outside its set, each a problem naming its field', () => {
  const problems = (extra: object) => eventProblems(JSON.parse(node(4, 1, extra)));
  for (const ok of [{ icon: 'encoder', tone: 'teal' }, { icon: 'x-encoder', tone: 0 }, { tone: 359 }]) assert.deepEqual(problems(ok), [], JSON.stringify(ok));
  for (const [extra, field] of [[{ icon: 'rocket' }, 'node.icon'], [{ icon: 'x-' }, 'node.icon'], [{ tone: 'pink' }, 'node.tone'], [{ tone: 360 }, 'node.tone'],
    [{ tone: 12.5 }, 'node.tone'], [{ tone: '210' }, 'node.tone']] as const)
    assert.match(problems(extra).join(), new RegExp(`^${field.replace('.', '\\.')}: `), JSON.stringify(extra));
  assert.match(eventProblems(JSON.parse(agent(2, { type: 'board', board: 'p', title: 'P', skin: 'neon' }))).join(), /^skin: one of default, command-lens$/);
  assert.match(eventProblems(JSON.parse(board[2]!.replace('"down"', '"up"'))).join(), /^region\.direction: one of across, down$/);
  assert.deepEqual([SKINS, DIRECTIONS], [['default', 'command-lens'], ['across', 'down']]);
});

test('a node naming a library icon needs an `icon` line for it earlier in the ledger', () => {
  assert.deepEqual(readLedger([...board, node(4, 1, { icon: 'encoder' })]).problems, [], 'a built-in needs none');
  assert.match(readLedger([...board, node(4, 1, { icon: 'x-encoder' })]).problems.join(), /node\.icon: "x-encoder" is not in the icon library/);
  const added = [...board, agent(4, { type: 'icon', name: 'x-encoder', hash: HASH }), node(5, 1, { icon: 'x-encoder' })];
  const read = readLedger(added);
  assert.deepEqual([read.problems, read.index.icons.get('x-encoder')], [[], HASH]);
});

test('a name is given once: an agent\'s other drawing is refused, the same one is a replay; the person accepts a change', () => {
  const held = [...board, agent(4, { type: 'icon', name: 'x-encoder', hash: HASH })];
  assert.deepEqual(readLedger([...held, agent(5, { type: 'icon', name: 'x-encoder', hash: HASH })]).problems, []);
  assert.match(readLedger([...held, agent(5, { type: 'icon', name: 'x-encoder', hash: OTHER })]).problems.join(), /names another drawing; reuse it/);
  const accepted = readLedger([...held, person(5, { type: 'icon', name: 'x-encoder', hash: OTHER })]);
  assert.deepEqual([accepted.problems, accepted.index.icons.get('x-encoder')], [[], OTHER]);
  assert.match(readLedger([...board, agent(4, { type: 'icon', name: 'encoder', hash: HASH })]).problems.join(), /name: "x-", then lowercase/);
  assert.match(readLedger([...board, agent(4, { type: 'icon', name: 'x-encoder', hash: 'ABC' })]).problems.join(), /hash: the file's SHA-256/);
});

test('the view check holds a view to the same icons, tones and directions', () => {
  const view = (n: object, r: object = {}) => ({
    format: 1, session: 'p', version: 3, title: 'Plan',
    regions: [{ id: 'r', title: 'R', mode: 'flow', ...r }], nodes: [{ id: '1', n: 1, region: 'r', kind: 'topic', title: 'T', ...n }], links: [],
  });
  assert.deepEqual(validateView(view({ icon: 'cdn', tone: 120 }, { direction: 'down' })), []);
  assert.deepEqual(validateView(view({ icon: 'rocket', tone: '120' }, { direction: 'sideways' })).length, 3);
});
