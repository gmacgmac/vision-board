// What the contract specs share: a fake host per test on the worker's own port, a page that fails its test on any
// console error, page error, failed request or refused response (as tests/pages/helpers.ts `test` does; this test
// stands alone, so it holds its own), and a board the host's bot draws through its tools.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test as base } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { FakeHost, HostOptions } from './fake-host/server.ts';
import { startHost } from './fake-host/server.ts';

export { expect };

const PORT = Number(process.env.VB_TEST_PORT ?? 4468);

export const test = base.extend<{ host: FakeHost; hostOptions: HostOptions; expected: { problems: RegExp[] } }>({
  expected: [{ problems: [] }, { option: true }],
  hostOptions: [{}, { option: true }],
  host: async ({ hostOptions }, use, info) => {
    const host = await startHost(PORT + 10 * info.parallelIndex, hostOptions);
    await use(host);
    await host.close();
  },
  page: async ({ page, expected }, use) => {
    const problems: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`console ${m.type()}: ${m.text()}`); });
    page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
    page.on('requestfailed', (r) => { if (r.resourceType() !== 'eventsource') problems.push(`request failed: ${r.url()} (${r.failure()?.errorText})`); });
    page.on('response', (r) => { if (r.status() >= 400) problems.push(`response ${r.status()}: ${r.url()}`); });
    await use(page);
    const unexpected = problems.filter((p) => !expected.problems.some((e) => e.test(p)));
    expect(unexpected, unexpected.join('\n')).toEqual([]);
  },
});

/** What a test drives in the page (fake-host/host.js `window.fakeHost`). */
export type Driven = Record<string, (...args: any[]) => any>;
declare global { interface Window { fakeHost: Driven } }

/** The host's page, with the board mounted in its pane. */
export async function openHost(page: Page, host: FakeHost, options: Record<string, unknown> = {}): Promise<void> {
  await page.goto(host.url);
  await page.waitForFunction(() => 'fakeHost' in window);
  await page.evaluate((o) => window.fakeHost.open!(o), options);
}

/** Drives `window.fakeHost`. */
export const drive = <T = any>(page: Page, name: string, ...args: unknown[]): Promise<T> =>
  page.evaluate(([n, a]) => window.fakeHost[n as string]!(...(a as unknown[])), [name, args] as const);

/** The bot draws board `plans`: a container and three questions. */
export async function drawPlans(host: FakeHost): Promise<void> {
  const items = [
    { type: 'board', title: 'Plans' },
    { type: 'region', region: { id: 'now', title: 'Now', mode: 'grid' } },
    { type: 'node', node: { region: 'now', kind: 'question', title: 'Ship on Friday?' } },
    { type: 'node', node: { region: 'now', kind: 'question', title: 'Who reviews?' } },
    { type: 'node', node: { region: 'now', kind: 'question', title: 'Which folder?' } },
  ];
  const wrote = await host.tool('write_board', { board: 'plans', items });
  expect(wrote.isError, JSON.stringify(wrote)).toBe(false);
}

/** A 1 by 1 png. */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==', 'base64');

/** A picture in the data folder's `images/` (the host's to put there, plugin.md Open points), and a card that shows it. */
export async function drawPicture(host: FakeHost): Promise<void> {
  mkdirSync(path.join(host.dir, 'images'), { recursive: true });
  writeFileSync(path.join(host.dir, 'images/flow.png'), PNG);
  const wrote = await host.tool('write_board', { board: 'pics', items: [
    { type: 'board', title: 'Pics' },
    { type: 'region', region: { id: 'now', title: 'Now', mode: 'grid' } },
    { type: 'node', node: { region: 'now', kind: 'note', title: 'A picture', body: '![Flow](flow.png)' } },
  ] });
  expect(wrote.isError, JSON.stringify(wrote)).toBe(false);
}

/** The board's first three cards are drawn. */
export const drawn = (page: Page) => expect(page.locator('.host-root vb-node')).toHaveCount(3);
