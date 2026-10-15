// The read operations end to end (api.md 31-36, 41-44, 54): a real server, every call through
// packages/client, every answer's status, headers and body checked against openapi.json.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import type { Harness } from './api-harness.ts';
import { AGENT, PERSON, startBoard } from './api-harness.ts';
import { checkAnswer } from './openapi-ajv.ts';

let h: Harness;
before(async () => { h = await startBoard(); });
after(() => h.close());

const head = () => h.ledger.state().seq;

test('list_boards: every board with its own last seq, and head', async () => {
  const r = await h.ok('list_boards');
  assert.equal(r.head, head());
  const pricing = r.boards.find((b: any) => b.board === 'pricing');
  const roadmap = r.boards.find((b: any) => b.board === 'roadmap');
  // The seed ends: pricing node v2, a comment on roadmap node 1, a grant request on the roadmap.
  assert.deepEqual(pricing, { board: 'pricing', title: 'Pricing options', seq: h.seeded.request - 2 });
  assert.equal(roadmap.seq, h.seeded.request);
});

test('get_board: the view, the person\'s answers, the versions and head; sizes only when set', async () => {
  const pricing = await h.ok('get_board', { board: 'pricing' });
  assert.equal(pricing.head, head());
  assert.equal(pricing.view.session, 'pricing');
  assert.deepEqual(pricing.versions, { [h.seeded.q]: 2, [h.seeded.d]: 1 });
  assert.deepEqual(pricing.state.sizes, { [h.seeded.q]: 's' });
  assert.equal(pricing.state.items[h.seeded.d].status, 'later');
  const roadmap = await h.ok('get_board', { board: 'roadmap' });
  assert.equal('sizes' in roadmap.state, false);
  assert.equal(roadmap.view.nodes.length, 17);
});

test('get_board: open grant requests with the agent\'s label, and each region\'s holders; left out when empty', async () => {
  const pricing = await h.ok('get_board', { board: 'pricing' });
  assert.deepEqual(pricing.holders, { options: [{ agent: 'a-k3m9x2pq', label: 'Pricing chat', creator: true }] });
  assert.equal('requests' in pricing, false);
  const roadmap = await h.ok('get_board', { board: 'roadmap' });
  // The roadmap's regions were written by v2 lines, so nobody holds them; the seed asked for review.
  assert.equal('holders' in roadmap, false);
  assert.deepEqual(roadmap.requests.map((r: any) => [r.seq, r.region, r.agent, r.label, r.reason]), [
    [h.seeded.request, 'review', 'a-k3m9x2pq', 'Pricing chat', 'I need to update the review items.']]);
});

test('show_node: every version, note, reply, proposal and link; linked=true adds the linked nodes', async () => {
  const { q, d, comment, propose } = h.seeded;
  const r = await h.ok('show_node', { board: 'pricing', n: q });
  // The agent answered q's comment, so q is open again (D-045: a note never answers a card).
  assert.deepEqual([r.n, r.board, r.region, r.status, r.size, r.seen], [q, 'pricing', 'options', 'open', 's', 1]);
  assert.deepEqual(r.versions.map((v: any) => [v.ver, v.agent, v.node.title]), [
    [1, 'a-k3m9x2pq', 'Flat fee or per seat?'], [2, 'a-k3m9x2pq', 'Flat fee or per seat? (with the numbers)']]);
  assert.deepEqual(r.notes.map((x: any) => x.text), ['Why per seat?']);
  assert.deepEqual(r.replies.map((x: any) => x.to), [comment]);
  assert.deepEqual(r.proposals.map((x: any) => x.seq), [propose]);
  assert.deepEqual(r.links, [{ from: q, to: d, label: 'blocks' }]);
  assert.equal('linked' in r, false);
  assert.equal('park' in r, false);
  const withLinked = await h.ok('show_node', { board: 'pricing', n: q, linked: true });
  assert.deepEqual(withLinked.linked.map((x: any) => [x.n, x.status]), [[d, 'later']]);
  // A number names a card on the board in the path: pricing's card 1 is not roadmap's (api.md 125).
  assert.notEqual((await h.ok('show_node', { board: 'roadmap', n: q })).versions[0].node.title, r.versions[0].node.title);
  await h.fails('show_node', { board: 'pricing', n: 999 }, 404, 'not-found');
});

test('show_container: the region as stored, its holders and every node it has held', async () => {
  const r = await h.ok('show_container', { board: 'pricing', region: 'options' });
  assert.deepEqual(r.region, { id: 'options', title: 'Options', mode: 'grid', columns: 2 });
  assert.deepEqual(r.holders, ['a-k3m9x2pq']);
  assert.deepEqual(r.nodes.map((x: any) => x.n), [h.seeded.q, h.seeded.d]);
  // A region written by a v2 line has no holder (api.md 23).
  const review = await h.ok('show_container', { board: 'roadmap', region: 'review' });
  assert.deepEqual([review.holders, review.nodes.map((x: any) => x.n)], [[], [1, 2, 3]]);
  await h.fails('show_container', { board: 'pricing', region: 'nope' }, 404, 'not-found');
});

test('list_open: open cards and cards owed an answer, with pending and unseen only when they apply', async () => {
  const { q, d } = h.seeded;
  const pricing = await h.ok('list_open', { board: 'pricing' });
  assert.equal(pricing.head, head());
  // q's comment has a reply, so nothing is owed on it, and q is open: a note never answers a card
  // (D-045); its version 2 is unseen. d waits for a park bundle, and saving it for later counted as
  // seeing it (api.md 94).
  assert.deepEqual(pricing.items.map((x: any) => [x.n, x.ver, x.status, x.pending, x.unseen]), [
    [q, 2, 'open', undefined, true], [d, 1, 'later', 'later', undefined]]);
  const roadmap = await h.ok('list_open', { board: 'roadmap' });
  assert.deepEqual(roadmap.items.find((x: any) => x.n === 1).pending, 'comment');
  assert.equal(roadmap.items.some((x: any) => x.n === 7), false, 'a topic nobody asked about is not open');
});

test('check_responses: the person\'s acts after `after` in card order, cut by `limit` in ledger order with `more`', async () => {
  const { comment, later, q, d } = h.seeded;
  const all = await h.ok('check_responses', { board: 'pricing' });
  // Sorted by card number (api.md 120): q's comment and size, then d's later; the ledger has later before size.
  assert.ok(q < d);
  assert.deepEqual(all.responses.map((e: any) => [e.action, e.n]), [['comment', q], ['size', q], ['later', d]]);
  assert.equal(all.head, head());
  assert.equal('more' in all, false);
  const first = await h.ok('check_responses', { board: 'pricing', limit: 2 });
  assert.deepEqual([first.responses.map((e: any) => e.seq), first.more], [[comment, later], true], 'the first two lines, then sorted');
  const rest = await h.ok('check_responses', { board: 'pricing', after: Math.max(...first.responses.map((e: any) => e.seq)) });
  assert.deepEqual(rest.responses.map((e: any) => e.action), ['size'], 'the next page starts after the highest seq');
  const none = await h.ok('check_responses', { board: 'pricing', after: head() });
  assert.deepEqual(none, { responses: [], head: head() });
});

test('read_ledger: every line after `after`, `limit` and `more`, one board, and JSON Lines', async () => {
  const all = await h.ok('read_ledger', { limit: 500 });
  assert.deepEqual(all.events.map((e: any) => e.seq), h.ledger.events().map((e) => e.seq));
  assert.equal(all.head, head());
  const ten = await h.ok('read_ledger', { after: 5, limit: 10 });
  assert.deepEqual([ten.events[0].seq, ten.events.length, ten.more], [6, 10, true]);
  const pricing = await h.ok('read_ledger', { board: 'pricing', limit: 500 });
  // The join names no board; the reply, seen and size lines are matched through their node.
  assert.ok(pricing.events.every((e: any) => e.type !== 'join' && (e.board ?? 'pricing') === 'pricing'));
  assert.ok(pricing.events.some((e: any) => e.type === 'reply'));
  assert.equal(pricing.events.length, 12);
  const lines = await h.ok('read_ledger', { after: 36, limit: 3 }, { accept: 'application/jsonl' });
  assert.equal(h.last().media, 'application/jsonl');
  assert.deepEqual(lines.map((e: any) => e.seq), [37, 38, 39]);
  await h.fails('read_ledger', { board: 'nope' }, 404, 'not-found');
});

test('check_responses wait: a timed-out wait answers { responses: [], head }', async () => {
  const start = Date.now();
  const r = await h.ok('check_responses', { board: 'pricing', after: head(), wait: 1 });
  assert.ok(Date.now() - start >= 900, `${Date.now() - start} ms`);
  assert.deepEqual(r, { responses: [], head: head() });
});

test('check_responses wait: the person pressing Send ends the wait with every act since `after`', async () => {
  const from = head();
  const start = Date.now();
  const waiting = h.ok('check_responses', { board: 'roadmap', after: from, wait: 10 });
  await new Promise((r) => setTimeout(r, 200));
  // A comment alone does not end the wait; Send does.
  h.ledger.append({ type: 'act', action: 'comment', n: 2, ver: 1, text: 'Is D-002 still right?' }, PERSON);
  await new Promise((r) => setTimeout(r, 200));
  const send = await h.ok('act', { board: 'roadmap', body: { type: 'act', action: 'send', board: 'roadmap' } });
  const r = await waiting;
  assert.ok(Date.now() - start < 5000);
  assert.deepEqual(r.responses.map((e: any) => e.action), ['comment', 'send']);
  assert.deepEqual([r.responses[1].seq, r.head], [send.seq, head()]);
  // Send is already there for the same cursor, so a second wait answers at once.
  const again = Date.now();
  await h.ok('check_responses', { board: 'roadmap', after: from, wait: 10 });
  assert.ok(Date.now() - again < 1000);
});

test('check_responses wait: answering a grant request ends the wait', async () => {
  const from = head();
  const waiting = h.ok('check_responses', { board: 'roadmap', after: from, wait: 10 });
  await new Promise((r) => setTimeout(r, 200));
  await h.ok('act', { board: 'roadmap', body: { type: 'act', action: 'deny', request: h.seeded.request, text: 'Not yet.' } });
  const r = await waiting;
  assert.deepEqual(r.responses.map((e: any) => [e.action, e.request]), [['deny', h.seeded.request]]);
});

test('act and mark_seen: one stored line each, 201', async () => {
  const e = await h.ok('act', { board: 'pricing', body: { type: 'act', action: 'ack', n: h.seeded.d, ver: 1 } });
  assert.deepEqual([e.type, e.by, e.action, e.seq], ['act', 'person', 'ack', head()]);
  assert.equal(h.last().status, 201);
  const mode = await h.ok('act', { board: 'pricing', body: { type: 'act', action: 'mode', board: 'pricing', region: 'options', mode: 'column' } });
  assert.equal(mode.mode, 'column');
  const seen = await h.ok('mark_seen', { board: 'pricing', body: { n: h.seeded.q, ver: 2 } });
  assert.deepEqual([seen.type, seen.n, seen.ver, seen.by], ['seen', h.seeded.q, 2, 'person']);
  const node = await h.ok('show_node', { board: 'pricing', n: h.seeded.q });
  assert.equal(node.seen, 2);
  const open = await h.ok('list_open', { board: 'pricing' });
  assert.deepEqual(open.items.map((x: any) => [x.n, x.status, x.unseen]), [[h.seeded.q, 'open', undefined]],
    'd acknowledged; q still asks (its comment was answered, D-045), and its version 2 is seen now');
});

test('mark_seen for a board (api.md 87): stored with board and head, it moves no head; another board, a mixed body or a line not yet written is refused', async () => {
  const seqOf = async () => (await h.ok('list_boards')).boards.find((b: any) => b.board === 'pricing').seq;
  const before = await seqOf();
  const seen = await h.ok('mark_seen', { board: 'pricing', body: { board: 'pricing', head: before } });
  assert.deepEqual([h.last().status, seen.type, seen.board, seen.head, seen.by], [201, 'seen', 'pricing', before, 'person']);
  assert.equal(h.ledger.state().seenBoards.get('pricing'), before);
  assert.equal(await seqOf(), before, 'the person looking is not a change to the board');
  await h.fails('mark_seen', { board: 'pricing', body: { board: 'roadmap', head: 1 } }, 422, 'invalid');
  await h.fails('mark_seen', { board: 'pricing', body: { board: 'pricing', head: 1, n: h.seeded.q, ver: 1 } }, 422, 'invalid');
  await h.fails('mark_seen', { board: 'pricing', body: { board: 'pricing', head: head() + 5 } }, 422, 'invalid');
});

test('watch_board: server-sent change events with { seq }', async () => {
  const stop = new AbortController();
  const res = await fetch(`${h.base}/api/boards/pricing/events`, { signal: stop.signal });
  checkAnswer('watch_board', { status: res.status, headers: res.headers, media: 'text/event-stream', body: undefined });
  const reader = res.body!.getReader();
  const text = async () => new TextDecoder().decode((await reader.read()).value);
  assert.match(await text(), /^retry: 2000/);
  const e = h.ledger.append({ type: 'reply', n: h.seeded.qId, text: 'Numbers added.' }, AGENT);
  assert.equal(await text(), `event: change\ndata: {"seq":${e.seq}}\n\n`);
  stop.abort();
});
