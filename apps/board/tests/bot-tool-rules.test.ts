// The rules a bot must keep, held by the tools, and the facts it needs, given by the reads (bot-quality TOOLS_01, the
// `botToolRules` flag; plugin skill live run findings 1, 4, 6a and "caught beyond the brief"): a host's bot has no
// `wait` on `check_responses` and one is refused at once; the MCP server tells a host's bot the plugin's instructions;
// `get_board`, `show_node` and `show_container` mark the notes the caller owes, `list_boards` and `get_board` the boards
// it holds; a key conflict says what the key holds and names a free one. Flag off, each is as before.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { FlagOverrides } from '#format';
import { FIXTURES_DIR, TOOLS_FILE } from '#format/files';
import { makeTempDir } from '#format/testing';
import { createMcpServer, INSTRUCTIONS, INSTRUCTIONS_JOINED, MODERN } from '#mcp';
import type { Caller, Engine } from '../server/engine/index.ts';
import { createEngine } from '../server/engine/index.ts';
import { inputRefusals } from '../server/words/plugin-tools.ts';
import { checkAnswer } from './openapi-ajv.ts';
import { ledgerFiles } from '#format';

const PERSON: Caller = { by: 'person' };
const OFF: FlagOverrides = { botToolRules: false };
const dirs: string[] = [];
after(() => { for (const d of dirs) fs.rmSync(d, { recursive: true, force: true }); });

function open(flags: FlagOverrides = {}): Engine {
  const dir = makeTempDir('vb-bot-rules-');
  dirs.push(dir);
  fs.copyFileSync(path.join(FIXTURES_DIR, 'roadmap.ledger.jsonl'), ledgerFiles(dir).ledger);
  return createEngine({ dir, name: () => '~/example', warn: () => {}, flags });
}

async function join(engine: Engine, label: string): Promise<Caller> {
  const joined = (await engine.route({ method: 'POST', path: 'agents', body: { label } }))!.body as { agent: string };
  return { by: 'agent', agent: joined.agent };
}

/** A tool's answer, which must have worked. */
async function tool(engine: Engine, name: string, input: Record<string, unknown>, caller: Caller): Promise<any> {
  const out = await engine.tools.call(name, input, { caller });
  assert.equal(out.isError, false, `${name}: ${JSON.stringify(out)}`);
  return out.structuredContent;
}

/** An engine whose bot made board `plans` (container `now`, cards 1 and 2), and another bot that holds nothing on it. */
async function withPlans(flags: FlagOverrides = {}) {
  const engine = open(flags);
  const bot = await join(engine, 'Bot');
  const other = await join(engine, 'Other');
  await tool(engine, 'write_board', { board: 'plans', items: [
    { type: 'board', title: 'Plans', key: 'plans-board' },
    { type: 'region', region: { id: 'now', title: 'Now', mode: 'grid' }, key: 'plans-now' },
    { type: 'node', node: { region: 'now', kind: 'question', title: 'Ship on Friday?' }, key: 'plans-card-friday' },
    { type: 'node', node: { region: 'now', kind: 'question', title: 'Who reviews?' }, key: 'plans-card-review' },
  ] }, bot);
  const act = async (body: Record<string, unknown>) => {
    const r = await engine.route({ method: 'POST', path: 'boards/plans/act', body: { type: 'act', ...body } }, { caller: PERSON });
    assert.ok(r && r.status < 300, JSON.stringify(r?.body));
    return engine.ledger.state().seq;
  };
  return { engine, bot, other, act };
}

test('no holding the turn under a host: check_responses has no `wait`, and a call with one is refused at once, saying the Send brings the answers', async () => {
  const { engine, bot } = await withPlans();
  const listed = engine.tools.list().find((t) => t.name === 'check_responses')!;
  assert.equal('wait' in (listed.inputSchema.properties as object), false, 'the schema a host\'s bot reads has no wait');
  assert.equal((listed.inputSchema as { additionalProperties?: unknown }).additionalProperties, false);
  assert.doesNotMatch(listed.description, /`wait`|hold until/, 'nor do its words offer one');
  assert.match(listed.description, /Send/);
  const started = Date.now();
  const out = await engine.tools.call('check_responses', { board: 'plans', after: 0, wait: 60 }, { caller: bot });
  assert.ok(Date.now() - started < 2_000, 'refused at once, nothing held');
  assert.equal(out.isError, true);
  const text = out.content[0]!.text;
  assert.match(text, /\/wait: /, 'the pointer names the input');
  assert.match(text, /Send/);
  assert.match(text, /end your turn/i);
  assert.ok((await tool(engine, 'check_responses', { board: 'plans', after: 0 }, bot)).head > 0, 'without it, the read answers');
});

test('every input a host\'s bot is not given has the words that refuse it, and no words refuse an input it is given', () => {
  const rows = (JSON.parse(fs.readFileSync(TOOLS_FILE, 'utf8')) as { tools: { name: string; hosts: string[]; inputHosts?: Record<string, string[]> }[] }).tools;
  const limited = rows.filter((r) => r.hosts.includes('plugin'))
    .flatMap((r) => Object.entries(r.inputHosts ?? {}).filter(([, hosts]) => !hosts.includes('plugin')).map(([name]) => `${r.name}.${name}`));
  assert.deepEqual(inputRefusals.map((r) => `${r.tool}.${r.input}`).sort(), limited.sort());
});

test('no holding the turn, flag off: `wait` is listed and holds until the host\'s signal ends it, as before', async () => {
  const { engine, bot } = await withPlans(OFF);
  const listed = engine.tools.list().find((t) => t.name === 'check_responses')!;
  assert.ok('wait' in (listed.inputSchema.properties as object));
  assert.match(listed.description, /`wait` \(0-60 seconds\)/);
  const gone = new AbortController();
  const started = Date.now();
  const held = engine.tools.call('check_responses', { board: 'plans', after: 9999, wait: 60 }, { caller: bot, signal: gone.signal });
  setTimeout(() => gone.abort(), 150);
  assert.equal((await held).isError, false);
  assert.ok(Date.now() - started >= 140, 'it held');
});

test('the right instructions per host: a host\'s bot is told the plugin\'s, with no join, no secret and no wait; standalone\'s are unchanged', async () => {
  const engine = open();
  const said = engine.tools.instructions!;
  assert.ok(said.length > 0);
  for (const word of ['join', 'secret', '`wait`', '60 seconds', 'wait for the answer', 'wrong-folder']) assert.ok(!said.includes(word), `the plugin's instructions say "${word}"`);
  assert.match(said, /never hold your turn/);
  assert.match(said, /Send/);
  assert.match(said, /`write_board`/);
  assert.match(said, /marks `owed`.*marked `answered`/, 'which notes to answer, said positively (TOOLS_02)');
  const server = createMcpServer({ tools: engine.tools });
  const meta = { _meta: { 'io.modelcontextprotocol/protocolVersion': MODERN, 'io.modelcontextprotocol/clientCapabilities': {} } };
  const discover = (await server.handle({ jsonrpc: '2.0', id: 1, method: 'server/discover', params: meta })) as any;
  assert.equal(discover.result.instructions, said);
  const init = (await createMcpServer({ tools: engine.tools }).handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })) as any;
  assert.equal(init.result.instructions, said, 'the legacy handshake too');
  const standalone = (await createMcpServer({ base: 'http://127.0.0.1:1' }).handle({ jsonrpc: '2.0', id: 1, method: 'server/discover', params: meta })) as any;
  assert.equal(standalone.result.instructions, INSTRUCTIONS, 'vb-mcp says what it said');
  assert.equal(open(OFF).tools.instructions, undefined, 'flag off: no instructions of its own');
  const off = (await createMcpServer({ tools: open(OFF).tools }).handle({ jsonrpc: '2.0', id: 1, method: 'server/discover', params: meta })) as any;
  assert.equal(off.result.instructions, INSTRUCTIONS_JOINED, 'flag off: as before');
});

/** Card `n`'s notes in `get_board`, as `[seq, owed]`. */
const notesOf = (board: any, n: number) => (board.state.items[String(n)]?.notes ?? []).map((x: any) => [x.seq, x.owed === true]);

test('reads tell the truth: a note the caller owes is `owed`, from the same rule as list_open\'s `pending`; answered, it is not', async () => {
  const { engine, bot, other, act } = await withPlans();
  const note = await act({ action: 'comment', n: 1, ver: 1, text: 'Friday is too soon.' });
  const onNow = await act({ action: 'comment', board: 'plans', region: 'now', text: 'Split this container.' });
  let board = await tool(engine, 'get_board', { board: 'plans' }, bot);
  assert.deepEqual(notesOf(board, 1), [[note, true]]);
  assert.deepEqual(board.state.containerNotes.now.map((x: any) => [x.seq, x.owed === true]), [[onNow, true]]);
  const open = await tool(engine, 'list_open', { board: 'plans' }, bot);
  assert.deepEqual(open.items.filter((x: any) => x.pending).map((x: any) => x.n), [1], 'list_open agrees');
  assert.deepEqual((await tool(engine, 'show_node', { board: 'plans', n: 1 }, bot)).notes.map((x: any) => x.owed === true), [true]);
  const shown = await tool(engine, 'show_container', { board: 'plans', region: 'now' }, bot);
  assert.deepEqual([shown.notes.map((x: any) => x.owed === true), shown.nodes[0].notes.map((x: any) => x.owed === true)], [[true], [true]]);
  assert.deepEqual(notesOf(await tool(engine, 'get_board', { board: 'plans' }, other), 1), [[note, false]], 'not the other bot\'s to answer');
  await tool(engine, 'write_board', { board: 'plans', items: [
    { type: 'reply', n: 1, to: note, text: 'Monday, then.', key: 'plans-reply-n1' },
    { type: 'reply', n: 2, to: onNow, text: 'Split.', key: 'plans-reply-now' },
  ] }, bot);
  board = await tool(engine, 'get_board', { board: 'plans' }, bot);
  assert.deepEqual(notesOf(board, 1), [[note, false]], 'answered: owed no more, so a bot never answers it twice');
  assert.equal(board.state.containerNotes.now[0].owed, undefined);
  assert.equal((await tool(engine, 'show_node', { board: 'plans', n: 1 }, bot)).notes[0].owed, undefined);
});

/** A note's marks as a read gives them: `[seq, owed, answered]`. */
const marks = (notes: any[]) => notes.map((x) => [x.seq, x.owed === true, x.answered]);

test('reads say what answered a note (TOOLS_02): a reply\'s line, a newer version, or the person\'s ✓ after it; an earlier note, and one not yet answered on another bot\'s card, are neither', async () => {
  const { engine, bot, other, act } = await withPlans();
  const first = await act({ action: 'comment', n: 1, ver: 1, text: 'Friday is too soon.' });
  await act({ action: 'send', board: 'plans' });
  const latest =await act({ action: 'comment', n: 1, ver: 1, text: 'Unless the tests pass.' });
  const onTwo = await act({ action: 'comment', n: 2, ver: 1, text: 'Who is free?' });
  const onNow = await act({ action: 'comment', board: 'plans', region: 'now', text: 'Split this container.' });
  assert.deepEqual(marks((await tool(engine, 'get_board', { board: 'plans' }, other)).state.items['1'].notes),
    [[first, false, undefined], [latest, false, undefined]], 'not yet answered, and not the other bot\'s: neither');
  const wrote = await tool(engine, 'write_board', { board: 'plans', items: [
    { type: 'reply', n: 1, to: latest, text: 'Monday, then.', key: 'plans-reply-n1' },
    { type: 'append', n: 2, text: 'Sam reviews.', key: 'plans-append-n2' },
    { type: 'reply', n: 1, to: onNow, text: 'Split.', key: 'plans-reply-now' },
  ] }, bot);
  const [reply, , nowReply] = wrote.results.map((r: any) => r.seq);
  const byReply = { kind: 'reply', seq: reply };
  const byVersion = { kind: 'version', ver: 2 };
  const nowAnswer = { kind: 'reply', seq: nowReply };
  const board = await tool(engine, 'get_board', { board: 'plans' }, bot);
  assert.deepEqual(marks(board.state.items['1'].notes), [[first, false, undefined], [latest, false, byReply]], 'the latest answered by the reply; the earlier one stood behind it');
  assert.deepEqual(marks(board.state.items['2'].notes), [[onTwo, false, byVersion]]);
  assert.deepEqual(marks(board.state.containerNotes.now), [[onNow, false, nowAnswer]]);
  assert.deepEqual((await tool(engine, 'show_node', { board: 'plans', n: 2 }, bot)).notes[0].answered, byVersion);
  const shown = await tool(engine, 'show_container', { board: 'plans', region: 'now' }, bot);
  assert.deepEqual([shown.notes[0].answered, shown.nodes[0].notes[1].answered], [nowAnswer, byReply]);
  const fits = (id: string, body: unknown) => checkAnswer(id, { status: 200, headers: new Headers(), media: 'application/json', body });
  fits('get_board', board);
  fits('show_container', shown);
  assert.deepEqual((await tool(engine, 'get_board', { board: 'plans' }, other)).state.items['1'].notes[1].answered, byReply, 'answered is a fact for every agent');
  const again = await act({ action: 'comment', n: 2, ver: 2, text: 'And a second reviewer?' });
  assert.deepEqual(marks((await tool(engine, 'get_board', { board: 'plans' }, bot)).state.items['2'].notes)[1], [again, true, undefined], 'owed, until...');
  const check = await act({ action: 'ack', n: 2, ver: 2 });
  assert.deepEqual(marks((await tool(engine, 'get_board', { board: 'plans' }, bot)).state.items['2'].notes),
    [[onTwo, false, byVersion], [again, false, { kind: 'check', seq: check }]], '...the person\'s ✓ after it answers it');
  fits('show_node', await tool(engine, 'show_node', { board: 'plans', n: 2 }, bot));
  const person = (await engine.route({ method: 'GET', path: 'boards/plans' }, { caller: PERSON }))!;
  assert.ok(person.status === 200 && !JSON.stringify(person.body).includes('"answered"'), 'a person\'s read is unmarked');
});

test('reads tell the truth: list_boards and get_board say `held` on a board the caller holds, the board request_grant answers `held` for', async () => {
  const { engine, bot, other } = await withPlans();
  const list = await tool(engine, 'list_boards', {}, bot);
  assert.deepEqual(list.boards.map((b: any) => [b.board, b.held === true]), [['roadmap', false], ['plans', true]]);
  assert.equal((await tool(engine, 'get_board', { board: 'plans' }, bot)).held, true);
  assert.equal((await tool(engine, 'request_grant', { board: 'plans', reason: 'Mine?' }, bot)).held, true, 'the same test');
  assert.equal((await tool(engine, 'get_board', { board: 'plans' }, other)).held, undefined);
  assert.equal((await tool(engine, 'list_boards', {}, other)).boards.some((b: any) => b.held), false);
  const person = (await engine.route({ method: 'GET', path: 'boards' }, { caller: PERSON }))!.body as any;
  assert.equal(person.boards.some((b: any) => 'held' in b), false, 'the person holds no board');
});

test('reads, flag off: no `owed`, no `answered` and no `held`, as before', async () => {
  const { engine, bot, act } = await withPlans(OFF);
  const note = await act({ action: 'comment', n: 1, ver: 1, text: 'Friday is too soon.' });
  await act({ action: 'comment', n: 2, ver: 1, text: 'Who?' });
  await tool(engine, 'write_board', { board: 'plans', items: [{ type: 'reply', n: 1, to: note, text: 'Monday.', key: 'plans-reply-n1' }] }, bot);
  const board = await tool(engine, 'get_board', { board: 'plans' }, bot);
  assert.ok(!JSON.stringify(board).includes('"owed"') && !JSON.stringify(board).includes('"answered"') && !('held' in board));
  assert.ok(!JSON.stringify(await tool(engine, 'list_boards', {}, bot)).includes('"held"'));
  assert.ok(!JSON.stringify(await tool(engine, 'show_node', { board: 'plans', n: 1 }, bot)).includes('"owed"'));
});

/** The problem of the one item of a write that failed. */
async function failedItem(engine: Engine, bot: Caller, item: Record<string, unknown>) {
  const out = await engine.tools.call('write_board', { board: 'plans', items: [item] }, { caller: bot });
  const result = (out.structuredContent as { results: { ok: boolean; problem: { type: string; detail: string } }[] }).results[0]!;
  assert.equal(result.ok, false);
  return result.problem;
}

test('a key conflict helps: it says what the key holds, how to change that card, and names a key not used yet; the same content still replays', async () => {
  const { engine, bot } = await withPlans();
  const card = { type: 'node', node: { region: 'now', kind: 'question', title: 'Ship on Friday?' }, key: 'plans-card-friday' };
  assert.equal((await tool(engine, 'write_board', { board: 'plans', items: [card] }, bot)).results[0].replayed, true, 'a retry is quiet');
  const p = await failedItem(engine, bot, { ...card, node: { ...card.node, title: 'Ship on Monday?' } });
  assert.match(p.type, /\/conflict$/);
  assert.match(p.detail, /card 1 "Ship on Friday\?"/);
  assert.match(p.detail, /`n: 1`/);
  assert.match(p.detail, /"plans-card-friday-2"/);
  await tool(engine, 'write_board', { board: 'plans', items: [{ type: 'reply', n: 1, text: 'Noted.', key: 'plans-card-friday-2' }] }, bot);
  const again = await failedItem(engine, bot, { type: 'reply', n: 2, text: 'Other.', key: 'plans-card-friday-2' });
  assert.match(again.detail, /a reply/);
  assert.match(again.detail, /"plans-card-friday-3"/, 'the first suffix not yet used');
});

test('a key conflict, flag off: the words are as before', async () => {
  const { engine, bot } = await withPlans(OFF);
  const p = await failedItem(engine, bot, { type: 'node', node: { region: 'now', kind: 'question', title: 'Other' }, key: 'plans-card-friday' });
  assert.equal(p.detail, 'The key "plans-card-friday" was used before for different content. Use a new key for new content, or resend the same content to get the first result.');
});
