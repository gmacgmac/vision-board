// An app card's saved panel state over the API (D-050, api.md 157, apps.md § Saving the
// panel's state): the page saves and reads a card's value by its board number; the server keeps it by
// the card's identity in `.visionboard/app-state/`, written whole, checked both ways. The person's
// alone: an agent is refused, and no agent read shows it or moves for it. Every guard: not JSON, over
// the limit, not fitting, an unknown board or card, a card that isn't an app card, a removed card (its
// file kept), a card now naming another app, a bad file, a link out, a foreign Origin or Host, and app
// cards off; openapi.json marks both the person's. On board `pricing` a card's number is not its
// identity, so every translation is checked.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { NodeEvent } from '#format';
import { APP_LIMITS, APP_STATE_DIR, APP_STATE_FORMAT, boardNumber } from '#format';
import type { Harness } from './api-harness.ts';
import { AGENT, startBoard } from './api-harness.ts';
import { raw } from './app-support.ts';
import type { Rec } from './openapi-ajv.ts';
import { deref, ops } from './openapi-ajv.ts';

let h: Harness;
/** The app cards drawn for these tests: their number on `pricing` and their identity. */
const cards: Record<string, { n: number; id: number }> = {};

/** Draw an app card naming `app` on `pricing` (or a new version of card `id`). */
function drawApp(app: string, id?: number): { n: number; id: number } {
  const e = h.ledger.append({ type: 'node', board: 'pricing', ...(id !== undefined && { n: id }), node: { region: 'options', kind: 'app', title: 'Calculator', app: { id: app } } }, AGENT) as NodeEvent;
  return { id: e.id, n: boardNumber(h.ledger.state().index, e.id)! };
}

const dir = () => path.join(h.project, '.visionboard', APP_STATE_DIR);
const fileOf = (id: number) => path.join(dir(), `${id}.json`);
const read = (n: number) => h.ok('get_panel_state', { board: 'pricing', n });
const save = (n: number, state: unknown) => h.ok('put_panel_state', { board: 'pricing', n, body: { state } });

before(async () => {
  h = await startBoard();
  for (const name of ['calc', 'other', 'removed', 'moved', 'bad', 'agent']) cards[name] = drawApp('calculator');
});
after(() => h.close());

test('round trip: nothing saved reads {}; a save answers its bytes, reads back and replaces the one before, kept by identity', async () => {
  const { n, id } = cards.calc!;
  assert.notEqual(n, id, 'the board number and the identity differ, so a slip fails');
  assert.deepEqual(await read(n), {});
  const state = { display: '36', steps: ['12', '*', '3'], é: true };
  assert.deepEqual(await save(n, state), { bytes: Buffer.byteLength(JSON.stringify(state)) });
  assert.deepEqual(await read(n), { state });
  assert.deepEqual(JSON.parse(fs.readFileSync(fileOf(id), 'utf8')), { v: APP_STATE_FORMAT, app: 'calculator', state });
  for (const next of [null, 0, 'text', [1, [2]], false]) {
    await save(n, next);
    assert.deepEqual(await read(n), { state: next }, 'any JSON value, the latest wins');
  }
  assert.deepEqual(fs.readdirSync(dir()), [`${id}.json`], 'named by identity, not number; no temp file left behind');
});

test('person only: an agent is refused on both, the ledger gets no line, and no agent read shows the state or moves', async () => {
  const { n } = cards.agent!;
  const agent = await h.join('State reader');
  const drop = ({ head: _head, ...rest }: any) => rest;
  const agentSide = async () => {
    const { view: { version: _v, ...view }, ...board } = drop(await h.ok('get_board', { board: 'pricing' }, { as: agent.client }));
    return {
      board: { ...board, view }, node: drop(await h.ok('show_node', { board: 'pricing', n, linked: true }, { as: agent.client })),
      box: drop(await h.ok('show_container', { board: 'pricing', region: 'options' }, { as: agent.client })),
      open: drop(await h.ok('list_open', { board: 'pricing' }, { as: agent.client })), boards: (await h.ok('list_boards', {}, { as: agent.client })).boards,
      responses: (await h.ok('check_responses', { board: 'pricing', after: 0 }, { as: agent.client })).responses,
    };
  };
  const before = await agentSide();
  const head = h.ledger.state().seq;
  await save(n, { secret: 'only-the-person-sees-this' });
  assert.equal(h.ledger.state().seq, head, 'a save writes no ledger line');
  const now = await agentSide();
  assert.deepEqual(now, before);
  assert.doesNotMatch(JSON.stringify(now), /only-the-person-sees-this/);
  await h.fails('get_panel_state', { board: 'pricing', n }, 403, 'forbidden', agent.client);
  await h.fails('put_panel_state', { board: 'pricing', n, body: { state: 1 } }, 403, 'forbidden', agent.client);
  await h.fails('get_panel_state', { board: 'pricing', n }, 403, 'forbidden', h.client);
  assert.deepEqual(await read(n), { state: { secret: 'only-the-person-sees-this' } }, 'the refused write changed nothing');
});

test(`the limit: ${APP_LIMITS.stateBytes} bytes of compact JSON are saved, one more is too-large; bodies not JSON or not fitting are refused`, async () => {
  const { n, id } = cards.other!;
  const fill = (bytes: number) => 'x'.repeat(bytes - 2); // a JSON string's quotes are 2 bytes
  assert.deepEqual(await save(n, fill(APP_LIMITS.stateBytes)), { bytes: APP_LIMITS.stateBytes });
  const kept = fs.readFileSync(fileOf(id), 'utf8');
  const over = await h.fails('put_panel_state', { board: 'pricing', n, body: { state: fill(APP_LIMITS.stateBytes + 1) } }, 413, 'too-large');
  assert.match(over.detail, new RegExp(`${APP_LIMITS.stateBytes + 1} bytes of JSON and the most a panel may save is ${APP_LIMITS.stateBytes}`));
  await h.fails('put_panel_state', { board: 'pricing', n, body: { state: fill(4 * APP_LIMITS.stateBytes) } }, 413, 'too-large');
  await h.fails('put_panel_state', { board: 'pricing', n, body: {} }, 422, 'invalid');
  await h.fails('put_panel_state', { board: 'pricing', n, body: { state: 1, app: 'other' } }, 422, 'invalid');
  const route = `/api/boards/pricing/nodes/${n}/panel-state`;
  const cookie = { Cookie: h.cookie };
  const text = await raw(h.base, route, { method: 'PUT', headers: { ...cookie, 'Content-Type': 'text/plain' }, body: '{"state":1}' });
  const notJson = await raw(h.base, route, { method: 'PUT', headers: { ...cookie, 'Content-Type': 'application/json' }, body: '{"state":' });
  assert.deepEqual([text.status, notJson.status], [415, 400]);
  assert.equal(fs.readFileSync(fileOf(id), 'utf8'), kept, 'a refused save changes nothing');
});

test('which card: an unknown board or card, a card that is not an app card, and a bad number are refused, by board number', async () => {
  const { q } = h.seeded;
  for (const id of ['get_panel_state', 'put_panel_state'] as const) {
    const body = id === 'put_panel_state' ? { body: { state: 1 } } : {};
    await h.fails(id, { board: 'nowhere', n: 1, ...body }, 404, 'not-found');
    await h.fails(id, { board: 'pricing', n: 999, ...body }, 404, 'not-found');
    const plain = await h.fails(id, { board: 'pricing', n: q, ...body }, 404, 'not-found');
    assert.match(plain.detail, new RegExp(`Card ${q} on board "pricing" is not an app card`));
    await h.fails(id, { board: 'pricing', n: 0, ...body }, 400, 'bad-request');
  }
  const word = await raw(h.base, '/api/boards/pricing/nodes/one/panel-state', { headers: { Cookie: h.cookie } });
  assert.equal(word.status, 400);
});

test('a removed card is refused and keeps its file; a card that now names another app reads nothing until it saves', async () => {
  const removed = cards.removed!;
  await save(removed.n, { step: 3 });
  await h.ok('retire_cards', { board: 'pricing', body: { cards: [removed.n] } });
  await h.fails('get_panel_state', { board: 'pricing', n: removed.n }, 404, 'not-found');
  await h.fails('put_panel_state', { board: 'pricing', n: removed.n, body: { state: 1 } }, 404, 'not-found');
  assert.ok(fs.existsSync(fileOf(removed.id)), 'no delete: the file stays');
  const moved = cards.moved!;
  await save(moved.n, { step: 3 });
  drawApp('clip-export', moved.id);
  assert.deepEqual(await read(moved.n), {}, 'the calculator\'s state is not handed to another app');
  await save(moved.n, { clip: 1 });
  assert.deepEqual(await read(moved.n), { state: { clip: 1 } });
  assert.equal(JSON.parse(fs.readFileSync(fileOf(moved.id), 'utf8')).app, 'clip-export');
});

test('a kept file that is not JSON, does not fit, is too big or is a link reads as nothing saved; a folder that leads out takes no save', async () => {
  const { n, id } = cards.bad!;
  const errors = console.error;
  console.error = () => {}; // the server logs each bad file
  try {
    fs.mkdirSync(dir(), { recursive: true });
    for (const text of ['{"v":1,', JSON.stringify({ v: 2, app: 'calculator', state: 1 }), JSON.stringify({ v: 1, app: 'calculator', state: 1, more: 1 }),
      JSON.stringify({ v: 1, app: 'calculator', state: 'x'.repeat(APP_LIMITS.stateBytes) })]) {
      fs.writeFileSync(fileOf(id), text);
      assert.deepEqual(await read(n), {}, text.slice(0, 40));
    }
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'vb-outside-'));
    try {
      fs.writeFileSync(path.join(outside, 'x.json'), JSON.stringify({ v: 1, app: 'calculator', state: 'outside' }));
      fs.rmSync(fileOf(id));
      fs.symlinkSync(path.join(outside, 'x.json'), fileOf(id));
      assert.deepEqual(await read(n), {}, 'a link is not followed');
      fs.rmSync(fileOf(id));
      fs.renameSync(dir(), `${dir()}-moved`);
      fs.symlinkSync(outside, dir());
      assert.deepEqual(await read(n), {}, 'a folder that leads out is not read');
      await h.fails('put_panel_state', { board: 'pricing', n, body: { state: 1 } }, 500, 'server-error');
      assert.deepEqual(fs.readdirSync(outside), ['x.json'], 'nothing written outside');
    } finally {
      fs.rmSync(dir());
      fs.renameSync(`${dir()}-moved`, dir());
      fs.rmSync(outside, { recursive: true, force: true });
    }
  } finally { console.error = errors; }
});

test('a foreign Origin or Host is refused, on reads and saves', async () => {
  const route = `/api/boards/pricing/nodes/${cards.calc!.n}/panel-state`;
  const json = { Cookie: h.cookie, 'Content-Type': 'application/json' };
  const origin = await raw(h.base, route, { method: 'PUT', headers: { ...json, Origin: 'http://elsewhere.example' }, body: '{"state":1}' });
  const host = await raw(h.base, route, { headers: { Cookie: h.cookie, Host: 'elsewhere.example' } });
  assert.deepEqual([origin.status, host.status], [403, 403]);
  assert.notDeepEqual(await read(cards.calc!.n), { state: 1 });
});

test('app cards off on the server: both answer not-found', async () => {
  const off = await startBoard({ flags: { appCards: false } });
  try {
    const e = off.ledger.append({ type: 'node', board: 'pricing', node: { region: 'options', kind: 'app', title: 'Calculator', app: { id: 'calculator' } } }, AGENT) as NodeEvent;
    const n = boardNumber(off.ledger.state().index, e.id)!;
    await off.fails('get_panel_state', { board: 'pricing', n }, 404, 'not-found');
    await off.fails('put_panel_state', { board: 'pricing', n, body: { state: 1 } }, 404, 'not-found');
  } finally { await off.close(); }
});

test('the panel state operations (D-050, api.md 157): the person only, never an agent tool, at one card path', () => {
  const op = (id: string) => ops.find((o) => o.id === id)!;
  for (const id of ['get_panel_state', 'put_panel_state']) {
    assert.deepEqual([op(id).op['x-agent'], op(id).op.security, op(id).path], [false, [{ personCookie: [] }], '/api/boards/{board}/nodes/{n}/panel-state'], id);
    const codes = Object.fromEntries(Object.entries<Rec>(op(id).op.responses).filter(([s]) => /^[45]/.test(s))
      .map(([s, r]) => [s, String(deref(r).content['application/problem+json'].example.type).split('/').pop()]));
    assert.equal(codes[403], 'forbidden', id);
    assert.equal(codes[404], 'not-found', id);
  }
  assert.equal(String(deref(op('put_panel_state').op.responses['413']).content['application/problem+json'].example.type).split('/').pop(), 'too-large');
});
