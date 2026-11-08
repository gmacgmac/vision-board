// The tools (docs/specification/plugin.md § Tools): the built engine's list, every tool called in MCP's shapes with the
// host's bot as caller, and a host's own MCP server over them. No page.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { FOLDER, loadEngine, manifest } from './fake-host/server.ts';
import { drawPlans, expect, test } from './harness.ts';

/** One call for each listed tool, on board `plans`. A new tool stops the test until it has one. */
const CALLS: Record<string, Record<string, unknown>> = {
  list_boards: {},
  get_board: { board: 'plans' },
  show_node: { board: 'plans', n: 1 },
  show_container: { board: 'plans', region: 'now' },
  show_layout: { board: 'plans', region: 'now' },
  list_open: { board: 'plans' },
  check_responses: { board: 'plans', after: 0 },
  request_grant: { board: 'plans', reason: 'To draw here.' },
  write_board: { board: 'plans', items: [{ type: 'node', node: { region: 'now', kind: 'question', title: 'One more?' } }] },
};

test('tools.list: exactly the manifest\'s tools, each with a name, words and a JSON Schema; what a plugin bot must not have is not there', ({ host }) => {
  const listed = host.engine.tools.list();
  expect(listed.map((t) => t.name).sort()).toEqual(manifest().tools.map((t: { name: string }) => t.name).sort());
  const check = new Ajv2020({ strict: false });
  for (const t of listed) {
    expect(typeof t.description).toBe('string');
    expect(() => check.compile(t.inputSchema as object)).not.toThrow();
  }
  const names = listed.map((t) => t.name);
  for (const standalone of ['join', 'read_attachment', 'list_apps']) expect(names).not.toContain(standalone);
  expect(names.sort()).toEqual(Object.keys(CALLS).sort());
  const words = JSON.parse(readFileSync(path.join(FOLDER, manifest().words), 'utf8'));
  for (const t of manifest().tools) expect(words[t.words]).toBe(listed.find((l) => l.name === t.name)!.description);
});

test('tools.call: every listed tool answers in MCP\'s shape, its text the JSON of structuredContent', async ({ host }) => {
  await drawPlans(host);
  for (const [name, input] of Object.entries(CALLS)) {
    const out = await host.engine.tools.call(name, input, { caller: host.bot });
    expect(out.isError, `${name}: ${JSON.stringify(out).slice(0, 300)}`).toBe(false);
    expect(out.content[0]!.type).toBe('text');
    expect(JSON.parse(out.content[0]!.text)).toEqual(out.structuredContent);
  }
});

test('tools.call: an input that does not fit, an unknown tool and a refusal are isError, never a throw', async ({ host }) => {
  await drawPlans(host);
  const bad = await host.engine.tools.call('write_board', { board: 'plans' }, { caller: host.bot });
  expect(bad.isError).toBe(true);
  const unknown = await host.engine.tools.call('join', { label: 'Me' }, { caller: host.bot });
  expect(unknown.isError).toBe(true);
  const noCaller = await host.engine.tools.call('write_board', { board: 'plans', items: [{ type: 'board', title: 'Mine' }] });
  expect(noCaller.isError).toBe(true);
});

test('tools.call: the change line: a board write that wrote carries `_meta[\'plugin/change\']`, its words in the manifest\'s changeWords and words.json; no other tool, and no write that appended nothing', async ({ host }) => {
  await drawPlans(host);
  const m = manifest();
  const words = JSON.parse(readFileSync(path.join(FOLDER, m.words), 'utf8')) as Record<string, string>;
  const write = (items: unknown[]) => host.engine.tools.call('write_board', { board: 'plans', items }, { caller: host.bot });
  const one = await write([{ type: 'node', key: 'more', node: { region: 'now', kind: 'question', title: 'One more?' } }]);
  const change = one._meta!['plugin/change'];
  expect(change).toEqual({ words: 'vision-board.change.card', count: 1, subject: 'plans', reveal: { board: 'plans', cards: [4] } });
  expect(m.changeWords).toContain(change.words);
  expect(words[change.words]!.replace('{subject}', change.subject)).toBe('Changed a card on board “plans”');
  expect(Object.keys(one._meta!), 'only the change line').toEqual(['plugin/change']);
  const two = (await write([{ type: 'node', n: 1, node: { region: 'now', kind: 'question', title: 'Ship on Monday?' } }, { type: 'node', n: 2, node: { region: 'now', kind: 'question', title: 'Who reviews it?' } }]))._meta!['plugin/change'];
  expect(words[two.words]!.replace('{count}', String(two.count)).replace('{subject}', two.subject)).toBe('Changed 2 cards on board “plans”');
  expect((await write([{ type: 'node', key: 'more', node: { region: 'now', kind: 'question', title: 'One more?' } }]))._meta, 'a retry appended nothing').toBeUndefined();
  for (const [name, input] of Object.entries(CALLS).filter(([name]) => name !== 'write_board')) {
    expect((await host.engine.tools.call(name, input, { caller: host.bot }))._meta, name).toBeUndefined();
  }
});

test('tools.call: a caller of an agent with no id is refused as no caller is, and nothing is written', async ({ host }) => {
  await drawPlans(host);
  const head = async () => ((await host.engine.route({ method: 'GET', path: 'ledger', query: new URLSearchParams() }, { caller: { by: 'person' } }))!.body as { head: number }).head;
  const before = await head();
  for (const caller of [{ by: 'agent' }, { by: 'agent', agent: '' }, { by: 'agent', agent: 7 }, { by: 'agent', agent: null }]) {
    const wrote = await host.engine.tools.call('write_board', { board: 'nobodys', items: [{ type: 'board', key: 'x', title: 'Nobody\'s' }] }, { caller: caller as never });
    expect(wrote.isError, JSON.stringify(caller)).toBe(true);
    const asked = await host.engine.tools.call('request_grant', { board: 'plans', reason: 'From nobody.' }, { caller: caller as never });
    expect(asked.isError, JSON.stringify(caller)).toBe(true);
    const put = await host.engine.route({ method: 'POST', path: 'boards/plans/grants', body: { reason: 'From nobody.' } }, { caller: caller as never });
    expect(put === null || put.status >= 400).toBe(true);
  }
  expect(await head(), 'not a line').toBe(before);
  const noCaller = await host.engine.tools.call('write_board', { board: 'nobodys', items: [{ type: 'board', title: 'Nobody\'s' }] });
  const idless = await host.engine.tools.call('write_board', { board: 'nobodys', items: [{ type: 'board', title: 'Nobody\'s' }] }, { caller: { by: 'agent' } as never });
  expect(idless.structuredContent ?? idless.content, 'the same refusal').toEqual(noCaller.structuredContent ?? noCaller.content);
});

test('tools.list: an input\'s words name no folder of the standalone app', ({ host }) => {
  expect(JSON.stringify(host.engine.tools.list())).not.toContain('.visionboard');
});

test('the bot: registered once through route, its id holds on another engine over the same folder', async ({ host }) => {
  await drawPlans(host);
  const byPerson = await host.engine.route({ method: 'POST', path: 'agents', body: { label: 'Through the person' } }, { caller: { by: 'person' } });
  expect(byPerson!.status, 'not through the person\'s door').toBe(403);
  const again = (await loadEngine()).createEngine({ dir: host.dir, warn: () => {} });
  const out = await again.tools.call('write_board', { board: 'plans', items: [{ type: 'node', node: { region: 'now', kind: 'question', title: 'Still mine?' } }] }, { caller: host.bot });
  expect(out.isError, JSON.stringify(out)).toBe(false);
});

test('a host\'s own MCP server: JSON-RPC tools/list and tools/call over the engine, with the caller the host knows', async ({ host }) => {
  await drawPlans(host);
  // The whole of it, as plugin.md § Tools has it: the transport is the host's, and the shapes pass through.
  const serve = async (msg: { id: number; method: string; params?: { name: string; arguments?: Record<string, unknown> } }) => ({
    jsonrpc: '2.0', id: msg.id,
    result: msg.method === 'tools/list' ? { tools: host.engine.tools.list() } : await host.engine.tools.call(msg.params!.name, msg.params!.arguments ?? {}, { caller: host.bot }),
  });
  const listed = await serve({ id: 1, method: 'tools/list' });
  expect((listed.result as { tools: { name: string }[] }).tools.map((t) => t.name)).toContain('write_board');
  const called = await serve({ id: 2, method: 'tools/call', params: { name: 'list_boards' } });
  expect((called.result as { isError: boolean; structuredContent: { boards: unknown[] } }).structuredContent.boards).toHaveLength(1);
});

test.describe('one bot per folder', () => {
  // The host's derived id, which no sign-up made and the ledger's own agent ids never take (plugin.md § The bot).
  test.use({ hostOptions: { flags: { singleAgent: true }, bot: 'bot-0123456789abcdef' } });
  test('the bot: singleAgent: no sign-up, any id acts as the folder\'s one agent, request_grant answers held, and a locked board still refuses', async ({ host }) => {
    await drawPlans(host);
    const grant = await host.tool('request_grant', { board: 'plans', reason: 'To draw here.' });
    expect(grant.isError, JSON.stringify(grant)).toBe(false);
    expect(grant.structuredContent).toEqual({ board: 'plans', held: true });
    const other = await host.engine.tools.call('write_board', { board: 'plans', items: [{ type: 'node', n: 1, node: { region: 'now', kind: 'question', title: 'Another id, the same agent?' } }] }, { caller: { by: 'agent', agent: 'bot-fedcba9876543210' } });
    expect(other.isError, 'ids are never compared').toBe(false);
    const locked = await host.engine.route({ method: 'POST', path: 'boards/plans/act', body: { type: 'act', action: 'lock', board: 'plans' } }, { caller: { by: 'person' } });
    expect(locked!.status).toBeLessThan(300);
    const refused = await host.tool('write_board', { board: 'plans', items: [{ type: 'node', n: 2, node: { region: 'now', kind: 'question', title: 'While locked?' } }] });
    expect(refused.isError, 'the lock still refuses every write').toBe(true);
  });
});
