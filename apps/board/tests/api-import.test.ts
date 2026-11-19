// Export and import end to end (D-107, D-108; api.md 197-201): a board, or one container, exports its current state
// as the write items that draw it, the person's answers and places, and on request the notes; `write_board`'s `import`
// writes it back as fresh cards. The person's import (the page's cookie) writes every line as the person and applies
// the answers and places as the person's own acts, after the cards; an agent's import writes as the agent with fresh
// keys and drops the person's answers and places, naming each. Whoever imports, the whole conversation comes in: every
// note and reply, each line keeping its original author in `from` (point 617), as history. An import never merges into a container the board holds, and a radial
// container's centre comes through. Board `src` is drawn after the seeded boards, so its numbers are not identities.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import type { UpgradeStep } from '#format';
import { EXPORT_VERSION } from '#format';
import { conditionsOf, nodeDetail } from '#actions';
import { importFile } from '../server/write-import.ts';
import type { Harness, Joined } from './api-harness.ts';
import { startBoard } from './api-harness.ts';

type Rec = Record<string, any>;
let h: Harness;
let A: Joined;
before(async () => {
  h = await startBoard();
  A = await h.join('Export chat');
  const r = await write('src', [
    { type: 'board', title: 'Source' },
    { type: 'region', region: { id: 'plan', title: 'Plan', mode: 'grid', columns: 2 } },
    { type: 'region', region: { id: 'wheel', title: 'Wheel', mode: 'radial' } },
    // The agent's own key `card:1` is the key the export gives card 1: an import must never clash with it.
    { type: 'node', key: 'card:1', node: { region: 'plan', kind: 'question', title: 'Flat fee or per seat?', body: 'For a team of ten.', tone: 'teal' } },
    { type: 'node', node: { region: 'plan', kind: 'decision', title: 'Launch price', size: 'l' } },
    { type: 'node', node: { region: 'plan', kind: 'note', title: 'Revisit annual billing', icon: 'milestone' } },
    { type: 'node', node: { region: 'wheel', kind: 'topic', title: 'Hub' } },
    { type: 'node', node: { region: 'wheel', kind: 'topic', title: 'Spoke', timeline: '2026-10' } },
    { type: 'link', from: 1, to: 3, label: 'leads to' },
    { type: 'link', from: 4, to: 5 },
    { type: 'region', region: { id: 'wheel', title: 'Wheel', mode: 'radial', center: 4 } },
  ]);
  assert.ok(r.results.every((x: Rec) => x.ok), JSON.stringify(r.results));
  // The agent's answer to a note clears the card's ✓ or ✗, so the answers come after it.
  const note = await act('src', { action: 'comment', n: 1, ver: 1, text: 'Per seat suits a growing team.' });
  await write('src', [{ type: 'reply', n: 1, text: 'Agreed: seats it is.', to: note.seq }]);
  await act('src', { action: 'ack', n: 1, ver: 1 });
  await act('src', { action: 'drop', n: 2, ver: 1 });
  await act('src', { action: 'pin', n: 3, x: 140, y: 32 });
  const planNote = await act('src', { action: 'comment', board: 'src', region: 'plan', text: 'The whole plan needs numbers.' });
  await write('src', [{ type: 'reply', n: 2, text: 'Numbers come Friday.', to: planNote.seq }]);
});
after(() => h.close());

const write = (board: string, items: unknown[], who: Joined = A): Promise<Rec> =>
  h.ok('write_board', { board, body: { items } }, { as: who.client });
const act = (board: string, body: object) => h.ok('act', { board, body: { type: 'act', ...body } });
const exported = (board: string, extra: Rec = {}): Promise<Rec> => h.ok('export_board', { board, ...extra });
const importAs = (who: 'person' | Joined, board: string, into: 'new' | 'current', file: unknown): Promise<Rec> =>
  h.ok('write_board', { board, body: { import: { into, file } } }, { as: who === 'person' ? h.person : who.client });
const linesOn = (board: string, after: number) => h.ledger.events().filter((e) => e.seq > after && (e as Rec).board === board);
/** Every line after `after`: an import's own, those on a card naming no board too. */
const linesAfter = (after: number) => h.ledger.events().filter((e) => e.seq > after) as Rec[];
const without = (file: Rec, ...names: string[]) => Object.fromEntries(Object.entries(file).filter(([k]) => !names.includes(k)));
/** The reply's original author, as the export and an imported line name it. */
const byA = () => ({ by: 'agent', agent: A.agent, label: 'Export chat' });
const notesWith = (thread: (text: string) => Rec) => [
  { key: 'card:1', text: 'Per seat suits a growing team.', thread: [thread('Agreed: seats it is.')] },
  { key: 'plan', text: 'The whole plan needs numbers.', thread: [thread('Numbers come Friday.')] },
];

test('export: the board as write items with keys, the person\'s answers and places; no notes unless asked', async () => {
  const file = await exported('src');
  assert.deepEqual([file.v, file.title], [EXPORT_VERSION, 'Source']);
  assert.deepEqual(file.items.map((x: Rec) => `${x.type}:${x.key}`), [
    'region:plan', 'region:wheel', 'node:card:1', 'node:card:2', 'node:card:3', 'node:card:4', 'node:card:5', 'link:link:1>3', 'link:link:4>5',
  ]);
  assert.deepEqual(file.items[1].region, { id: 'wheel', title: 'Wheel', mode: 'radial', center: { key: 'card:4' } });
  assert.deepEqual(file.items[2].node, { region: 'plan', kind: 'question', title: 'Flat fee or per seat?', body: 'For a team of ten.', tone: 'teal' });
  assert.deepEqual(file.items[7], { type: 'link', key: 'link:1>3', from: { key: 'card:1' }, to: { key: 'card:3' }, label: 'leads to' });
  assert.deepEqual(file.answers, [{ key: 'card:1', answer: 'check' }, { key: 'card:2', answer: 'cross' }]);
  assert.deepEqual(file.pins, [{ key: 'card:3', x: 140, y: 32 }]);
  assert.equal(file.notes, undefined);
  const notes = (await exported('src', { notes: true })).notes;
  assert.deepEqual(notes, notesWith((text) => ({ text, from: byA() })), 'each reply names its author');
});

test('export: an agent reads the same file through get_board and show_container with export', async () => {
  assert.deepEqual(await h.ok('get_board', { board: 'src', export: true }, { as: A.client }), await exported('src'));
  const wheel = await h.ok('show_container', { board: 'src', region: 'wheel', export: true, notes: true }, { as: A.client });
  assert.deepEqual(wheel, await exported('src', { region: 'wheel', notes: true }));
  assert.deepEqual([wheel.title, wheel.items.map((x: Rec) => x.key)], ['Wheel', ['wheel', 'card:4', 'card:5', 'link:4>5']]);
  await h.fails('export_board', { board: 'src', region: 'nowhere' }, 404, 'not-found');
});

test('the person\'s import into a new board: the same cards, links, answers, places and centre, every line the person\'s', async () => {
  const file = await exported('src', { notes: true });
  const head = h.ledger.state().seq;
  const r = await importAs('person', 'copy', 'new', file);
  assert.ok(r.results.every((x: Rec) => x.ok), JSON.stringify(r.results));
  assert.deepEqual(r.results.map((x: Rec) => x.n).filter(Boolean), [1, 2, 3, 4, 5], 'fresh numbers from 1');
  assert.equal(r.dropped, undefined, 'the whole conversation comes in');
  const lines = linesOn('copy', head);
  assert.ok(lines.every((e) => e.by === 'person' && !('agent' in e) && !('key' in e)), JSON.stringify(lines.filter((e) => e.by !== 'person')));
  const said = linesAfter(head).filter((e) => e.type === 'reply' || (e.type === 'act' && e.action === 'comment'));
  assert.ok(said.every((e) => e.by === 'person'));
  assert.deepEqual(said.map((e) => [e.type, e.text, e.from]), [
    ['act', 'Per seat suits a growing team.', { by: 'person' }], ['reply', 'Agreed: seats it is.', byA()],
    ['act', 'The whole plan needs numbers.', { by: 'person' }], ['reply', 'Numbers come Friday.', byA()],
  ], 'each line keeps its original author');
  const again = await exported('copy', { notes: true });
  assert.deepEqual(again, file, 'a round trip gives the same board and conversation');
  const clash = await h.fails('write_board', { board: 'copy', body: { import: { into: 'new', file } } }, 409, 'conflict', h.person);
  assert.match(clash.detail, /^Board "copy" exists already/);
});

test('the person\'s import into the current board: every container new beside the ones it holds, nothing merged', async () => {
  const plan = await exported('src', { region: 'plan' });
  const r = await importAs('person', 'src', 'current', plan);
  assert.equal(r.dropped, undefined, 'nothing left out');
  const after = await exported('src');
  assert.deepEqual(after.items.filter((x: Rec) => x.type === 'region').map((x: Rec) => x.region.id), ['plan', 'wheel', 'plan-2']);
  assert.deepEqual(await exported('src', { region: 'plan' }), plan, 'the container it came from is as it was');
  const copy = await exported('src', { region: 'plan-2' });
  assert.deepEqual(copy.items.filter((x: Rec) => x.type === 'node').map((x: Rec) => x.node.title), ['Flat fee or per seat?', 'Launch price', 'Revisit annual billing']);
  assert.deepEqual([copy.answers, copy.pins], [[{ key: 'card:6', answer: 'check' }, { key: 'card:7', answer: 'cross' }], [{ key: 'card:8', x: 140, y: 32 }]]);
});

test('an agent\'s import: written as the agent with fresh keys; the person\'s answers and places dropped and named, the conversation kept', async () => {
  const full: Rec = { ...(await exported('src', { notes: true })), title: 'Agent copy' };
  const head = h.ledger.state().seq;
  const r = await importAs(A, 'agent-copy', 'new', full);
  assert.ok(r.results.every((x: Rec) => x.ok), JSON.stringify(r.results));
  assert.ok(r.results.every((x: Rec) => typeof x.key === 'string' && x.key.startsWith('import-') && !x.replayed), 'fresh keys, no replay of card:1');
  const named = (part: string, n: number, words: string) => Array.from({ length: n }, (_, i) => `${part}[${i}]: ${words}; left out`);
  assert.deepEqual(r.dropped, [
    ...named('answers', full.answers.length, '✓ and ✗ are the person\'s own acts, and an agent\'s import can\'t make them'),
    ...named('pins', full.pins.length, 'where a card sits is the person\'s own act, and an agent\'s import can\'t make it'),
  ]);
  const lines = linesOn('agent-copy', head);
  assert.ok(lines.every((e) => e.by === 'agent' && e.agent === A.agent));
  const said = linesAfter(head).filter((e) => e.type === 'reply' || e.type === 'act');
  assert.ok(said.every((e) => e.by === 'agent' && e.agent === A.agent));
  assert.deepEqual(said.map((e) => [e.type, e.from]), [['act', { by: 'person' }], ['reply', byA()], ['act', { by: 'person' }], ['reply', byA()]],
    'the person\'s words and the agent\'s, written by the importing agent');
  const copy = await exported('agent-copy', { notes: true });
  assert.deepEqual([copy.title, copy.answers, copy.pins], ['Agent copy', undefined, undefined]);
  assert.deepEqual(copy.items, full.items);
  assert.deepEqual(copy.notes, full.notes, 'every note and reply, each with its author');
  // A second import of a file writes again, with other fresh keys: the file's keys never clash, and the centre follows.
  const twice = await importAs(A, 'agent-copy', 'current', await exported('src', { region: 'wheel' }));
  assert.ok(twice.results.every((x: Rec) => x.ok && !x.replayed));
  const wheel = await exported('agent-copy', { region: 'wheel-2' });
  assert.deepEqual(wheel.items[0].region.center, { key: wheel.items[1].key });
});

test('imported notes are history: none waits for Send, none can be edited, check_responses lists none', async () => {
  const head = h.ledger.state().seq;
  // The agent's own import, so every line on the board concerns it.
  await importAs(A, 'history', 'new', await exported('src', { notes: true }));
  const s = h.ledger.state();
  const notes = linesAfter(head).filter((e) => e.type === 'act' && e.action === 'comment');
  assert.equal(notes.length, 2);
  const unsent = s.unsent.get('history') ?? new Set<number>();
  assert.ok(notes.every((e) => !unsent.has(e.seq)), 'no imported note goes with Send');
  const card = notes.find((e) => e.id !== undefined)!;
  await h.fails('act', { board: 'history', body: { type: 'act', action: 'note-edit', note: card.seq, text: 'Changed.' } }, 422, 'invalid');
  const r = await h.ok('check_responses', { board: 'history', after: head }, { as: A.client });
  assert.ok(!JSON.stringify(r).includes('Per seat suits'), 'an imported note is no new response');
});

test('an imported note owes nothing (ruling 621); a note the person writes after the import is owed as usual', async () => {
  const file = {
    v: EXPORT_VERSION, title: 'Owed', items: [
      { type: 'region', key: 'r', region: { id: 'r', title: 'R', mode: 'grid' } },
      { type: 'node', key: 'card:1', node: { region: 'r', kind: 'question', title: 'Which venue?' } },
    ],
    notes: [{ key: 'card:1', text: 'Ask the team first.' }, { key: 'r', text: 'The whole list waits.' }],
  };
  await importAs('person', 'owed', 'new', file);
  const owed = () => conditionsOf(h.ledger.state(), { board: 'owed' }).filter((c) => c.kind === 'item.owed' || c.kind === 'container.owed');
  const id = h.ledger.state().index.cards.get('owed')![0]!;
  const status = () => nodeDetail(h.ledger.state(), id)!.status;
  assert.deepEqual([owed(), status()], [[], 'open'], 'no reply, and the card is not with the agent');
  await act('owed', { action: 'comment', n: 1, ver: 1, text: 'Now we know: the hall.' });
  assert.deepEqual([owed().map((c) => c.kind), status()], [['item.owed'], 'with-agent'], 'the new note is owed');
});

test('a card the person moved to Later comes into the new board\'s Later; an agent\'s import draws it in a container and names its place', async () => {
  await write('lt', [
    { type: 'board', title: 'Later source' },
    { type: 'region', region: { id: 'q', title: 'Questions', mode: 'grid' } },
    { type: 'node', node: { region: 'q', kind: 'question', title: 'Stay' } },
    { type: 'node', node: { region: 'q', kind: 'question', title: 'Set aside' } },
  ]);
  await act('lt', { action: 'move', n: 2, region: 'later' });
  const file = await exported('lt');
  const r = await importAs('person', 'lt-copy', 'new', file);
  assert.ok(r.results.every((x: Rec) => x.ok), JSON.stringify(r.results));
  assert.equal(r.dropped, undefined);
  assert.deepEqual(await exported('lt-copy'), { ...file, title: 'Later source' }, 'the card is in Later, as on the source');
  const a = await importAs(A, 'lt-agent', 'new', file);
  assert.ok(a.results.every((x: Rec) => x.ok), JSON.stringify(a.results));
  assert.deepEqual(a.dropped, ['items[2].node.region: a card moved to Later is the person\'s own act, and an agent\'s import can\'t make it; left out']);
  const drawn = (await exported('lt-agent')).items.filter((x: Rec) => x.type === 'node').map((x: Rec) => [x.node.title, x.node.region]);
  assert.deepEqual(drawn, [['Stay', 'q'], ['Set aside', 'q']], 'drawn in the file\'s first container');
});

test('a person\'s import names each item the normal checks refused: nothing goes silently', async () => {
  const file = { v: EXPORT_VERSION, title: 'Only Later', items: [{ type: 'node', key: 'card:1', node: { region: 'later', kind: 'question', title: 'Nowhere to draw' } }] };
  const r = await importAs('person', 'only-later', 'new', file);
  assert.equal(r.results[0].ok, false);
  assert.deepEqual(r.dropped, ['Card "Nowhere to draw" was left out.']);
});

test('import: an unknown field and an unknown kind are dropped and named, for whoever imports; the rest is written', async () => {
  const file = { v: EXPORT_VERSION, title: 'Odd', made: 'today', items: [
    { type: 'region', key: 'r', region: { id: 'r', title: 'R', mode: 'grid' } },
    { type: 'node', key: 'a', node: { region: 'r', kind: 'question', title: 'A', glow: true } },
    { type: 'node', key: 'b', node: { region: 'r', kind: 'hologram', title: 'B' } },
  ] };
  const r = await importAs('person', 'odd', 'new', file);
  assert.deepEqual(r.dropped, [
    'The file came in, but part of it was left out.', 'Card "A" came in, but part of it was left out.', 'Card "B" was left out.',
  ], 'worded for a person (point 619)');
  assert.deepEqual(r.results.map((x: Rec) => [x.ok, x.key]), [[true, 'r'], [true, 'a']]);
  const agent = await importAs(A, 'odd-agent', 'new', file);
  assert.deepEqual(agent.dropped, [
    'made: not a field Vision Board knows', 'items[1].node.glow: not a field Vision Board knows',
    'items[2]: card kind `hologram` is unknown; the item is left out',
  ], 'pointer first, for an agent');
});

test('import: a file a newer Vision Board made, or none at all, is refused whole with words, and nothing is written', async () => {
  const head = h.ledger.state().seq;
  const newer = await h.fails('write_board', { board: 'nope', body: { import: { into: 'new', file: { v: EXPORT_VERSION + 1, items: [] } } } }, 422, 'invalid', h.person);
  assert.match(newer.detail, /made by a newer Vision Board/);
  const none = await h.fails('write_board', { board: 'nope', body: { import: { into: 'new', file: { title: 'x' } } } }, 422, 'invalid', A.client);
  assert.match(none.detail, /not a Vision Board export file/);
  await h.fails('write_board', { board: 'nope', body: { import: { into: 'current', file: { v: EXPORT_VERSION, title: 'x', items: [] } } } }, 404, 'not-found', h.person);
  assert.equal(h.ledger.state().seq, head);
});

test('import: one call takes a file past write_board\'s 200 items', async () => {
  const items = [{ type: 'region', key: 'r', region: { id: 'r', title: 'R', mode: 'grid' } },
    ...Array.from({ length: 250 }, (_, i) => ({ type: 'node', key: `c${i}`, node: { region: 'r', kind: 'topic', title: `Card ${i}` } }))];
  const r = await importAs('person', 'big', 'new', { v: EXPORT_VERSION, title: 'Big', items });
  assert.deepEqual([r.results.length, r.results.every((x: Rec) => x.ok), r.results.at(-1).n], [251, true, 250]);
});

test('import: an older v is upgraded step by step before it is written (a test-only step)', () => {
  const v0: UpgradeStep = { from: 0, to: 1, up: ({ name, ...f }) => ({ ...f, v: 1, title: String(name) }) };
  const file = { v: 0, name: 'Old plans', items: [{ type: 'region', key: 'r', region: { id: 'r', title: 'R', mode: 'grid' } }] };
  const r = importFile(h.ledger, { board: 'old', into: 'new', file, writer: { by: 'person' } }, [v0]);
  assert.deepEqual([r.dropped, r.results.map((x) => x.ok)], [[], [true]]);
  assert.equal(h.ledger.state().boards.get('old')?.title, 'Old plans');
});
