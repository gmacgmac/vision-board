// The engine seam (docs/specification/plugin.md § The engine and § Tools), on the built folder's engine alone: no page.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { FOLDER, loadEngine, manifest } from './fake-host/server.ts';
import { drawPlans, expect, test } from './harness.ts';

const PERSON = { by: 'person' } as const;
/** A 1 by 1 png. */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==', 'base64');

test('the folder: its parts are where the manifest says; no settings, no icon', () => {
  const m = manifest();
  for (const part of [m.view.module, ...m.view.styles, m.engine.module, m.skill, m.words]) expect(() => readFileSync(path.join(FOLDER, part))).not.toThrow();
  expect({ view: m.view.export, engine: m.engine.export }).toEqual({ view: 'mount', engine: 'createEngine' });
  expect(m).not.toHaveProperty('settings');
  expect(m).not.toHaveProperty('icon');
  const words = JSON.parse(readFileSync(path.join(FOLDER, m.words), 'utf8'));
  for (const key of [m.name, ...m.chips.map((c: { words: string }) => c.words), ...m.tools.map((t: { words: string }) => t.words)]) expect(typeof words[key]).toBe('string');
  expect(m.chips.map((c: { kind: string }) => c.kind).sort()).toEqual(['answers', 'board', 'card', 'note', 'selection']);
});

test('createEngine and the engine hold no more than the spec says: no way round the seam in the folder', async ({ host }) => {
  const mod = await loadEngine();
  expect(Object.keys(mod)).toEqual(['createEngine']);
  expect(Object.keys(host.engine).sort()).toEqual(['image', 'resolve', 'route', 'tools', 'watch']);
  // What only the standalone server passes does nothing here.
  const told: unknown[] = [];
  const engine = mod.createEngine({ dir: host.dir, warn: () => {}, onSend: (...a: unknown[]) => told.push(a) } as never);
  await drawPlans(host);
  await engine.route({ method: 'POST', path: 'boards/plans/act', body: { type: 'act', action: 'send' } }, { caller: PERSON });
  expect(told).toEqual([]);
});

test('route: a person\'s read and write by the caller it is given; null for a path that is not the engine\'s; a problem as a reply', async ({ host }) => {
  await drawPlans(host);
  const boards = await host.engine.route({ method: 'GET', path: 'boards' });
  expect(boards!.status).toBe(200);
  expect((boards!.body as { project: string }).project).toBe('The host\'s folder');
  expect(await host.engine.route({ method: 'GET', path: 'nothing/here' })).toBe(null);
  const made = await host.engine.route({ method: 'PUT', path: 'boards/ideas', body: { title: 'Ideas' } }, { caller: PERSON });
  expect(made!.status).toBe(201);
  const nobody = await host.engine.route({ method: 'PUT', path: 'boards/more', body: { title: 'More' } });
  expect(nobody!.status).toBe(403);
  expect(nobody!.headers!['Content-Type']).toContain('problem+json');
  const byBot = await host.engine.route({ method: 'POST', path: 'boards/plans/act', body: { type: 'act', action: 'ack', n: 1, ver: 1 } }, { caller: host.bot });
  expect(byBot!.status, 'an answer is the person\'s: a bot through route is refused').toBe(403);
  const read = await host.engine.route({ method: 'PUT', path: 'boards/read', body: async () => ({ title: 'Read when asked' }) }, { caller: PERSON });
  expect(read!.status).toBe(201);
});

test('route and tools.call: signal ends a held read', async ({ host }) => {
  await drawPlans(host);
  const gone = new AbortController();
  const started = Date.now();
  const held = host.engine.tools.call('check_responses', { board: 'plans', wait: 60 }, { caller: host.bot, signal: gone.signal });
  setTimeout(() => gone.abort(), 200);
  await held;
  expect(Date.now() - started).toBeLessThan(5_000);
});

test('image: a picture in the images folder and only there, with its headers; a bad path is a refusal', async ({ host }) => {
  mkdirSync(path.join(host.dir, 'images'), { recursive: true });
  writeFileSync(path.join(host.dir, 'images/flow.png'), PNG);
  writeFileSync(path.join(host.dir, 'secret.png'), PNG);
  const ok = host.engine.image({ method: 'GET', path: 'flow.png' });
  expect(ok.status).toBe(200);
  expect(Buffer.isBuffer(ok.body)).toBe(true);
  expect(ok.headers!.ETag).toBeTruthy();
  expect(host.engine.image({ method: 'HEAD', path: 'flow.png' }).body).toBe(null);
  expect(host.engine.image({ method: 'GET', path: 'flow.png', ifNoneMatch: ok.headers!.ETag! }).status).toBe(304);
  expect(host.engine.image({ method: 'GET', path: '../secret.png' }).status).toBeGreaterThanOrEqual(400);
  expect(host.engine.image({ method: 'GET', path: '..%2fsecret.png' }).status).toBeGreaterThanOrEqual(400);
  expect(host.engine.image({ method: 'POST', path: 'flow.png' }).status).toBe(405);
  // The engine reads svgImages from its own flags, so a host that turns it off for the view passes the same here.
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>';
  writeFileSync(path.join(host.dir, 'images/plan.svg'), svg);
  expect(host.engine.image({ method: 'GET', path: 'plan.svg' }).status).toBe(200);
  const off = (await loadEngine()).createEngine({ dir: host.dir, warn: () => {}, flags: { svgImages: false } });
  expect(off.image({ method: 'GET', path: 'plan.svg' }).status).toBeGreaterThanOrEqual(400);
});

test('resolve: every chip kind says its text; a changed or gone one is refused with a reason', async ({ host }) => {
  await drawPlans(host);
  expect(host.engine.resolve('card', { board: 'plans', n: 1, ver: 1 })).toEqual({ where: expect.stringContaining('card 1'), text: 'Ship on Friday?' });
  expect(host.engine.resolve('board', { board: 'plans', head: 1 }).where).toContain('plans');
  expect(host.engine.resolve('selection', { board: 'plans', cards: [1, 2] }).text).toContain('Who reviews?');
  await host.engine.route({ method: 'POST', path: 'boards/plans/act', body: { type: 'act', action: 'ack', n: 1, ver: 1 } }, { caller: PERSON });
  const answers = host.engine.resolve('answers', { board: 'plans', since: 0 });
  expect(answers.text).toContain('1 (question): ✓');
  expect(answers.count).toBe(1);
  expect(host.engine.resolve('answers', { board: 'plans', since: 999 }).text).toBe('');
  await host.engine.route({ method: 'POST', path: 'boards/plans/act', body: { type: 'act', action: 'comment', n: 2, ver: 1, text: 'Ask the team.' } }, { caller: PERSON });
  const lines = (await host.engine.route({ method: 'GET', path: 'ledger', query: new URLSearchParams() }, { caller: PERSON }))!.body as { events: { seq: number; text?: string }[] };
  const seq = lines.events.find((e) => e.text === 'Ask the team.')!.seq;
  expect(host.engine.resolve('note', { board: 'plans', seq, rev: seq }).text).toBe('Ask the team.');
  await host.tool('write_board', { board: 'plans', items: [{ type: 'node', n: 3, node: { region: 'now', kind: 'question', title: 'Which one?' } }] });
  expect(host.engine.resolve('card', { board: 'plans', n: 3, ver: 1 })).toEqual(expect.objectContaining({ refused: 'changed', reason: expect.any(String) }));
  expect(host.engine.resolve('card', { board: 'plans', n: 99, ver: 1 })).toEqual(expect.objectContaining({ refused: 'gone' }));
  expect(host.engine.resolve('picture', {})).toEqual(expect.objectContaining({ refused: 'gone' }));
});

test('watch: a change from the engine and from another writer on the folder; stop ends it', async ({ host }) => {
  const heard: { board?: string; head: number }[] = [];
  const stop = host.engine.watch((c) => heard.push(c));
  await drawPlans(host);
  await expect.poll(() => heard.at(-1)?.board).toBe('plans');
  const mod = await loadEngine();
  const other = mod.createEngine({ dir: host.dir, warn: () => {} });
  await other.route({ method: 'PUT', path: 'boards/elsewhere', body: { title: 'Elsewhere' } }, { caller: PERSON });
  await expect.poll(() => heard.at(-1)?.board, { timeout: 10_000 }).toBe('elsewhere');
  stop();
  const count = heard.length;
  await other.route({ method: 'PUT', path: 'boards/after', body: { title: 'After' } }, { caller: PERSON });
  await new Promise((done) => setTimeout(done, 300));
  expect(heard.length).toBe(count);
});
