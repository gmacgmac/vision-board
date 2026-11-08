// The engine's switches (docs/specification/plugin.md § The engine, § The bot; plugin-contract PLAN decisions 3 and 4):
// `singleAgent` makes every agent caller the folder's one agent (no sign-up, ids never compared or stored, no grants, no
// scoping) and leaves the lock, read-only and the person's acts alone; `followOtherWriters` off never looks at the file for
// another writer. Each switch at its default is what every other engine test runs under.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { FlagOverrides } from '#format';
import { FLAGS, ledgerFiles } from '#format';
import { makeTempDir } from '#format/testing';
import type { Caller, Engine, EngineOptions } from '../server/engine/index.ts';
import { createEngine } from '../server/engine/index.ts';
import { openLedger } from '../server/ledger.ts';

const ROOT = path.resolve(import.meta.dirname, '../../..');
const PERSON: Caller = { by: 'person' };
/** A host's derived id: no sign-up made it, and the ledger's own agent ids never take its shape. */
const BOT: Caller = { by: 'agent', agent: 'bot-0123456789abcdef' };
const ONE: FlagOverrides = { singleAgent: true };
const dirs: string[] = [];
after(() => { for (const d of dirs) fs.rmSync(d, { recursive: true, force: true }); });

function folder(): string {
  const dir = makeTempDir('vb-switches-');
  dirs.push(dir);
  return dir;
}

const open = (dir: string, flags: FlagOverrides = {}, more: Partial<EngineOptions> = {}): Engine =>
  createEngine({ dir, name: () => 'The host\'s folder', warn: () => {}, flags, ...more });

/** A tool's answer: its JSON (a refusal's words as `text`), and whether it was an error. */
async function call(engine: Engine, name: string, input: Record<string, unknown>, caller: Caller = BOT): Promise<{ isError: boolean; body: any }> {
  const out = await engine.tools.call(name, input, { caller });
  return { isError: out.isError === true, body: out.structuredContent ?? { text: out.content[0]?.text } };
}

/** The person's act on `board`, which must go. */
async function person(engine: Engine, board: string, body: Record<string, unknown>): Promise<void> {
  const r = await engine.route({ method: 'POST', path: `boards/${board}/act`, body: { type: 'act', ...body } }, { caller: PERSON });
  assert.ok(r && r.status < 300, JSON.stringify(r?.body));
}

/** An agent registered through `POST agents`, as standalone's and a host's with `singleAgent` off. */
async function join(engine: Engine, label: string): Promise<Caller> {
  const r = await engine.route({ method: 'POST', path: 'agents', body: { label } });
  return { by: 'agent', agent: (r!.body as { agent: string }).agent };
}

const head = (engine: Engine): number => engine.ledger.state().seq;
const joins = (engine: Engine) => engine.ledger.events().filter((e) => e.type === 'join');
/** The agents the agent lines were written as, joins aside. */
const writers = (engine: Engine): string[] =>
  [...new Set(engine.ledger.events().flatMap((e) => (e.by === 'agent' && e.type !== 'join' ? [e.agent!] : [])))];
/** A problem's code, from its `type`. */
const codeOf = (p: { type?: unknown } | undefined): string | undefined => (p?.type === undefined ? undefined : String(p.type).split('/').pop());

/** Board `plans` with container `now` and cards 1 and 2, drawn by `caller`. */
const PLANS = [
  { type: 'board', title: 'Plans', key: 'plans' },
  { type: 'region', region: { id: 'now', title: 'Now', mode: 'grid' }, key: 'now' },
  { type: 'node', node: { region: 'now', kind: 'question', title: 'Ship on Friday?' }, key: 'friday' },
  { type: 'node', node: { region: 'now', kind: 'question', title: 'Who reviews?' }, key: 'review' },
];

/** Every server file the engine reaches through its own imports (not the packages'). */
function engineSources(): string[] {
  const seen = new Set<string>();
  const walk = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const m of fs.readFileSync(file, 'utf8').matchAll(/from '(\.{1,2}\/[^']+\.ts)'/g)) walk(path.resolve(path.dirname(file), m[1]!));
  };
  walk(path.join(ROOT, 'apps/board/server/engine/index.ts'));
  return [...seen];
}

test('every flag the engine reads is in the spec, at the default FLAGS gives it, and the spec names no other', () => {
  const read = new Set(engineSources().flatMap((f) => [...fs.readFileSync(f, 'utf8').matchAll(/flagOn\('(\w+)'/g)].map((m) => m[1]!)));
  const spec = fs.readFileSync(path.join(ROOT, 'docs/specification/plugin.md'), 'utf8');
  const section = spec.slice(spec.indexOf('\n## The engine'), spec.indexOf('\n## The bot'));
  const rows = new Map([...section.matchAll(/^\| `(\w+)` \| (on|off) \|/gm)].map((m) => [m[1]!, m[2] === 'on']));
  assert.ok(read.has('singleAgent') && read.has('followOtherWriters'), 'the walk reaches the switches');
  assert.deepEqual([...rows.keys()].sort(), [...read].sort());
  for (const [name, on] of rows) assert.equal(on, (FLAGS as Record<string, { default: boolean }>)[name]!.default, name);
});

/** A ledger on `dir` that counts how often it is followed (looked at for another writer). */
function counted(dir: string) {
  const ledger = openLedger(ledgerFiles(dir).ledger, () => {});
  const follow = ledger.follow;
  let follows = 0;
  Object.assign(ledger, { follow: () => { follows++; return follow(); } });
  return { ledger, follows: () => follows };
}

const until = async (ok: () => boolean, ms = 3_000) => {
  for (const end = Date.now() + ms; !ok() && Date.now() < end;) await new Promise((r) => setTimeout(r, 20));
  return ok();
};

test('followOtherWriters off: watch and a held read never look at the file; the engine\'s own writes still reach watch and wake the read, and another writer\'s lines are read in at the next call', async () => {
  const dir = folder();
  const { ledger, follows } = counted(dir);
  const engine = open(dir, { followOtherWriters: false }, { ledger });
  const other = open(dir);
  const bot = await join(engine, 'Bot');
  const heard: { board?: string; head: number }[] = [];
  const stop = engine.watch((c) => heard.push(c));
  assert.equal((await call(engine, 'write_board', { board: 'plans', items: PLANS }, bot)).isError, false);
  assert.equal(heard.at(-1)?.head, head(engine), 'its own writes reach watch');
  const before = heard.length;
  await person(other, 'plans', { action: 'comment', n: 1, ver: 1, text: 'Why Friday?' });
  await new Promise((r) => setTimeout(r, 600));
  assert.equal(heard.length, before, 'another writer is not heard while nothing calls');
  await engine.route({ method: 'GET', path: 'boards' }, { caller: PERSON });
  assert.equal(heard.length, before + 1, 'read in, and said, at the next call');
  const since = head(engine);
  const started = Date.now();
  const held = engine.route({ method: 'GET', path: 'boards/plans/responses', query: new URLSearchParams({ after: String(since), wait: '20' }) }, { caller: bot });
  await person(engine, 'plans', { action: 'send', board: 'plans' });
  assert.equal((await held)!.status, 200);
  assert.ok(Date.now() - started < 5_000, 'its own Send wakes the held read');
  stop();
  assert.equal(follows(), 0, 'never followed');
});

test('followOtherWriters on (the default): watch follows the file and hears another writer with no call', async () => {
  const dir = folder();
  const { ledger, follows } = counted(dir);
  const engine = open(dir, {}, { ledger });
  const bot = await join(engine, 'Bot');
  await call(engine, 'write_board', { board: 'plans', items: PLANS }, bot);
  const heard: number[] = [];
  const stop = engine.watch((c) => heard.push(c.head));
  assert.equal(follows(), 1);
  await person(open(dir), 'plans', { action: 'comment', n: 1, ver: 1, text: 'Why Friday?' });
  assert.ok(await until(() => heard.length === 1), 'heard by the poll');
  stop();
});

test('singleAgent: no sign-up: any non-empty id acts, never checked or stored; the folder\'s agent is joined on the first write, labelled by name(), and not before', async () => {
  const dir = folder();
  const engine = open(dir, ONE);
  assert.equal((await call(engine, 'list_boards', {})).isError, false);
  assert.equal(head(engine), 0, 'a read joins nobody');
  const wrote = await call(engine, 'write_board', { board: 'plans', items: PLANS });
  assert.equal(wrote.isError, false, JSON.stringify(wrote.body));
  assert.ok(wrote.body.results.every((r: { ok: boolean }) => r.ok), JSON.stringify(wrote.body));
  const [joined, ...more] = joins(engine) as { seq: number; agent: string; label: string }[];
  assert.equal(more.length, 0);
  assert.equal(joined!.seq, 1, 'joined just before its first line');
  assert.equal(joined!.label, 'The host\'s folder');
  assert.match(joined!.agent, /^a-[a-z0-9]{8}$/, 'an id of the ledger\'s own');
  assert.deepEqual(writers(engine), [joined!.agent]);
  assert.ok(!fs.readFileSync(ledgerFiles(dir).ledger, 'utf8').includes(BOT.agent), 'the host\'s id is nowhere in the ledger');
  assert.equal(fs.existsSync(ledgerFiles(dir).agents), false, 'nor a secret');
  const at = head(engine);
  for (const caller of [{ by: 'agent' }, { by: 'agent', agent: '' }, { by: 'agent', agent: 7 }]) {
    assert.equal((await call(engine, 'write_board', { board: 'plans', items: [PLANS[2]] }, caller as never)).isError, true, JSON.stringify(caller));
  }
  assert.equal(head(engine), at, 'an agent with no id is still no caller');
  const off = await call(open(folder()), 'write_board', { board: 'plans', items: PLANS });
  assert.ok(!off.body.results?.some((r: { ok: boolean }) => r.ok), 'off, the ledger takes no id it did not make');
});

test('singleAgent: the folder\'s one agent: the first joined, whatever id the caller passes, on any engine over the folder', async () => {
  const dir = folder();
  const plain = open(dir);
  const first = await join(plain, 'First');
  const second = await join(plain, 'Second');
  const engine = open(dir, ONE);
  await call(engine, 'write_board', { board: 'plans', items: PLANS });
  const card = (n: number, title: string) => ({ type: 'node', n, node: { region: 'now', kind: 'question', title } });
  for (const caller of [{ by: 'agent', agent: 'bot-fedcba9876543210' }, second, first] as Caller[]) {
    assert.equal((await call(engine, 'write_board', { board: 'plans', items: [card(1, `By ${caller.by}?`)] }, caller)).isError, false);
  }
  assert.equal((await call(open(dir, ONE), 'write_board', { board: 'plans', items: [card(2, 'Another engine?')] })).isError, false);
  engine.ledger.refresh();
  assert.deepEqual(writers(engine), [(first as { agent: string }).agent], 'every line is the first joined agent\'s');
  assert.equal(joins(engine).length, 2, 'no new join');
});

/** A folder whose first agent (`a`, the one agent with the switch on) holds nothing: `b` drew `plans`, the person made
 * `mine`, and the person's note on card 1 is owed by `b`. */
async function othersBoards() {
  const dir = folder();
  const plain = open(dir);
  const a = await join(plain, 'A');
  const b = await join(plain, 'B');
  await call(plain, 'write_board', { board: 'plans', items: PLANS }, b);
  assert.equal((await plain.route({ method: 'PUT', path: 'boards/mine', body: { title: 'Mine' } }, { caller: PERSON }))?.status, 201);
  await person(plain, 'plans', { action: 'comment', n: 1, ver: 1, text: 'Why Friday?' });
  return { dir, plain, a, b };
}

const NOTE_ON_PLANS = [{ type: 'node', node: { region: 'now', kind: 'note', title: 'From A' } }];
const MINE = [{ type: 'region', region: { id: 'here', title: 'Here' } }, { type: 'node', node: { region: 'here', kind: 'note', title: 'From A' } }];
const RENAME = [{ type: 'board', title: 'Not yours' }];

test('singleAgent: no grants and no scoping: another agent\'s board and the person\'s take writes, request_grant answers held, and every read, mark and answers chip sees every answer', async () => {
  const { dir, plain, a } = await othersBoards();
  const codes = async (engine: Engine, items: unknown[], caller: Caller) =>
    (await call(engine, 'write_board', { board: items === MINE ? 'mine' : 'plans', items }, caller)).body.results.map((r: { problem?: object }) => codeOf(r.problem));
  // Off: A is held to the grants and scoped to what concerns it.
  assert.deepEqual(await codes(plain, NOTE_ON_PLANS, a), ['needs-grant']);
  assert.deepEqual(await codes(plain, MINE, a), ['needs-grant', 'needs-grant']);
  assert.deepEqual(await codes(plain, RENAME, a), ['forbidden'], 'only the creator');
  assert.equal((await call(plain, 'check_responses', { board: 'plans', after: 0 }, a)).body.responses.length, 0);
  assert.equal((await call(plain, 'list_open', { board: 'plans' }, a)).body.items.length, 0);
  assert.equal((await call(plain, 'get_board', { board: 'plans' }, a)).body.held, undefined);
  assert.equal((plain.resolve('answers', { board: 'plans', since: 0, agent: a.by === 'agent' ? a.agent : '' }) as { count: number }).count, 0);
  // On: the one agent, whatever the id.
  const engine = open(dir, ONE);
  const before = head(engine);
  for (const board of ['plans', 'mine']) {
    assert.deepEqual((await call(engine, 'request_grant', { board, reason: 'To draw here.' })).body, { board, held: true });
  }
  assert.deepEqual((await call(engine, 'request_grant', { board: 'plans', region: 'now', reason: 'To draw here.' })).body, { board: 'plans', region: 'now', held: true });
  assert.equal(head(engine), before, 'held, with nothing written');
  assert.deepEqual(await codes(engine, NOTE_ON_PLANS, BOT), [undefined]);
  assert.deepEqual(await codes(engine, MINE, BOT), [undefined, undefined]);
  assert.deepEqual(await codes(engine, RENAME, BOT), ['invalid'], 'no creator refusal (no other agent); a second board line is still no line');
  const responses = (await call(engine, 'check_responses', { board: 'plans', after: 0 })).body.responses;
  assert.ok(responses.some((r: { action: string; n?: number }) => r.action === 'comment' && r.n === 1), JSON.stringify(responses));
  const open1 = (await call(engine, 'list_open', { board: 'plans' })).body.items.find((x: { n: number }) => x.n === 1);
  assert.equal(open1?.pending, 'comment');
  const board = (await call(engine, 'get_board', { board: 'plans' })).body;
  assert.equal(board.held, true);
  assert.equal(board.state.items['1'].notes.at(-1).owed, true, 'the note another agent owed is the one agent\'s');
  assert.ok((await call(engine, 'list_boards', {})).body.boards.every((x: { held?: true }) => x.held), 'every board held');
  assert.ok((engine.resolve('answers', { board: 'plans', since: 0, agent: a.by === 'agent' ? a.agent : '' }) as { count: number }).count > 0, 'the chip holds every answer');
});

test('singleAgent: the lock and the person\'s acts: a locked board and a read-only ledger refuse every write and request_grant, joining nobody; ✓, ✗ and granting stay the person\'s', async () => {
  const dir = folder();
  const engine = open(dir, ONE);
  assert.equal((await engine.route({ method: 'PUT', path: 'boards/mine', body: { title: 'Mine' } }, { caller: PERSON }))?.status, 201);
  await person(engine, 'mine', { action: 'lock', board: 'mine' });
  /** What a write and a grant request answer, through `route`, which gives the problem's code. */
  const refusals = async (on: Engine) => [
    await on.route({ method: 'POST', path: 'boards/mine/write', body: { items: MINE } }, { caller: BOT }),
    await on.route({ method: 'POST', path: 'grants', body: { board: 'mine', reason: 'To draw here.' } }, { caller: BOT }),
  ].map((r) => (r!.status >= 400 ? codeOf(r!.body as { type: string }) : 'went'));
  const before = head(engine);
  assert.deepEqual(await refusals(engine), ['locked', 'locked']);
  assert.equal(head(engine), before, 'nothing written');
  assert.equal(joins(engine).length, 0, 'the lock refuses before anyone joins');
  await person(engine, 'mine', { action: 'unlock', board: 'mine' });
  const closed = open(dir, ONE, { readOnly: () => true });
  assert.deepEqual(await refusals(closed), ['read-only', 'read-only']);
  engine.ledger.refresh();
  assert.equal(joins(engine).length, 0, 'read-only refuses the join too');
  assert.equal((await call(engine, 'write_board', { board: 'mine', items: MINE })).isError, false, 'open and unlocked, it writes');
  await person(engine, 'mine', { action: 'lock', board: 'mine' });
  const at = head(engine);
  assert.deepEqual(await refusals(engine), ['locked', 'locked'], 'with an agent joined, as before');
  assert.equal(head(engine), at);
  await person(engine, 'mine', { action: 'unlock', board: 'mine' });
  const n = (await call(engine, 'write_board', { board: 'mine', items: [{ type: 'node', node: { region: 'here', kind: 'question', title: 'Ship?' } }] })).body.results[0].n;
  await call(engine, 'request_grant', { board: 'mine', reason: 'Asked anyway.' });
  for (const body of [{ action: 'ack', n, ver: 1 }, { action: 'drop', n, ver: 1 }, { action: 'grant', request: 1 }]) {
    const r = await engine.route({ method: 'POST', path: 'boards/mine/act', body: { type: 'act', ...body } }, { caller: BOT });
    assert.equal(r?.status, 403, `${body.action} is the person's`);
  }
});

test('singleAgent: the page\'s ledger read says so (`oneAgent`), so the view takes it from the engine; off, it says nothing', async () => {
  const query = new URLSearchParams({ after: '0' });
  const one = (await open(folder(), ONE).route({ method: 'GET', path: 'ledger', query }, { caller: PERSON }))!;
  assert.equal(one.status, 200);
  assert.equal((one.body as { oneAgent?: true }).oneAgent, true);
  const plain = (await open(folder()).route({ method: 'GET', path: 'ledger', query }, { caller: PERSON }))!;
  assert.equal('oneAgent' in (plain.body as object), false);
});
