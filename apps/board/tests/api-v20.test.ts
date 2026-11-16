// Ledger v20 over the API (api.md 182-189): a board's skin through write_board, put_board's rename and the person's
// act, said by get_board and list_boards; a container seen through mark_seen; Ask now as an act whose lines are
// `seq`s, not cards; the bookmark. The icon library's operations are in icon-library.test.ts.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import type { Harness, Joined } from './api-harness.ts';
import { startBoard } from './api-harness.ts';

let h: Harness;
let bot: Joined;
before(async () => {
  h = await startBoard();
  bot = await h.join('Skin chat');
});
after(() => h.close());

const write = (board: string, items: unknown[]) => h.ok('write_board', { board, body: { items } }, { as: bot.client });
const skinOf = async (board: string) => ({
  state: (await h.ok('get_board', { board })).state.skin,
  list: (await h.ok('list_boards')).boards.find((b: { board: string }) => b.board === board)?.skin,
});

test('a skin: set by the board\'s maker, kept by a rename, changed by the person; default is left out', async () => {
  await write('lens', [
    { type: 'board', title: 'Lens', skin: 'command-lens', key: 'lens-board' },
    { type: 'region', region: { id: 'flow', title: 'Flow', mode: 'flow', direction: 'down' }, key: 'lens-flow' },
    { type: 'node', node: { region: 'flow', kind: 'topic', title: 'Encode', icon: 'encoder', tone: 210 }, key: 'lens-1' },
  ]);
  assert.deepEqual(await skinOf('lens'), { state: 'command-lens', list: 'command-lens' });
  const view = (await h.ok('get_board', { board: 'lens' })).view;
  assert.deepEqual([view.regions[0].direction, view.nodes[0].icon, view.nodes[0].tone], ['down', 'encoder', 210]);
  await h.ok('put_board', { board: 'lens', body: { title: 'Lens, renamed' } });
  assert.deepEqual(await skinOf('lens'), { state: 'command-lens', list: 'command-lens' }, 'a rename keeps it');
  await h.ok('act', { board: 'lens', body: { type: 'act', action: 'skin', board: 'lens', skin: 'default' } });
  assert.deepEqual(await skinOf('lens'), { state: undefined, list: undefined });
  await h.fails('act', { board: 'lens', body: { type: 'act', action: 'skin', board: 'lens', skin: 'neon' } }, 422, 'invalid');
  await h.fails('act', { board: 'lens', body: { type: 'act', action: 'skin', board: 'lens', skin: 'default' } }, 403, 'forbidden', bot.client);
});

test('a library icon no `icon` line names is refused with words; a hue as text is refused', async () => {
  const r = await write('lens', [
    { type: 'node', node: { region: 'flow', kind: 'topic', title: 'Mine', icon: 'x-encoder' }, key: 'lens-2' },
  ]);
  assert.match(JSON.stringify(r.results), /not in the icon library/);
  const cards = h.ledger.state().nodes.size;
  const text = await write('lens', [{ type: 'node', node: { region: 'flow', kind: 'topic', title: 'T', tone: '210' }, key: 'lens-3' }]);
  assert.match(JSON.stringify(text.results), /tone/);
  assert.equal(h.ledger.state().nodes.size, cards, 'nothing drawn');
});

test('mark_seen takes a container with the head it saw', async () => {
  const head = h.ledger.state().seq;
  const seen = await h.ok('mark_seen', { board: 'pricing', body: { board: 'pricing', region: 'options', head } });
  assert.deepEqual([seen.type, seen.region, seen.head], ['seen', 'options', head]);
  await h.fails('mark_seen', { board: 'pricing', body: { board: 'pricing', region: 'nowhere', head } }, 422, 'invalid');
});

test('Ask now: an `ask` naming a note by its seq, with its context; the ✓ that waits is not sent', async () => {
  const { d } = h.seeded;
  const note = await h.ok('act', { board: 'pricing', body: { type: 'act', action: 'comment', n: d, ver: 1, text: 'Which price?' } });
  const ask = await h.ok('act', { board: 'pricing', body: { type: 'act', action: 'ask', board: 'pricing', lines: [note.seq], context: 'board' } });
  assert.deepEqual([ask.action, ask.lines, ask.context], ['ask', [note.seq], 'board']);
  const s = h.ledger.state();
  assert.equal(s.lastSend.get('pricing'), undefined, 'an ask is not a Send');
  await h.fails('act', { board: 'pricing', body: { type: 'act', action: 'ask', board: 'pricing', lines: [note.seq], context: 'board' } }, 422, 'invalid');
});

test('an ask ends an agent\'s check_responses wait, as a Send does', async () => {
  const note = await h.ok('act', { board: 'pricing', body: { type: 'act', action: 'comment', board: 'pricing', region: 'options', text: 'Two options only?' } });
  const head = h.ledger.state().seq;
  const t = Date.now();
  const waiting = h.ok('check_responses', { board: 'pricing', after: head, wait: 20 });
  await new Promise((r) => setTimeout(r, 200));
  await h.ok('act', { board: 'pricing', body: { type: 'act', action: 'ask', board: 'pricing', lines: [note.seq], context: 'node' } });
  const got = await waiting;
  assert.ok(Date.now() - t < 10_000, 'woken, not timed out');
  assert.deepEqual(got.responses.map((e: { action: string; context?: string }) => [e.action, e.context]), [['ask', 'node']]);
});
