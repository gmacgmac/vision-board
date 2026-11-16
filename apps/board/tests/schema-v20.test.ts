// Ledger v20 (api.md 182-189, D-099, D-100, D-103): the flag is Bookmark, migrated, never read as a flag; a board's
// skin, a node's icon and tone, a flow's direction, the `icon` line, a container's `seen`, the person's `skin`, `ask`
// and `direction`. The schema and `eventProblems` agree on every line, good and broken; an old ledger with flags
// migrates through the chain to the same boards, the flags as bookmarks, and a second run changes nothing; a v20
// ledger round-trips. The reader knows this one format (D-103 3): a line of any older one, of every type and action,
// is refused by both checks with words to migrate it, and reads once the chain has brought it here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ACTION_IDS, LEDGER_FORMAT, boardView, eventProblems, isUpgradeStop, readLedger, toLine, upgradeLine, upgradeLines } from '#format';
import { FIXTURES_DIR } from '#format/files';
import { boardState, foldLedger } from '#actions';
import { LEDGER_EVENT_ID, schemaProblems } from '../server/schema.ts';
import { AGENT, PERSON, VALID, act } from './schema-cases.ts';

type Rec = Record<string, unknown>;
const verdict = (e: Rec) => ({ schema: schemaProblems(LEDGER_EVENT_ID, e).length === 0, hand: eventProblems(e).length === 0 });
const node = (extra: Rec) => ({ ...AGENT, type: 'node', board: 'b', n: 1, ver: 1, node: { region: 'plan', kind: 'topic', title: 'T', ...extra } });

const GOOD: [string, Rec][] = [
  ['a board line with a skin', { ...AGENT, type: 'board', board: 'b', title: 'B', skin: 'command-lens' }],
  ['a region that runs down', { ...AGENT, type: 'region', board: 'b', region: { id: 'plan', title: 'P', mode: 'flow', direction: 'down' } }],
  ['a node with a built-in icon and a tone name', node({ icon: 'encoder', tone: 'teal' })],
  ['a node with a library icon and a hue', node({ icon: 'x-encoder-audio', tone: 210 })],
  ['hue 0', node({ tone: 0, icon: 'cdn' })],
  ['hue 359', node({ tone: 359 })],
  ['an agent\'s icon line', { ...AGENT, type: 'icon', name: 'x-encoder', hash: 'a'.repeat(64), key: 'icon-encoder' }],
  ['the person\'s icon line (an accepted drawing)', { ...PERSON, type: 'icon', name: 'x-encoder', hash: 'b'.repeat(64) }],
  ['a container seen', { ...PERSON, type: 'seen', board: 'b', region: 'plan', head: 9 }],
  ['a bookmark', act('bookmark')],
  ['an unbookmark', act('unbookmark')],
  ['a skin act', act('skin', { skin: 'default' })],
  ['an ask with every context', act('ask', { lines: [7, 9], context: 'session' })],
  ['a board-wide direction', act('direction', { region: undefined, direction: 'auto' })],
];

const BROKEN: [string, Rec][] = [
  ['flag in a v20 line', { ...PERSON, type: 'act', action: 'flag', n: 1 }],
  ['unflag in a v20 line', { ...PERSON, type: 'act', action: 'unflag', n: 1 }],
  ['an unknown skin', { ...AGENT, type: 'board', board: 'b', title: 'B', skin: 'neon' }],
  ['a skin on a region', { ...AGENT, type: 'region', board: 'b', region: { id: 'plan', title: 'P', mode: 'flow', skin: 'default' } }],
  ['a region that runs up', { ...AGENT, type: 'region', board: 'b', region: { id: 'plan', title: 'P', mode: 'flow', direction: 'up' } }],
  ['a region set to auto (the person\'s word)', { ...AGENT, type: 'region', board: 'b', region: { id: 'plan', title: 'P', mode: 'flow', direction: 'auto' } }],
  ['an unknown icon', node({ icon: 'rocket' })],
  ['a library icon without its name', node({ icon: 'x-' })],
  ['a tone not in TONES', node({ tone: 'pink' })],
  ['hue 360', node({ tone: 360 })],
  ['hue 12.5', node({ tone: 12.5 })],
  ['a hue written as text', node({ tone: '210' })],
  ['a negative hue', node({ tone: -1 })],
  ['an icon line for a built-in name', { ...AGENT, type: 'icon', name: 'encoder', hash: 'a'.repeat(64) }],
  ['an icon line without a hash', { ...AGENT, type: 'icon', name: 'x-encoder' }],
  ['an icon line with an uppercase hash', { ...AGENT, type: 'icon', name: 'x-encoder', hash: 'A'.repeat(64) }],
  ['an icon line naming a board', { ...AGENT, type: 'icon', name: 'x-encoder', hash: 'a'.repeat(64), board: 'b' }],
  ['a container seen without its head', { ...PERSON, type: 'seen', board: 'b', region: 'plan' }],
  ['a container seen naming a card', { ...PERSON, type: 'seen', board: 'b', region: 'plan', head: 9, n: 1 }],
  ['a card seen with a region', { ...PERSON, type: 'seen', n: 1, ver: 1, region: 'plan' }],
  ['a skin act without the skin', act('skin', { skin: undefined })],
  ['a skin act without its board', act('skin', { board: undefined })],
  ['a skin act naming a card', act('skin', { n: 1 })],
  ['a skin act on a container', act('skin', { region: 'plan' })],
  ['a skin on another act', act('mode', { skin: 'default' })],
  ['an ask without context', act('ask', { context: undefined })],
  ['an ask without lines', act('ask', { lines: undefined })],
  ['an ask of no line', act('ask', { lines: [] })],
  ['an ask naming a line twice', act('ask', { lines: [7, 7] })],
  ['an ask naming line 0', act('ask', { lines: [0] })],
  ['an ask with an unknown context', act('ask', { context: 'everything' })],
  ['an ask with words', act('ask', { text: 'Now please.' })],
  ['an ask naming a card', act('ask', { n: 1 })],
  ['lines on a send', act('send', { lines: [7] })],
  ['a context on a comment', act('comment', { context: 'node' })],
  ['a direction act without the direction', act('direction', { direction: undefined })],
  ['a direction act without its board', act('direction', { board: undefined })],
  ['a direction act sideways', act('direction', { direction: 'sideways' })],
  ['a direction act naming a card', act('direction', { n: 1 })],
  ['a direction on a widths act', act('widths', { direction: 'down' })],
];

test('ledger v20: every new line is accepted by both checks', () => {
  assert.equal(LEDGER_FORMAT, 20);
  for (const [name, e] of GOOD) assert.deepEqual(verdict(JSON.parse(JSON.stringify(e)) as Rec), { schema: true, hand: true }, name);
});

test(`ledger v20: ${BROKEN.length} broken lines, each refused by both checks`, () => {
  for (const [name, e] of BROKEN) assert.deepEqual(verdict(JSON.parse(JSON.stringify(e)) as Rec), { schema: false, hand: false }, name);
});

/** A frozen ledger of BE_02 (fixtures/legacy/, never edited), as its lines. */
const legacy = (name: string): string[] => fs.readFileSync(`${FIXTURES_DIR}legacy/${name}.ledger.jsonl`, 'utf8').split('\n').filter(Boolean);
/** Each board's bookmarks and view, as the page folds them. */
const boards = (lines: string[]) => {
  const read = readLedger(lines);
  const s = foldLedger(read.events);
  return { problems: read.problems, boards: [...s.boards.keys()].map((b) => ({ b, view: boardView(s, b), bookmarks: [...boardState(s, b).bookmarks] })) };
};
/** The frozen fold's bookmarks: format 19 called them `flags`. */
const frozenFlags = (name: string): Record<string, string[]> => {
  const frozen = JSON.parse(fs.readFileSync(`${FIXTURES_DIR}legacy/${name}.fold.json`, 'utf8')) as { boards: Record<string, { state: { flags: string[] } }> };
  return Object.fromEntries(Object.entries(frozen.boards).map(([b, x]) => [b, x.state.flags]));
};

test('a format-19 ledger with flag lines migrates to the same boards, its flags as bookmarks; a second run changes nothing', () => {
  for (const name of ['gallery', 'mixed']) {
    const lines = legacy(name);
    assert.ok(lines.some((l) => /"action":"flag"/.test(l)), `${name} holds a flag`);
    const once = upgradeLines(lines);
    assert.deepEqual([once.stops, once.newer, once.lines.length], [[], [], lines.length]);
    assert.ok(once.lines.every((l) => !/"action":"(un)?flag"/.test(l) && JSON.parse(l).v === LEDGER_FORMAT), name);
    const migrated = boards(once.lines);
    assert.deepEqual(migrated.problems, []);
    const flags = frozenFlags(name);
    if (name === 'gallery') assert.ok(Object.values(flags).some((f) => f.length > 0), 'the gallery\'s frozen fold has flags standing');
    assert.deepEqual(Object.fromEntries(migrated.boards.map((x) => [x.b, x.bookmarks])), flags, `${name}: every flag is a bookmark`);
    const twice = upgradeLines(once.lines);
    assert.deepEqual([twice.lines, twice.changed], [once.lines, 0]);
  }
});

test('read as it lies, an older ledger is refused line by line, each with the words to migrate it: only the chain reads it', () => {
  const lines = legacy('gallery');
  const read = readLedger(lines);
  assert.deepEqual([read.events.length, read.problems.length], [0, lines.length]);
  for (const p of read.problems) assert.match(p, /^line \d+: v: this line is in ledger format \d+, older than this Vision Board reads \(20\); migrate the ledger first: npm run ledger:migrate/);
});

/** Every valid line of the current format: one per event type, one per action. */
const EVERY = [...Object.entries(VALID), ...ACTION_IDS.map((a): [string, Rec] => [a, act(a)])];

test('a line one format below the current one, of every event type and action, is refused by both checks with the words to migrate it', () => {
  for (const [name, e] of EVERY) {
    const old = { ...JSON.parse(JSON.stringify(e)) as Rec, v: LEDGER_FORMAT - 1 };
    assert.deepEqual(verdict(old), { schema: false, hand: false }, name);
    assert.deepEqual(eventProblems(old), [`v: this line is in ledger format ${LEDGER_FORMAT - 1}, older than this Vision Board reads (${LEDGER_FORMAT}); migrate the ledger first: npm run ledger:migrate -- <folder>`], name);
    const up = upgradeLine(old);
    assert.ok(!isUpgradeStop(up), name);
    assert.deepEqual(verdict(up as Rec), { schema: true, hand: true }, `${name}, migrated`);
  }
  const none = { ...VALID.board! };
  delete none.v;
  assert.match(eventProblems(none).join(), /^v: this line names no ledger format, older than .*npm run ledger:migrate/);
});

test('a format-20 ledger round-trips: read, every line written back is the line it was, and the chain leaves it be', () => {
  const lines = upgradeLines(legacy('mixed')).lines;
  const extra = [
    { v: LEDGER_FORMAT, seq: 252, at: '2026-11-16T09:00:00Z', by: 'agent', agent: JSON.parse(lines.find((l) => l.includes('"type":"join"'))!).agent, type: 'icon', name: 'x-encoder', hash: 'a'.repeat(64) },
    { v: LEDGER_FORMAT, seq: 253, at: '2026-11-16T09:00:01Z', by: 'person', type: 'act', action: 'skin', board: JSON.parse(lines.find((l) => l.includes('"type":"board"'))!).board, skin: 'command-lens' },
  ].map((e) => JSON.stringify(e));
  const all = [...lines, ...extra];
  const read = readLedger(all);
  assert.deepEqual(read.problems, []);
  assert.deepEqual(read.events.map((e) => toLine(e)), all.map((l) => JSON.parse(l)));
  assert.equal(upgradeLines(all).changed, 0);
});
