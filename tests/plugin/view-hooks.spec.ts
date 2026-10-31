// The view seam (docs/specification/plugin.md § The view): a fake host written from that spec, on the built folder.
import { drawn, drawPicture, drawPlans, drive, expect, openHost, test } from './harness.ts';

test('api and events: the whole board draws through api, and a change reaches it through events', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host);
  await drawn(page);
  await expect(page.locator('.host-root header.vb-toolbar')).toBeVisible();
  await host.tool('write_board', { board: 'plans', items: [{ type: 'node', node: { region: 'now', kind: 'question', title: 'A fourth?' } }] });
  await expect(page.locator('.host-root vb-node')).toHaveCount(4);
  expect((await drive(page, 'record')).refused).toEqual([]);
});

test('events: a ref with no head makes the board catch up on what it missed', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host);
  await drawn(page);
  await drive(page, 'mute');
  await host.tool('write_board', { board: 'plans', items: [{ type: 'node', node: { region: 'now', kind: 'question', title: 'Missed?' } }] });
  await page.waitForTimeout(300);
  await drawn(page);
  await drive(page, 'catchUp');
  await expect(page.locator('.host-root vb-node')).toHaveCount(4);
});

for (const firstRead of [500, 404, 'reject', 'html'] as const) {
  test(`events: a first read that fails (${firstRead}) waits for the next events, with no retry of its own, then the board comes`, async ({ page, host }) => {
    await drawPlans(host);
    await openHost(page, host, { firstRead, muted: true });
    const message = page.locator('.host-root .vb-message');
    await expect(message).toBeVisible();
    await expect(message, 'no command of this repo').not.toContainText('npm');
    expect(await drive(page, 'subscribers'), 'it listens').toBeGreaterThan(0);
    const { notices } = await drive(page, 'record');
    expect(notices).toHaveLength(1);
    expect(notices[0].tone).toBe('error');
    expect(notices[0].text, 'no raw error').not.toMatch(/TypeError|undefined/);
    await page.waitForTimeout(300);
    expect((await drive(page, 'record')).calls.filter((c: string) => c.includes('ledger')), 'no busy retry').toHaveLength(1);
    await drive(page, 'catchUp');
    await drawn(page);
    await expect(message).toBeHidden();
    await page.locator('.host-root vb-node').first().click();
    await expect(page.locator('#host-chips li'), 'and it works').toHaveCount(1);
  });
}

test('settings: a flag comes from settings.get, and settings.on hears a change of align', async ({ page, host }) => {
  // A row of two cards of different heights: the alignment shows in the shorter one's place.
  const long = Array.from({ length: 12 }, (_, i) => `Line ${i} of a long card.`).join('\n\n');
  await host.tool('write_board', { board: 'wide', items: [
    { type: 'board', title: 'Wide' },
    { type: 'region', region: { id: 'one', title: 'One', mode: 'row' } },
    { type: 'node', node: { region: 'one', kind: 'question', title: 'A short card' } },
    { type: 'node', node: { region: 'one', kind: 'question', title: 'A long card', body: long } },
  ] });
  await openHost(page, host, { settings: { keyBubble: false, alignSetting: true } });
  await expect(page.locator('.host-root vb-node')).toHaveCount(2);
  await expect(page.locator('.host-root .vb-keys'), 'a flag off is that control gone').toHaveCount(0);
  const x = async () => (await page.locator('.host-root vb-node').first().boundingBox())!.y;
  const before = await x();
  await drive(page, 'setting', 'align', 'center');
  await expect.poll(x).not.toBe(before);
});

test('settings: appCards off, the board never asks a route only an app host answers', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host);
  await drawn(page);
  const { calls, refused } = await drive(page, 'record');
  expect(calls.filter((c: string) => /apps/.test(c))).toEqual([]);
  expect(refused).toEqual([]);
});

test('a host with no chat at all: three lines of it, and Send only records', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host, { noChat: true });
  await drawn(page);
  await page.locator('.host-root vb-node').nth(1).click();
  await expect(page.locator('.host-root #vb1-send'), 'a selection has nowhere to go').toHaveAttribute('aria-disabled', 'true');
  await page.locator('.host-root vb-node').first().locator('button[data-act="ack"]').click();
  await page.locator('.host-root #vb1-send').click();
  await expect.poll(async () => (await drive(page, 'record')).calls.filter((c: string) => c === 'POST boards/plans/act').length).toBe(2);
});

test('notify and confirm: a notice goes through notify with its tone; a decision that takes something away asks confirm', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host);
  await drawn(page);
  await drive(page, 'answer', false);
  await page.locator('.host-root #vb1-toolbar-menu').click();
  await page.locator('.host-root #vb1-archive-board').click();
  await expect.poll(async () => (await drive(page, 'record')).confirms.length).toBe(1);
  expect((await drive(page, 'record')).confirms[0]).toEqual(expect.objectContaining({ heading: expect.any(String), body: expect.any(String), confirm: expect.any(String) }));
  await drive(page, 'reveal', { cards: [99] });
  await expect.poll(async () => (await drive(page, 'record')).notices.length).toBe(1);
});

test('store: the view is kept through store, and the page\'s own storage stays empty', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host);
  await drawn(page);
  await expect.poll(async () => (await drive(page, 'store'))['view.plans']).toBeTruthy();
  expect(await drive(page, 'pageStorage')).toEqual({ local: 0, session: 0 });
});

test('store left out: the board still keeps its view for the mount, and the page\'s storage stays empty', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host, { noStore: true });
  await drawn(page);
  await drive(page, 'reveal', { cards: [1] });
  expect(await drive(page, 'pageStorage')).toEqual({ local: 0, session: 0 });
});

test('imageRoute left out: a picture goes to /board-images/ on the page\'s origin', async ({ page, host }) => {
  await drawPicture(host);
  const asked: string[] = [];
  page.on('request', (r) => { if (/flow\.png/.test(r.url())) asked.push(new URL(r.url()).pathname); });
  await openHost(page, host, { noImageRoute: true });
  await expect(page.locator('.host-root vb-node')).toHaveCount(1);
  await drive(page, 'reveal', { cards: [1] });
  await expect.poll(() => page.locator('.host-root img.vb-md-img').evaluate((i) => (i as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  expect(new Set(asked)).toEqual(new Set(['/board-images/flow.png']));
});

test('imageRoute: under a strict CSP a picture\'s version and bytes come from the host\'s route, answered by engine.image', async ({ page, host }) => {
  await drawPicture(host);
  const asked: string[] = [];
  page.on('request', (r) => { if (/flow\.png/.test(r.url())) asked.push(`${r.method()} ${new URL(r.url()).pathname}`); });
  await openHost(page, host);
  await expect(page.locator('.host-root vb-node')).toHaveCount(1);
  await drive(page, 'reveal', { cards: [1] });
  const img = page.locator('.host-root img.vb-md-img');
  await expect.poll(() => img.evaluate((i) => (i as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  expect(await img.getAttribute('src')).toMatch(/^\/pics\/flow\.png\?v=/);
  expect(asked.length).toBeGreaterThan(0);
  expect(asked.every((a) => a.includes(' /pics/flow.png'))).toBe(true);
});

test('chat.attach: a chip is added, replaced and removed under one key, and one that went stays spent until its ref changes', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host);
  await drawn(page);
  const cards = page.locator('.host-root vb-node');
  const selection = async () => (await drive(page, 'record')).attaches.filter((a: { key: string }) => a.key === 'selection').map((a: any) => a.chip?.ref.cards ?? null);
  await cards.nth(0).click();
  await expect.poll(selection).toEqual([[1]]);
  await expect(page.locator('#host-chips li')).toHaveCount(1);
  await cards.nth(1).click({ modifiers: ['Shift'] });
  await expect.poll(selection).toEqual([[1], [1, 2]]);
  await expect(page.locator('#host-chips li'), 'replaced, not added').toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect.poll(selection).toEqual([[1], [1, 2], null]);
  await expect(page.locator('#host-chips li')).toHaveCount(0);
  const chip = (await drive(page, 'record')).attaches[0].chip;
  expect(chip).toEqual(expect.objectContaining({ plugin: 'board', kind: 'selection', label: expect.any(String), detail: expect.any(String), preview: expect.any(String) }));
});

test('chat.send: Send sends what is staged with no words, each chip resolved by the engine, then records it; what went is spent', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host);
  await drawn(page);
  await page.locator('.host-root vb-node').first().click();
  await expect(page.locator('#host-chips li')).toHaveCount(1);
  await page.locator('.host-root #vb1-send').click();
  await expect.poll(() => host.messages.length).toBe(1);
  const message = host.messages[0]!;
  expect(message.chips.map((c) => c.kind)).toEqual(['selection']);
  expect(message.blocks[0]!.text).toContain('Ship on Friday?');
  await expect.poll(async () => (await drive(page, 'record')).calls).toContain('POST boards/plans/act');
  await expect(page.locator('#host-chips li'), 'spent').toHaveCount(0);
  const seen = await host.engine.route({ method: 'GET', path: 'ledger', query: new URLSearchParams() }, { caller: { by: 'person' } });
  expect((seen!.body as { events: { action?: string }[] }).events.some((e) => e.action === 'send'), 'the Send is in the ledger').toBe(true);
});

test.describe('a refused chip', () => {
  test.use({ expected: { problems: [/response 409: \S*\/chat$/, /Failed to load resource/] } });
  test('chat.send: a chip the engine refuses stops the message, and Send answers the host\'s words', async ({ page, host }) => {
    await drawPlans(host);
    await openHost(page, host);
    await drawn(page);
    await page.locator('.host-root vb-node').first().click();
    await expect(page.locator('#host-chips li')).toHaveCount(1);
    // The bot takes the card away under the live chip before the Send reaches the host's server.
    await page.route('**/chat', async (route) => {
      expect((await host.tool('write_board', { board: 'plans', items: [{ type: 'retire', n: 1 }] })).isError).toBe(false);
      await route.continue();
    });
    const problem = await drive(page, 'send');
    const { problems, calls } = await drive(page, 'record');
    expect(problems).toHaveLength(1);
    expect(problem).toBe(problems[0]);
    expect(calls, 'nothing recorded').not.toContain('POST boards/plans/act');
    expect(host.messages).toEqual([]);
  });
});

test.describe('a chat.send that rejects', () => {
  test.use({ expected: { problems: [/A fetch that failed/] } });
  test('chat.send: a rejection is Send\'s error state, with words; nothing is unhandled', async ({ page, host }) => {
    await drawPlans(host);
    await openHost(page, host, { sendFails: true });
    await drawn(page);
    await page.locator('.host-root vb-node').first().click();
    const send = page.locator('.host-root #vb1-send');
    await send.click();
    await expect(send).toHaveAttribute('data-state', 'error');
    expect(await send.getAttribute('title')).toBeTruthy();
    expect(await send.getAttribute('aria-disabled')).toBe(null);
    expect(await drive(page, 'send'), 'a host\'s own button hears the words').toEqual(expect.any(String));
  });
});

test('chat.status: now drives the working mark; held and staged drive Send; agent scopes the answers chip', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host);
  await drawn(page);
  const status = () => drive(page, 'boardStatus');
  expect((await status()).chatWork).toBe('idle');
  await drive(page, 'status', { now: 'working' });
  expect((await status()).chatWork).toBe('working');
  await drive(page, 'status', { now: 'asking', held: true, staged: true });
  expect(await status()).toEqual(expect.objectContaining({ chatWork: 'asking', sendWaiting: true, chatAttached: true }));
  await drive(page, 'status', { now: 'idle', held: false, staged: undefined });
  // The person answers a card: the answers chip is live, and `agent` puts the agent in its ref.
  await drive(page, 'status', { agent: host.bot.by === 'agent' ? host.bot.agent : undefined });
  await page.locator('.host-root vb-node').first().locator('button[data-act="ack"]').click();
  const answers = async () => (await drive(page, 'record')).chips.find((c: { kind: string }) => c.kind === 'answers');
  await expect.poll(answers).toEqual(expect.objectContaining({ kind: 'answers', ref: expect.objectContaining({ board: 'plans', agent: (host.bot as { agent: string }).agent }) }));
});

test('chat.status: with no staged, Send is enabled by the board\'s own chip until it has gone; a host that gives staged has the full say', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host);
  await drawn(page);
  const send = page.locator('.host-root #vb1-send');
  await expect(send, 'nothing yet').toHaveAttribute('aria-disabled', 'true');
  await page.locator('.host-root vb-node').first().click();
  await expect(send, 'a selection alone can be sent').not.toHaveAttribute('aria-disabled', 'true');
  await send.click();
  await expect.poll(() => host.messages.length).toBe(1);
  await expect(send, 'the same selection has gone').toHaveAttribute('aria-disabled', 'true');
  await page.locator('.host-root vb-node').nth(1).click();
  await expect(send, 'a new one has not').not.toHaveAttribute('aria-disabled', 'true');
  await drive(page, 'status', { staged: false });
  await expect(send, 'false, and the chip does not count').toHaveAttribute('aria-disabled', 'true');
  await drive(page, 'status', { staged: true });
  await expect(send, 'true, and the chat holds what it says').not.toHaveAttribute('aria-disabled', 'true');
});

test('chat.reveal and chat.hasLine: a changed card links to the chat\'s line only when the chat has it', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host);
  await drawn(page);
  await host.tool('write_board', { board: 'plans', items: [{ type: 'node', n: 1, node: { region: 'now', kind: 'question', title: 'Ship on Friday, or Monday?' } }] });
  const card = page.locator('.host-root vb-node[data-id="1"]');
  const updates = card.locator('[data-tab="updates"]');
  await expect(updates).toHaveText('1 update');
  await updates.click();
  const link = card.getByRole('button', { name: 'Show in the chat' });
  await expect(link).toBeVisible();
  await link.click();
  await expect.poll(async () => (await drive(page, 'record')).reveals).toEqual([{ board: 'plans', n: 1 }]);
});

test('chat.reveal left out: no link, and the card still changes', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host, { noReveal: true });
  await drawn(page);
  await host.tool('write_board', { board: 'plans', items: [{ type: 'node', n: 1, node: { region: 'now', kind: 'question', title: 'Ship on Friday, or Monday?' } }] });
  const card = page.locator('.host-root vb-node[data-id="1"]');
  await expect(card.locator('[data-tab="updates"]')).toHaveText('1 update');
  await card.locator('[data-tab="updates"]').click();
  await expect(card.getByRole('button', { name: 'Show in the chat' })).toHaveCount(0);
});
