// The export file's upgrade chain and conditioning (D-107; PLAN decisions 5, 6): a file of the current `v` passes the
// chain untouched, an older one climbs it step by step (a fake v0 step, here only: the chain is empty today), and one
// the chain can't bring to the current `v` stops with words. Conditioning keeps what the export format knows, drops
// the rest and names each drop, and fills a required part that has a default.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ExportFile, UpgradeStep } from '../src/index.ts';
import { EXPORT_STEPS, EXPORT_VERSION, conditionExport as conditionDrops, forPerson, isUpgradeStop, keptFor as keptDrops, upgradeExport } from '../src/index.ts';

type Rec = Record<string, unknown>;

const region = (id = 'plan', extra: Rec = {}) => ({ type: 'region', key: `r-${id}`, region: { id, title: 'Plan', mode: 'grid', ...extra } });
const node = (key: string, extra: Rec = {}, item: Rec = {}) =>
  ({ type: 'node', key, node: { region: 'plan', kind: 'question', title: `Card ${key}`, ...extra }, ...item });
const link = (from: unknown, to: unknown) => ({ type: 'link', key: 'l-1', from, to, label: 'leads to' });
/** The conditioning and the writer's cut, each part left out as the agent's words (pointer first). */
const conditionExport = (raw: Rec) => { const c = conditionDrops(raw); return { file: c.file, dropped: c.dropped.map((d) => d.text) }; };
const keptFor = (f: ExportFile, by: 'person' | 'agent') => { const c = keptDrops(f, by); return { file: c.file, dropped: c.dropped.map((d) => d.text) }; };
const file = (extra: Rec = {}): Rec => ({ v: EXPORT_VERSION, title: 'Pricing', items: [region(), node('a'), node('b'), link({ key: 'a' }, { key: 'b' })], ...extra });

test('upgrade: a file of the current v comes back untouched; the chain is empty today', () => {
  const f = file();
  assert.equal(upgradeExport(f), f);
  assert.deepEqual(EXPORT_STEPS, []);
  assert.equal(EXPORT_VERSION, 1);
});

test('upgrade: an older v climbs the chain one step at a time (a fake v0 step)', () => {
  const v0: UpgradeStep = { from: 0, to: 1, up: (f) => ({ ...f, v: 1, title: String(f.name) }) };
  const out = upgradeExport({ v: 0, name: 'Old plans', items: [] }, [v0]);
  assert.ok(!isUpgradeStop(out));
  assert.deepEqual(out, { v: 1, name: 'Old plans', title: 'Old plans', items: [] });
  const stopped = upgradeExport({ v: 0, items: [] }, [{ from: 0, to: 1, up: () => ({ stop: 'too old to read' }) }]);
  assert.deepEqual(stopped, { stop: 'too old to read' });
});

test('upgrade: no step from its v, a newer v, no v and not an object each stop with words', () => {
  const stops = [upgradeExport({ v: 0, items: [] }), upgradeExport({ v: EXPORT_VERSION + 1, items: [] }), upgradeExport({ title: 'x' }),
    upgradeExport({ v: 'one' }), upgradeExport([]), upgradeExport(null)];
  for (const s of stops) assert.ok(isUpgradeStop(s), JSON.stringify(s));
  const words = stops.map((s) => (s as { stop: string }).stop);
  assert.match(words[0]!, /version 0/);
  assert.match(words[1]!, /newer/);
  assert.equal(new Set(words.slice(2)).size, 1, 'no v, a v that is not a number and not an object: one refusal, not an export file');
});

test('condition: a clean file comes through as it was, nothing dropped', () => {
  const f = file({ answers: [{ key: 'a', answer: 'check' }], pins: [{ key: 'b', x: 40, y: 12.5 }],
    notes: [{ key: 'a', text: 'Why per seat?', thread: [{ text: 'It grows with the team.', from: { by: 'agent', label: 'pricing' } }] }, { keys: ['a', 'b'], text: 'Both cards' }] });
  const { file: out, dropped } = conditionExport(f);
  assert.deepEqual(dropped, []);
  assert.deepEqual(out, f);
});

test('condition: an unknown field is dropped and named, at the top, on an item and inside a node or container', () => {
  const f = file({ made: 'today', items: [region('plan', { colour: 'red' }), node('a', { glow: true }), node('b', {}, { pinned: 1 })] });
  const { file: out, dropped } = conditionExport(f);
  assert.equal('made' in out, false);
  assert.deepEqual(out.items[0], region());
  assert.deepEqual(out.items[1], node('a'));
  assert.deepEqual(out.items[2], node('b'));
  assert.equal(dropped.length, 4);
  for (const [i, field] of ['made', 'colour', 'glow', 'pinned'].entries()) assert.match(dropped[i]!, new RegExp(`\\b${field}\\b`));
});

test('condition: an unknown kind or item type drops the item, named; what named it goes too, named', () => {
  const f = file({
    items: [region(), node('a', { kind: 'hologram' }), node('b'), { type: 'reply', key: 'r', n: 1, text: 'Hi' }, link({ key: 'a' }, { key: 'b' })],
    answers: [{ key: 'a', answer: 'check' }, { key: 'b', answer: 'cross' }],
  });
  const { file: out, dropped } = conditionExport(f);
  assert.deepEqual(out.items.map((x) => x.key), ['r-plan', 'b']);
  assert.deepEqual(out.answers, [{ key: 'b', answer: 'cross' }]);
  assert.match(dropped[0]!, /hologram/);
  assert.match(dropped[1]!, /reply/);
  assert.equal(dropped.length, 4, dropped.join('\n'));
  assert.match(dropped[2]!, /^items\[4\]/, 'the link to the dropped card');
  assert.match(dropped[3]!, /^answers\[0\]/, 'the answer on the dropped card');
});

test('condition: a missing or refused title is defaulted, on the file, a container and a card; a missing kind or container is not', () => {
  const { file: out, dropped } = conditionExport({ v: EXPORT_VERSION, items: [region('plan', { title: undefined }), node('a', { title: '  ' }), node('b', { kind: undefined }), node('c', { region: 'gone' })] });
  assert.equal(typeof out.title, 'string');
  assert.ok(out.title.trim().length > 0);
  const [r, a] = out.items as unknown as [Rec & { region: Rec }, Rec & { node: Rec }];
  assert.ok(String(r.region.title).trim());
  assert.ok(String(a.node.title).trim());
  assert.equal(out.items.length, 2);
  assert.equal(dropped.length, 3, dropped.join('\n'));
  assert.match(dropped[0]!, /^items\[1\]\.node\.title/, 'a title that was there and is refused is named; one left out is not');
});

test('condition: what names the board it came from is dropped and named: a card number, `n`, `base`, `insert`, a centre by number', () => {
  const f = file({ items: [region('plan', { center: 2 }), node('a', {}, { n: 4, base: 2 }), node('b', {}, { insert: { after: 1, before: 2 } }), link(1, { key: 'b' })] });
  const { file: out, dropped } = conditionExport(f);
  assert.deepEqual(out.items, [region(), node('a'), node('b')]);
  assert.equal(dropped.length, 5, dropped.join('\n'));
});

test('condition: a radial container\'s centre by `{ key }` of a card in the file is kept; one naming no card is dropped, named', () => {
  const kept = file({ items: [region('plan', { mode: 'radial', center: { key: 'b' } }), node('a'), node('b')] });
  assert.deepEqual(conditionExport(kept), { file: kept, dropped: [] });
  for (const center of [{ key: 'zz' }, { key: 'r-plan' }, { key: 'a', n: 1 }, 'b']) {
    const { file: out, dropped } = conditionExport(file({ items: [region('plan', { mode: 'radial', center }), node('a')] }));
    assert.deepEqual([out.items[0], dropped.length], [region('plan', { mode: 'radial' }), 1], JSON.stringify(center));
    assert.match(dropped[0]!, /^items\[0\]\.region\.center: /);
  }
});

test('condition: an item whose key an earlier item has is left out, named, so every key names one thing', () => {
  const { file: out, dropped } = conditionExport(file({ items: [region(), node('a'), node('a', { title: 'Again' }), { ...region('two'), key: 'a' }] }));
  assert.deepEqual(out.items, [region(), node('a')]);
  assert.deepEqual(dropped, ['items[2].key: `a` is the key of an earlier item; the item is left out', 'items[3].key: `a` is the key of an earlier item; the item is left out']);
});

test('condition: a value the ledger refuses is dropped where it is optional, named with why', () => {
  const f = file({ items: [region('plan', { mode: 'spiral' }), node('a', { size: 'xl', tone: 'neon', timeline: '2026-10-13 14:30' })] });
  const { file: out, dropped } = conditionExport(f);
  assert.deepEqual(out.items[0], { type: 'region', key: 'r-plan', region: { id: 'plan', title: 'Plan' } });
  assert.deepEqual((out.items[1] as { node: Rec }).node, { region: 'plan', kind: 'question', title: 'Card a', timeline: '2026-10-13T14:30' });
  assert.equal(dropped.length, 3, dropped.join('\n'));
  assert.match(dropped[0]!, /mode/);
});

test('condition: answers, pins and notes that name no card, or are malformed, are dropped and named', () => {
  const f = file({
    answers: [{ key: 'a', answer: 'maybe' }, { key: 'zz', answer: 'check' }],
    pins: [{ key: 'a', x: 'left', y: 1 }, { key: 'b', x: 1, y: 2, z: 3 }],
    notes: [{ key: 'zz', text: 'Lost' }, { key: 'plan', text: '' }, { keys: ['a', 'zz'], text: 'Half' }, { key: 'r-plan', text: 'On the container' }],
    extra: [],
  });
  const { file: out, dropped } = conditionExport(f);
  assert.equal(out.answers, undefined);
  assert.deepEqual(out.pins, [{ key: 'b', x: 1, y: 2 }]);
  assert.deepEqual(out.notes, [{ key: 'r-plan', text: 'On the container' }]);
  assert.equal(dropped.length, 8, dropped.join('\n'));
});

test('by writer (D-108, point 617): an agent\'s import leaves out the person\'s answers and places; the conversation comes in whoever imports', () => {
  const f = file({ answers: [{ key: 'a', answer: 'check' }], pins: [{ key: 'b', x: 1, y: 2 }],
    notes: [{ key: 'a', text: 'Why?', thread: [{ text: 'Because.', from: { by: 'agent', label: 'pricing' } }] }, { key: 'b', text: 'Plain' }] }) as ExportFile;
  const agent = keptFor(f, 'agent');
  assert.deepEqual(agent.file, { v: f.v, title: f.title, items: f.items, notes: f.notes });
  assert.deepEqual(agent.dropped.map((d) => d.split(':')[0]), ['answers[0]', 'pins[0]']);
  assert.ok(agent.dropped.every((d) => d.endsWith('; left out')));
  assert.deepEqual(keptFor(f, 'person'), { file: f, dropped: [] });
});

test('condition (point 617): a reply keeps its author; one with none, or a refused one, comes in as an agent\'s', () => {
  const by = { by: 'agent', agent: 'a-7k2m9q4x', label: 'pricing' };
  const thread = [{ text: 'Kept.', from: by }, { text: 'No author.' }, { text: 'Bad author.', from: { by: 'person' } }];
  const { file: out, dropped } = conditionExport(file({ notes: [{ key: 'a', text: 'Why?', thread }] }));
  assert.deepEqual(out.notes![0]!.thread, [{ text: 'Kept.', from: by }, { text: 'No author.', from: { by: 'agent' } }, { text: 'Bad author.', from: { by: 'agent' } }]);
  assert.deepEqual(dropped, ['notes[0].thread[2].from.by: person on an imported reply; left out']);
});

test('for a person (point 619): each part left out once, named by what it is, saying whether all of it went', () => {
  const raw = file({
    made: 'today',
    items: [region(), node('a', { glow: true, kind: 'question' }), node('b', { kind: 'hologram', title: 'Hologram card' }), node('c', { glow: 1, shine: 2 }),
      { type: 'region', key: 'r-two', region: { id: 'two', title: 'T'.repeat(300), mode: 'grid', tint: 'red' } }, link({ key: 'a' }, { key: 'zz' })],
    answers: [{ key: 'zz', answer: 'check' }], pins: [{ key: 'zz', x: 1, y: 1 }],
    notes: [{ key: 'zz', text: 'Lost' }, { key: 'a', text: 'Why?', thread: [{ text: '' }] }],
  });
  const lines = forPerson(raw, conditionDrops(raw).dropped);
  assert.deepEqual(lines, [
    'The file came in, but part of it was left out.',
    'Card "Card a" came in, but part of it was left out.',
    'Card "Hologram card" was left out.',
    'Card "Card c" came in, but part of it was left out.',
    `Container "${'T'.repeat(59)}…" came in, but part of it was left out.`,
    'A link was left out.',
    'A ✓ or ✗ was left out.',
    'A card\'s place was left out.',
    'A note was left out.',
    'A reply was left out.',
  ]);
  assert.ok(lines.every((l) => !/\[\d+\]|`/.test(l)), 'no pointer, no code');
});
