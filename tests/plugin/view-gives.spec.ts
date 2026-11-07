// What the view gives its host (docs/specification/plugin.md § The view gives): the built folder, a fake host written from that spec.
import type { Page } from '@playwright/test';
import { drawn, drawPlans, drive, expect, openHost, test } from './harness.ts';

test('pageChip: the chip for the board on show, or null with none', async ({ page, host }) => {
  await openHost(page, host);
  await expect.poll(() => drive(page, 'pageChip')).toBe(null);
  await drawPlans(host);
  await drive(page, 'reveal', { board: 'plans' });
  await drawn(page);
  const chip = await drive(page, 'pageChip');
  expect(chip).toEqual(expect.objectContaining({ plugin: 'board', kind: 'board', ref: expect.objectContaining({ board: 'plans' }), label: expect.any(String) }));
  const said = host.engine.resolve(chip.kind, chip.ref);
  expect(said.where).toContain('plans');
});

test('reveal: a board, a card, a note, several cards with nothing selected; a board not yet in the ledger opens when its first line arrives', async ({ page, host }) => {
  await drawPlans(host);
  await host.tool('write_board', { board: 'other', items: [{ type: 'board', title: 'Other' }, { type: 'region', region: { id: 'r', title: 'R', mode: 'grid' } }, { type: 'node', node: { region: 'r', kind: 'question', title: 'Elsewhere?' } }] });
  await openHost(page, host);
  await expect(page.locator('.host-root vb-node').first()).toBeVisible();
  const boardId = async () => (await drive(page, 'boardStatus')).boardId;

  await drive(page, 'reveal', { board: 'plans' });
  await expect.poll(boardId).toBe('plans');
  await drawn(page);

  // Several cards: zoomed to, nothing selected, nothing staged.
  const zoomed = (await drive(page, 'boardStatus')).zoom;
  await drive(page, 'reveal', { cards: [2] });
  await expect.poll(async () => (await drive(page, 'boardStatus')).zoom).not.toBe(zoomed);
  expect((await drive(page, 'record')).chips).toEqual([]);

  // A card, by its number.
  await drive(page, 'reveal', { n: 3 });
  await expect(page.locator('.host-root vb-node[data-id="3"]')).toBeFocused();

  // A note: the person's own, on card 1; its bubble opens.
  await page.locator('.host-root vb-node[data-id="1"]').focus();
  await page.keyboard.press('c');
  await page.keyboard.type('A note to find.');
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(page.locator('.host-root vb-note-bubble')).toBeHidden();
  await expect.poll(async () => (await drive(page, 'record')).calls).toContain('POST boards/plans/act');
  const lines = (await host.engine.route({ method: 'GET', path: 'ledger', query: new URLSearchParams() }, { caller: { by: 'person' } }))!.body as { events: { seq: number; action?: string; text?: string }[] };
  const note = lines.events.find((e) => e.text === 'A note to find.');
  expect(note).toBeTruthy();
  await drive(page, 'reveal', { board: 'plans', seq: note!.seq });
  await expect(page.locator('.host-root vb-note-bubble')).toContainText('A note to find.');
  await page.keyboard.press('Escape');

  // A board no line names yet: it opens when the bot's first line arrives.
  await drive(page, 'reveal', { board: 'later' });
  await host.tool('write_board', { board: 'later', items: [{ type: 'board', title: 'Later' }] });
  await expect.poll(boardId).toBe('later');
});

test('unsaved and leave: leave asks through confirm only while a note holds changed words; Cancel keeps them', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host);
  await drawn(page);
  expect(await drive(page, 'unsaved')).toBe(false);
  expect(await drive(page, 'leave'), 'nothing unsaved: true at once').toBe(true);
  expect((await drive(page, 'record')).confirms).toEqual([]);
  await page.locator('.host-root vb-node').first().focus();
  await page.keyboard.press('c');
  await page.keyboard.type('Half a thought');
  expect(await drive(page, 'unsaved')).toBe(true);
  expect(await page.evaluate(() => { const h = window.fakeHost; h.answer!(false); return h.leave!(); }), 'Cancel').toBe(false);
  await expect(page.locator('.host-root vb-note-bubble textarea')).toHaveValue('Half a thought');
  expect(await page.evaluate(() => { const h = window.fakeHost; h.answer!(true); return h.leave!(); }), 'OK').toBe(true);
  expect(await drive(page, 'unsaved')).toBe(false);
  expect((await drive(page, 'record')).confirms).toHaveLength(2);
});

test('status and send: a host reads what the board shows and hears each change; send is Send to agent from the host\'s own button', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host);
  await drawn(page);
  expect(await drive(page, 'boardStatus')).toEqual(expect.objectContaining({ boardId: 'plans', title: 'Plans', unsaved: false, chatWork: 'idle', counts: expect.objectContaining({ open: 3 }) }));
  const heard = await drive(page, 'statusHeard');
  await page.locator('.host-root vb-node').first().click();
  await expect.poll(() => drive(page, 'statusHeard')).toBeGreaterThan(heard);
  await expect(page.locator('#host-chips li')).toHaveCount(1);
  await page.locator('#host-send').click();
  await expect.poll(() => host.messages.length).toBe(1);
  await expect.poll(async () => (await drive(page, 'record')).calls).toContain('POST boards/plans/act');
});

test('unmount: every listener goes, the chips and subscriptions go, nothing stays outside the root, and root is given back as it was', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host, { hold: true });
  const baseline: string[] = await drive(page, 'listenerNames');
  await drive(page, 'mountHeld');
  await drawn(page);
  await page.locator('.host-root vb-node').first().click();
  await expect(page.locator('#host-chips li')).toHaveCount(1);
  expect(await drive(page, 'subscribers')).toBeGreaterThan(0);
  // A menu open: it goes too.
  await page.locator('.host-root #vb1-toolbar-menu').click();
  await drive(page, 'unmount');
  await expect(page.locator('#host-chips li'), 'its chips taken back').toHaveCount(0);
  expect(await drive(page, 'subscribers')).toBe(0);
  const after: string[] = await drive(page, 'listenerNames');
  expect(after.filter((l) => !baseline.includes(l)), 'nothing of the board\'s is left').toEqual([]);
  expect(await drive(page, 'rootState')).toEqual({ children: 0, classes: 'host-root', attrs: expect.not.arrayContaining(['tabindex', 'aria-label']) });
  expect(await page.evaluate(() => document.querySelectorAll('[class*="vb-"], vb-image-view, dialog[open]').length)).toBe(0);
});

test('unmount finishes whatever one step does: a host\'s `on` that returns nothing', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host, { plainOn: true });
  await drawn(page);
  await page.locator('.host-root vb-node').first().click();
  await expect(page.locator('#host-chips li')).toHaveCount(1);
  await drive(page, 'unmount');
  await expect(page.locator('#host-chips li'), 'its chips taken back').toHaveCount(0);
  expect(await drive(page, 'rootState')).toEqual({ children: 0, classes: 'host-root', attrs: expect.not.arrayContaining(['tabindex']) });
  expect(await page.evaluate(() => document.querySelectorAll('[class*="vb-"]').length)).toBe(0);
});

test('unmount while the first read is on its way leaves nothing listening', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host, { hold: true });
  await page.evaluate(() => { const h = window.fakeHost; h.mountHeld!(); h.unmount!(); });
  await expect.poll(async () => (await drive(page, 'record')).calls.length).toBeGreaterThan(0);
  await page.waitForTimeout(300);
  expect(await drive(page, 'subscribers')).toBe(0);
  expect(await drive(page, 'rootState')).toEqual({ children: 0, classes: 'host-root', attrs: expect.not.arrayContaining(['tabindex']) });
});

test.describe('an unsubscribe that throws', () => {
  test.use({ expected: { problems: [/This host's unsubscribe fails/] } });
  test('unmount finishes whatever one step does: a host\'s unsubscribe that throws is reported, and the rest still runs', async ({ page, host }) => {
    await drawPlans(host);
    await openHost(page, host, { offThrows: true });
    await drawn(page);
    await drive(page, 'unmount');
    expect(await drive(page, 'rootState')).toEqual({ children: 0, classes: 'host-root', attrs: expect.not.arrayContaining(['tabindex']) });
    expect(await drive(page, 'subscribers'), 'only the one that threw is left: the steps after it ran').toBe(1);
  });
});

test('a stopped mount ignores what a host keeps calling, when its unsubscribes hold nothing', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host, { plainOn: true });
  await drawn(page);
  await page.locator('.host-root vb-node').first().locator('button[data-act="ack"]').click();
  await expect(page.locator('#host-chips li')).toHaveCount(1);
  await drive(page, 'unmount');
  await expect(page.locator('#host-chips li')).toHaveCount(0);
  const before = await drive(page, 'record');
  await drive(page, 'catchUp');
  await drive(page, 'status', { now: 'working' });
  await drive(page, 'setting', 'align', 'center');
  await page.waitForTimeout(200);
  await expect(page.locator('#host-chips li'), 'no chip comes back').toHaveCount(0);
  expect(await drive(page, 'unsaved')).toBe(false);
  expect(await drive(page, 'leave')).toBe(true);
  expect(await drive(page, 'pageChip')).toBe(null);
  await drive(page, 'reveal', { n: 999 });
  await drive(page, 'reveal', { cards: [999] });
  expect(await drive(page, 'send'), 'nothing to send').toBe(null);
  const after = await drive(page, 'record');
  expect(after.calls, 'no api call').toEqual(before.calls);
  expect(after.attaches, 'no attach').toEqual(before.attaches);
  expect(after.sends, 'no send').toBe(before.sends);
  expect(after.notices, 'no notice').toEqual(before.notices);
});

test('reveal: a ref of the contract: a change line\'s `reveal` as it came, its other keys and values of the wrong kind ignored, never a throw', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host);
  await drawn(page);
  const zoom = async () => (await drive(page, 'boardStatus')).zoom;
  // What a board write's change line holds (plugin.md § Tools), with a key the board does not read.
  const change = (await host.tool('write_board', { board: 'plans', items: [{ type: 'node', n: 2, node: { region: 'now', kind: 'question', title: 'Who reviews, and when?' } }] }))._meta!['plugin/change'];
  const before = await zoom();
  await drive(page, 'reveal', { ...change.reveal, from: 'the host', at: 3 });
  await expect.poll(zoom, 'the cards it names').not.toBe(before);
  expect((await drive(page, 'record')).chips, 'nothing selected').toEqual([]);
  // A value of the wrong kind is not read: no card, no note, no board switch, no refusal said, nothing thrown.
  // (The bot's write is said as news, "The agent drew", which is not the reveal's.)
  const said = async () => (await drive(page, 'record')).notices.filter((n: { text: string }) => !n.text.startsWith('The agent drew'));
  for (const ref of [{ n: '3' }, { n: -1 }, { seq: 1.5 }, { cards: ['2'] }, { board: 7 }, {}]) await drive(page, 'reveal', ref);
  await expect(page.locator('.host-root vb-node[data-id="3"]')).not.toBeFocused();
  expect((await drive(page, 'boardStatus')).boardId).toBe('plans');
  expect(await said(), 'nothing said').toEqual([]);
  await drive(page, 'reveal', { board: 'plans', n: 3, extra: [1, 'x'] });
  await expect(page.locator('.host-root vb-node[data-id="3"]'), 'the keys it reads still go').toBeFocused();
});

test('reveal of what is not on the board says so through notify, and takes no focus', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host);
  await drawn(page);
  await page.locator('#host-input').focus();
  const said = async () => (await drive(page, 'record')).notices.map((n: { text: string }) => n.text);
  await drive(page, 'reveal', { n: 999 });
  await expect.poll(said).toHaveLength(1);
  expect((await said())[0]).toContain('999');
  await drive(page, 'reveal', { seq: 99999 });
  await expect.poll(said).toHaveLength(2);
  await drive(page, 'reveal', { cards: [996] });
  await expect.poll(said).toHaveLength(3);
  await expect(page.locator('#host-input'), 'the host keeps its focus').toBeFocused();
  await expect(page.locator('.host-root .vb-go'), 'no field opened').toHaveCount(0);
  await drive(page, 'reveal', { n: 2 });
  await expect(page.locator('.host-root vb-node[data-id="2"]'), 'a card that is there still goes').toBeFocused();
  // A card hidden with Hide answered, or one that went: said, and not gone to.
  const ack = page.locator('.host-root vb-node[data-id="1"] button[data-act="ack"]');
  await ack.click();
  // The ✓ lands first: Hide answered hides what is answered when it draws, so until the ✓ is in, card 1
  // is still open and on the board, and reveal rightly goes to it (the flake under load).
  await expect(ack).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.host-root .vb-stage').focus();
  await page.keyboard.press('h');
  await page.locator('#host-input').focus();
  await drive(page, 'reveal', { n: 1 });
  await expect.poll(async () => (await said()).at(-1)).toContain('hidden');
  const before = (await said()).length;
  await drive(page, 'reveal', { cards: [1] });
  await expect.poll(said, 'several cards, none drawn, says so too').toHaveLength(before + 1);
  expect((await said()).at(-1)).toContain('hidden');
  await expect(page.locator('#host-input')).toBeFocused();
});

/** A long title in a narrow container, and a link with words that have no room on their line. */
const TIPS: Record<string, { items?: object[]; open(page: Page): Promise<void> }> = {
  'the key help': { open: (page) => page.locator('.host-root .vb-keys-btn').hover() },
  'a card popover, opened for good': {
    items: [{ type: 'node', n: 1, node: { region: 'now', kind: 'question', title: 'Ship on Friday, or Monday?' } }],
    open: (page) => page.locator('.host-root vb-node[data-id="1"] [data-tab="updates"]').click(),
  },
  'a container title': {
    items: [{ type: 'region', region: { id: 'now', title: 'Now, and a title much too long to fit in one narrow container here', mode: 'column' } }],
    open: (page) => page.locator('.host-root vb-region h2').hover(),
  },
  'a link mark': {
    items: [{ type: 'link', from: 1, to: 2, label: 'far too many words to fit here' }],
    open: (page) => page.locator('.host-root .vb-link-mark-btn').first().hover(),
  },
};

for (const [name, { items, open }] of Object.entries(TIPS)) {
  test(`unmount with a tip open leaves nothing: ${name}`, async ({ page, host }) => {
    await drawPlans(host);
    if (items) {
      const wrote = await host.tool('write_board', { board: 'plans', items });
      expect(wrote.isError, JSON.stringify(wrote.content)).toBe(false);
      expect(JSON.stringify(wrote.structuredContent)).not.toContain('"ok":false');
    }
    await openHost(page, host, { hold: true });
    const baseline: string[] = await drive(page, 'listenerNames');
    await drive(page, 'mountHeld');
    await drawn(page);
    await open(page);
    await expect.poll(async () => (await drive<string[]>(page, 'listenerNames')).length, 'the tip listens on the document').toBeGreaterThan(baseline.length + 2);
    expect(await page.locator('.host-root').locator('[data-keys-open], [data-tab="updates"][aria-expanded="true"], [data-title-tip-open], [data-tip-open]').count(), 'the tip is open').toBeGreaterThan(0);
    await drive(page, 'unmount');
    await expect.poll(async () => (await drive<string[]>(page, 'listenerNames')).filter((l) => !baseline.includes(l))).toEqual([]);
    // Its close grace went too: the pointer leaving now, nothing is left to run.
    await page.mouse.move(1500, 900);
    await page.waitForTimeout(400);
    expect((await drive<string[]>(page, 'listenerNames')).filter((l) => !baseline.includes(l))).toEqual([]);
  });
}

test('the view holds no more than the spec says: no way round the seam in the folder', async ({ page, host }) => {
  await openHost(page, host);
  expect(await drive(page, 'viewKeys')).toEqual(['leave', 'pageChip', 'reveal', 'send', 'status', 'unmount', 'unsaved']);
});
