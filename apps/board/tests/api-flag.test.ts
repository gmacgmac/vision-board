// The person's flag over the API (field report batch 2 ruling 3, api.md 128, 130), and board numbers
// at the edge (api.md 125). A flag is stored and `read_ledger` (the page's) serves it; no agent read
// shows it or moves for it, and a `check_responses` wait is never woken by one. On board `pricing`
// card 1 is not identity 1 (the roadmap holds the lower ones), so every translation is checked.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';

let h: Harness;
before(async () => { h = await startBoard(); });
after(() => h.close());

/** What an agent reads about `pricing`, without the ledger's position (`head`, and the View's
 * `version`, which every line on any board moves; a board's own head, `list_boards`' `seq`, stays). */
async function agentSide(): Promise<unknown> {
  const drop = ({ head: _head, ...rest }: any) => rest;
  const { q } = h.seeded;
  const { view: { version: _version, ...view }, ...board } = drop(await h.ok('get_board', { board: 'pricing' }));
  return {
    board: { ...board, view },
    node: drop(await h.ok('show_node', { board: 'pricing', n: q, linked: true })),
    box: drop(await h.ok('show_container', { board: 'pricing', region: 'options' })),
    open: drop(await h.ok('list_open', { board: 'pricing' })),
    boards: (await h.ok('list_boards')).boards,
  };
}

test('a flag: stored by board number, served to the page by identity, and no agent read changes', async () => {
  const { q, qId } = h.seeded;
  const before = await agentSide();
  const head = h.ledger.state().seq;
  const flag = await h.ok('act', { board: 'pricing', body: { type: 'act', action: 'flag', n: q } });
  assert.deepEqual([h.last().status, flag.action, flag.n, 'ver' in flag], [201, 'flag', q, false]);
  const lines = (await h.ok('read_ledger', { after: head })).events;
  assert.deepEqual(lines.map((e: any) => [e.action, e.n]), [['flag', qId]], 'the page reads the file\'s line: the identity');
  assert.deepEqual(await agentSide(), before);
  assert.deepEqual((await h.ok('check_responses', { board: 'pricing', after: head })).responses, []);
  await h.ok('act', { board: 'pricing', body: { type: 'act', action: 'unflag', n: q } });
  assert.deepEqual(await agentSide(), before);
  // Only the person flags; an agent's read of the page's ledger is refused.
  const agent = await h.join('Flag reader');
  await h.fails('act', { board: 'pricing', body: { type: 'act', action: 'flag', n: q } }, 403, 'forbidden', agent.client);
  await h.fails('read_ledger', {}, 403, 'forbidden', agent.client);
});

test('a check_responses wait is not woken by a flag', async () => {
  const head = h.ledger.state().seq;
  const started = Date.now();
  const waiting = h.ok('check_responses', { board: 'pricing', after: head, wait: 1 });
  await new Promise((resolve) => setTimeout(resolve, 100));
  await h.ok('act', { board: 'pricing', body: { type: 'act', action: 'flag', n: h.seeded.d } });
  const r = await waiting;
  assert.ok(Date.now() - started >= 900, 'held until the wait ran out');
  assert.deepEqual(r.responses, []);
});

test('board numbers in: act, mark_seen and a radial centre are stored by identity and answered by number', async () => {
  const { q, d, qId, dId } = h.seeded;
  assert.notDeepEqual([q, d], [qId, dId]);
  const ack = await h.ok('act', { board: 'pricing', body: { type: 'act', action: 'ack', n: d, ver: 1 } });
  const seen = await h.ok('mark_seen', { board: 'pricing', body: { n: q, ver: 2 } });
  assert.deepEqual([ack.n, seen.n], [d, q]);
  const stored = h.ledger.events().filter((e) => e.seq === ack.seq || e.seq === seen.seq);
  assert.deepEqual(stored.map((e) => ('id' in e ? e.id : undefined)), [dId, qId]);
  const r = await h.ok('check_responses', { board: 'pricing', after: ack.seq - 1 });
  assert.deepEqual(r.responses.map((e: any) => [e.action, e.n]), [['check', d]], 'a ✓ reads check (D-045)');
  // A radial centre names a card by its number on the board.
  const agent = await h.join('Radial chat');
  const items = [
    { type: 'board', title: 'Radial' }, { type: 'region', region: { id: 'hub', title: 'Hub', mode: 'radial' } },
    { type: 'node', node: { region: 'hub', kind: 'topic', title: 'Centre' } }, { type: 'node', node: { region: 'hub', kind: 'note', title: 'Spoke' } },
    { type: 'region', region: { id: 'hub', title: 'Hub', mode: 'radial', center: 1 } },
  ];
  const w = await h.ok('write_board', { board: 'radial', body: { items } }, { as: agent.client });
  assert.deepEqual(w.results.map((x: any) => x.ok), [true, true, true, true, true]);
  const line = h.ledger.events().find((e) => e.seq === w.results[4].seq)!;
  assert.ok(line.type === 'region' && line.region.center !== undefined && line.region.center > 1, 'stored by identity');
  assert.equal((await h.ok('get_board', { board: 'radial' })).view.regions[0].center, '1');
  assert.equal((await h.ok('show_container', { board: 'radial', region: 'hub' })).region.center, 1);
  const bad = await h.ok('write_board', { board: 'radial', body: { items: [{ type: 'region', region: { id: 'hub', title: 'Hub', mode: 'radial', center: 7 } }] } }, { as: agent.client });
  assert.deepEqual(bad.results[0].problem.errors, [{ pointer: '/items/0/region/center', detail: 'board radial has no card 7' }]);
});
