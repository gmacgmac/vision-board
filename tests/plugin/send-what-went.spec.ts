// A Send counts only what went (plugin.md § The chat, `send(record)`; point 377): the host records the Send with what
// the engine read for the answers chip that went, so a message without it, or an answer made after the read, leaves
// those answers for the next message. A send that fails records nothing. The fake host is written from the spec.
import type { Page } from '@playwright/test';
import type { FakeHost } from './fake-host/server.ts';
import { drawn, drawPlans, drive, expect, openHost, test } from './harness.ts';

type Line = { seq: number; type: string; action?: string; head?: number };
/** The ledger as the person reads it. */
const lines = async (host: FakeHost): Promise<Line[]> =>
  ((await host.engine.route({ method: 'GET', path: 'ledger', query: new URLSearchParams() }, { caller: { by: 'person' } }))!.body as { events: Line[] }).events;
const sends = async (host: FakeHost) => (await lines(host)).filter((e) => e.action === 'send');
/** The person answers card `i` (0-based) with ✓, and the answers chip says so. */
async function ack(page: Page, i: number) {
  await page.locator('.host-root vb-node').nth(i).locator('button[data-act="ack"]').click();
}
const answersChip = async (page: Page) => (await drive(page, 'record')).chips.find((c: { kind: string }) => c.kind === 'answers');
const send = (page: Page) => page.locator('.host-root #vb1-send').click();

test('removed chip: a message without the answers chip acknowledges none of them, and they go with the next', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host);
  await drawn(page);
  await ack(page, 0);
  await expect.poll(() => answersChip(page)).toBeTruthy();
  await page.locator('.host-root vb-node').nth(1).click();
  await drive(page, 'drop', 'answers');
  await send(page);
  await expect.poll(() => host.messages.length).toBe(1);
  expect(host.messages[0]!.chips.map((c) => c.kind), 'the selection went alone').toEqual(['selection']);
  await expect.poll(async () => (await sends(host)).length).toBe(1);
  expect((await sends(host))[0]!.head, 'the Send acknowledges nothing new').toBe(0);
  await expect.poll(() => answersChip(page), 'the answers are back for the next message').toBeTruthy();
  await send(page);
  await expect.poll(() => host.messages.length).toBe(2);
  expect(host.messages[1]!.blocks.map((b) => b.text).join('\n')).toMatch(/^1 \(question\): ✓$/m);
  await expect.poll(async () => (await sends(host)).length).toBe(2);
  await expect.poll(() => answersChip(page), 'now they went').toBeFalsy();
});

test('watermark: an answer made after the engine read the answers and before the record stays for the next Send', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host);
  await drawn(page);
  await ack(page, 0);
  await expect.poll(() => answersChip(page)).toBeTruthy();
  let read = 0;
  // The host's server reads the chips; before the page hears back and records, the person answers card 2.
  await page.route('**/chat', async (route) => {
    const response = await route.fetch();
    read = (await lines(host)).at(-1)!.seq;
    const late = await host.engine.route({ method: 'POST', path: 'boards/plans/act', query: new URLSearchParams(), body: { type: 'act', action: 'drop', n: 2, ver: 1 } }, { caller: { by: 'person' } });
    expect(late!.status).toBeLessThan(300);
    await route.fulfill({ response });
  });
  await send(page);
  await expect.poll(async () => (await sends(host)).length).toBe(1);
  expect((await sends(host))[0]!.head, 'through what was read, not through the Send').toBe(read);
  expect(host.messages[0]!.blocks.map((b) => b.text).join('\n')).not.toMatch(/^2 \(/m);
  await page.unroute('**/chat');
  await expect.poll(async () => (await answersChip(page))?.preview ?? '').toMatch(/^2 \(question\): ✗$/m);
  await send(page);
  await expect.poll(() => host.messages.length).toBe(2);
  const second = host.messages[1]!.blocks.map((b) => b.text).join('\n');
  expect(second).toMatch(/^2 \(question\): ✗$/m);
  expect(second, 'the ✓ that went does not go again').not.toMatch(/^1 \(/m);
});

test('acks: the host hands back the acks resolve answered, in the order staged, and the Send counts what the answers chip read', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host);
  await drawn(page);
  await ack(page, 0);
  await page.locator('.host-root vb-node').nth(1).click();
  await expect.poll(async () => (await drive(page, 'record')).chips.length).toBe(2);
  const read = (await lines(host)).at(-1)!.seq;
  await send(page);
  await expect.poll(async () => (await sends(host)).length).toBe(1);
  expect(host.messages[0]!.acks, 'only the answers chip carries one: the board and the line it read through').toEqual([{ board: 'plans', head: read }]);
  expect((await sends(host))[0]!.head).toBe(read);
  await expect.poll(async () => (await drive(page, 'boardStatus')).unsent, 'the answer went').toBe(false);
});

test('acks: an ack of another board, or one whose head names no line, acknowledges nothing, and the answers stay', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host, { acks: [{ board: 'other', head: 99 }, { board: 'plans', head: -1 }, { board: 'plans', head: '7' }, { head: 5 }] });
  await drawn(page);
  await ack(page, 0);
  await expect.poll(() => answersChip(page)).toBeTruthy();
  await send(page);
  await expect.poll(async () => (await sends(host)).length).toBe(1);
  expect((await sends(host))[0]!.head, 'nothing new acknowledged').toBe(0);
  await expect.poll(async () => (await drive(page, 'boardStatus')).unsent, 'the answer is still unsent: it waits for the next Send').toBe(true);
});

test.describe('a send that fails', () => {
  test.use({ expected: { problems: [/A fetch that failed/] } });
  test('at-least-once: a send that fails records nothing, and the answers stay for the next', async ({ page, host }) => {
    await drawPlans(host);
    await openHost(page, host, { sendFails: true });
    await drawn(page);
    await ack(page, 0);
    await expect.poll(() => answersChip(page)).toBeTruthy();
    await send(page);
    await expect(page.locator('.host-root #vb1-send')).toHaveAttribute('data-state', 'error');
    expect(await sends(host)).toEqual([]);
    expect(await answersChip(page)).toBeTruthy();
  });
});

test('flag off: a Send covers every answer up to its own line, whatever went', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host, { settings: { sendCountsWhatWent: false } });
  await drawn(page);
  await ack(page, 0);
  await expect.poll(() => answersChip(page)).toBeTruthy();
  await page.locator('.host-root vb-node').nth(1).click();
  await drive(page, 'drop', 'answers');
  await send(page);
  await expect.poll(async () => (await sends(host)).length).toBe(1);
  expect((await sends(host))[0]!.head).toBeUndefined();
  await expect.poll(() => answersChip(page), 'as before: the answers count as sent').toBeFalsy();
});
