// Read-only for a plugin host (docs/specification/plugin.md § The engine, `readOnly`; D-085 7): an engine made with the
// option answers every write `read-only` and writes nothing in its folder, its reads say `readOnly: true`, the host flips it
// and the view learns it from its next read; a host that never passes it sees nothing new. And `watch` says a ledger file
// replaced (a sync, a copy dropped in) as a change with head 0, which the view reads from the start.
// verify: data-folder-literal the host's folder seen from outside: a test replaces the ledger file as a sync would
import { readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { loadEngine, manifest } from './fake-host/server.ts';
import type { FakeHost } from './fake-host/server.ts';
import { drawPlans, drawn, drive, expect, openHost, test } from './harness.ts';

const PERSON = { by: 'person' } as const;
/** The person's words when a press can't write (`#actions` READ_ONLY_PERSON), as the host's notice shows them. */
const REASON = /^Read-only/;
/** What a write tool needs to get past its schema, so the refusal is read-only's and not the input's. */
const WRITE_INPUTS: Record<string, Record<string, unknown>> = {
  write_board: { board: 'plans', items: [{ type: 'node', node: { region: 'now', kind: 'question', title: 'One more?' } }] },
  request_grant: { board: 'plans', reason: 'To draw the plans' },
};

/** Every file in the host's folder with its bytes: what "writes nothing" is held to. */
function folderOf(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (at: string) => {
    for (const name of readdirSync(at)) {
      const file = path.join(at, name);
      if (statSync(file).isDirectory()) walk(file); else out[path.relative(dir, file)] = readFileSync(file, 'base64');
    }
  };
  walk(dir);
  return out;
}

const readOnlyEngine = async (host: FakeHost, readOnly: () => boolean) => (await loadEngine()).createEngine({ dir: host.dir, warn: () => {}, readOnly });

test('readOnly: an engine made read-only answers every write tool and write route read-only, and writes nothing; its reads say so', async ({ host }) => {
  await drawPlans(host);
  const engine = await readOnlyEngine(host, () => true);
  const before = folderOf(host.dir);
  const writing = manifest().tools.filter((t: { writes: boolean }) => t.writes).map((t: { name: string }) => t.name);
  expect(writing.sort()).toEqual(Object.keys(WRITE_INPUTS).sort());
  for (const name of writing) {
    const r = await engine.tools.call(name, WRITE_INPUTS[name]!, { caller: host.bot });
    expect(r.isError, `${name}: ${r.content[0]!.text}`).toBe(true);
    expect(r.content[0]!.text, name).toContain('read-only');
  }
  for (const [method, at, body] of [['POST', 'boards/plans/act', { type: 'act', action: 'ack', n: 1, ver: 1 }], ['PUT', 'boards/ideas', { title: 'Ideas' }], ['POST', 'agents', { label: 'Another bot' }]] as const) {
    const r = await engine.route({ method, path: at, body }, at === 'agents' ? {} : { caller: PERSON }); // a bot is named with no caller
    expect(r!.status, `${method} ${at}`).toBe(409);
    expect((r!.body as { type: string }).type, `${method} ${at}`).toMatch(/\/read-only$/);
  }
  expect(folderOf(host.dir), 'nothing written in the folder').toEqual(before);
  for (const [name, input] of [['list_boards', {}], ['get_board', { board: 'plans' }]] as const) {
    const r = await engine.tools.call(name, input, { caller: host.bot });
    expect(r.isError, name).toBe(false);
    expect(r.structuredContent.readOnly, name).toBe(true);
  }
  const ledger = await engine.route({ method: 'GET', path: 'ledger', query: new URLSearchParams('after=0') }, { caller: PERSON });
  expect((ledger!.body as { readOnly?: true }).readOnly).toBe(true);
});

test('readOnly: asked on every call, so a host flips it in place; a host that never passes it sees no readOnly', async ({ host }) => {
  await drawPlans(host);
  let on = true;
  const engine = await readOnlyEngine(host, () => on);
  const ack = (n: number) => engine.route({ method: 'POST', path: 'boards/plans/act', body: { type: 'act', action: 'ack', n, ver: 1 } }, { caller: PERSON });
  expect((await ack(1))!.status).toBe(409);
  on = false;
  expect((await ack(1))!.status).toBeLessThan(300);
  const boards = await engine.route({ method: 'GET', path: 'boards' }, { caller: PERSON });
  expect(boards!.body, 'open again: no readOnly').not.toHaveProperty('readOnly');
  on = true;
  expect((await ack(2))!.status).toBe(409);
  // The fake host's own engine has no option: every answer as before.
  const plain = await host.engine.route({ method: 'GET', path: 'boards' }, { caller: PERSON });
  expect(plain!.body).not.toHaveProperty('readOnly');
  expect((await host.tool('get_board', { board: 'plans' })).structuredContent).not.toHaveProperty('readOnly');
});

const ackButton = (page: Page, i: number) => page.locator('.host-root vb-node').nth(i).locator('button[data-act="ack"]');
const headOf = async (host: FakeHost) => ((await host.engine.route({ method: 'GET', path: 'boards' }, { caller: PERSON }))!.body as { head: number }).head;

test.describe('the view', () => {
  test.use({ hostOptions: { readOnly: false } });

  test('readOnly: the host flips it and says a ref with no head; a press then says why in the host\'s notice and writes nothing; flipped back, it writes', async ({ page, host }) => {
    await drawPlans(host);
    await openHost(page, host);
    await drawn(page);
    host.setReadOnly(true);
    await expect.poll(() => drive(page, 'boardStatus').then((s: { readOnly: boolean }) => s.readOnly), 'the view read it').toBe(true);
    const before = await headOf(host);
    await ackButton(page, 0).click({ force: true });
    await expect.poll(() => drive(page, 'record').then((r: { notices: { text: string; tone?: string }[] }) => r.notices.at(-1))).toEqual({ text: expect.stringMatching(REASON), tone: 'error' });
    await expect(ackButton(page, 0)).toHaveAttribute('aria-pressed', 'false');
    expect(await headOf(host), 'nothing written').toBe(before);
    host.setReadOnly(false);
    await expect.poll(() => drive(page, 'boardStatus').then((s: { readOnly: boolean }) => s.readOnly)).toBe(false);
    await ackButton(page, 0).click();
    await expect(ackButton(page, 0)).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => headOf(host)).toBe(before + 1);
  });
});

test('watch: a ledger file replaced is said as a change with head 0, and the view reads it from the start', async ({ page, host }) => {
  const heard: Record<string, unknown>[] = [];
  const stop = host.engine.watch((c) => heard.push(c));
  await drawPlans(host);
  await openHost(page, host);
  await drawn(page);
  const file = path.join(host.dir, 'ledger.jsonl');
  const three = readFileSync(file);
  await host.tool('write_board', { board: 'plans', items: [{ type: 'node', node: { region: 'now', kind: 'question', title: 'A fourth?' } }] });
  await expect(page.locator('.host-root vb-node')).toHaveCount(4);
  // Replaced, as a sync or a copy dropped in does it: another file moved over this one, shorter than it was.
  writeFileSync(`${file}.next`, three);
  renameSync(`${file}.next`, file);
  await expect.poll(() => heard.some((c) => c.head === 0), { timeout: 10_000 }).toBe(true);
  await expect(page.locator('.host-root vb-node')).toHaveCount(3);
  stop();
});
