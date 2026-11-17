// The Command Lens skin (skins and nodeEdges flags, D-100; FE_04), in the gallery with both flags on: the element
// builds the markup the template builds for the skin's row; every node offers the same actions in both skins; Tab
// reaches the plate's marks then the switch, named; the rings are the skin's (point 338), after Tab only; axe finds
// nothing; the section matches its screenshots, light and dark. Without the skins flag there is no such section.
import type { Locator, Page } from '@playwright/test';
import type { ViewNode } from '#format';
import { nodeTemplate, SKIN_DEFS } from '#ui';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { card, open as openBoard, write } from './agent-board.ts';
import { drawEdges, mark } from './edge-board.ts';
import { frame, head, idle, linesAfter, menu, menuButton } from './board-page.ts';

const THEMES: Theme[] = ['dark', 'light'];
const ROW = SKIN_DEFS['command-lens'];
const skin = (page: Page): Locator => page.locator('section[data-feature="skins"]');
/** The rings: on the dark plate the light one in both themes; elsewhere the skin's own (point 338). */
const PLATE_RING = 'rgb(185, 191, 200)';
const RING: Record<Theme, string> = { dark: 'rgb(185, 191, 200)', light: 'rgb(74, 78, 87)' };

async function open(page: Page, flags = 'nodeEdges,skins'): Promise<void> {
  await page.goto(`/gallery.html?flags=${flags}`);
  await expect(page.locator('section[data-pattern]').first()).toBeVisible();
}

test('without the skins flag the gallery has no Command Lens section', async ({ page }) => {
  await open(page, 'nodeEdges');
  await expect(skin(page)).toHaveCount(0);
});

test('the element builds the markup the template builds for the skin\'s row', async ({ page }) => {
  await open(page);
  const nodes: ViewNode[] = [
    { id: '7', region: 'r', kind: 'decision', n: 7, title: 'Switch <now>?', icon: 'signal', tone: 300, tags: ['Uplink'] },
    { id: '8', region: 'r', kind: 'finding', n: 8, title: 'Rain fade' },
  ];
  for (const n of nodes) {
    const expected = nodeTemplate(n, { edges: ROW, idPrefix: 'cmp-' });
    const [drawn, parsed] = await page.evaluate(({ n, expected, edges }) => {
      const el = document.createElement('vb-node') as HTMLElement & { render(n: unknown, o: unknown): void };
      el.render(n, { edges, idPrefix: 'cmp-' });
      const t = document.createElement('template');
      t.innerHTML = expected;
      return [el.innerHTML, t.innerHTML];
    }, { n, expected, edges: ROW });
    expect(drawn, n.title).toBe(parsed);
  }
});

test('every node offers the same actions in both skins, by the marks drawn on it', async ({ page }) => {
  await open(page);
  const acts = (sel: string) => page.locator(`${sel} [role="list"][aria-label$="every state"] vb-node`).evaluateAll((els) => els.map((e) => {
    const map: Record<string, string[]> = { number: ['bookmark'], answer: ['tick', 'cross', 'proposal'], tick: ['tick'], cross: ['cross'], proposal: ['proposal'], badge: ['history'], notes: ['comment'] };
    return [...new Set([...e.querySelectorAll<HTMLElement>('[data-mark]')].flatMap((m) => map[m.dataset.mark!] ?? [`?${m.dataset.mark}`]))].sort().join(' ');
  }));
  const [edges, lens] = [await acts('section[data-feature="nodeEdges"]'), await acts('section[data-feature="skins"]')];
  expect(lens.length).toBeGreaterThan(5);
  expect(lens).toEqual(edges);
});

test('a proposal: the chip in the plate, named, and the proposed half outlined', async ({ page }) => {
  await open(page);
  const card = skin(page).locator('vb-node', { hasText: 'Book the second uplink truck?' }).first();
  await expect(card.locator('[data-mark="proposal"]')).toBeVisible();
  await expect(card.locator('[data-mark="proposal"]')).toHaveAttribute('aria-label', /^Proposal on item \d+, the agent proposes tick$/);
  await expect(card.locator('[data-mark="tick"]')).toHaveAttribute('data-proposed', '');
  await expect(card.locator('[data-mark="tick"]')).toHaveCSS('outline-style', 'dashed');
});

test('on a board: switching to the skin redraws in place and keeps the selection; the plate drags; a half answers, the lit half clears', async ({ page, request }) => {
  const d = await drawEdges(request);
  await openBoard(page, d, '?vbwork&flags=nodeEdges,skins');
  const q = card(page, d.n[0]!);
  await q.locator('.vb-node-title').click();
  await expect(q).toHaveAttribute('data-selected', '');
  await menuButton(page).click();
  await menu(page).getByRole('menuitemradio', { name: /Command Lens/ }).click();
  await expect(q).toHaveAttribute('data-marks-at', 'plate');
  await expect(q).toHaveAttribute('data-selected', '');
  const before = await head(page);
  await mark(page, d.n[0]!, 'tick').click();
  await expect(mark(page, d.n[0]!, 'tick')).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(450); // past the double-click guard (item-acts.ts REPEAT_MS)
  await mark(page, d.n[0]!, 'tick').click();
  await expect(mark(page, d.n[0]!, 'tick')).toHaveAttribute('aria-pressed', 'false');
  expect((await linesAfter(page, before)).map((e) => e.action).filter((a) => a === 'ack' || a === 'reopen')).toEqual(['ack', 'reopen']);
  const plate = card(page, d.n[2]!).locator('.vb-node-plate .vb-node-kind');
  const [g, to] = [(await plate.boundingBox())!, (await frame(page, 'q').boundingBox())!];
  const moved = await head(page);
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await page.mouse.up();
  await idle(page);
  expect((await linesAfter(page, moved)).some((e) => e.action === 'move' || e.action === 'pin')).toBe(true);
});

test('on a board: the plate\'s Proposal chip opens the proposal box and a second press closes it; the conversation box\'s head is the plate\'s', async ({ page, request }) => {
  await setTheme(page, 'dark');
  const d = await drawEdges(request);
  await openBoard(page, d, '?vbwork&flags=nodeEdges,skins');
  await menuButton(page).click();
  await menu(page).getByRole('menuitemradio', { name: /Command Lens/ }).click();
  await expect(card(page, d.n[0]!)).toHaveAttribute('data-marks-at', 'plate');
  await write(request, d, [{ type: 'propose', n: d.n[0]!, ver: 1, action: 'check', reason: 'Seen on two runs', source: 'Ops log' }]);
  const chip = mark(page, d.n[0]!, 'proposal');
  const box = card(page, d.n[0]!).locator('.vb-card-pop.vb-node-box[data-pop="proposal"]');
  await chip.click();
  await expect(box).toHaveAttribute('data-open', '');
  await chip.click();
  await expect(box).not.toHaveAttribute('data-open', '');
  await mark(page, d.n[0]!, 'notes').click();
  const talk = page.locator('vb-note-bubble.vb-node-box');
  await expect(talk.locator('.vb-node-box-head')).toHaveCSS('background-color', 'rgb(14, 17, 21)');
  await expect(talk.locator('.vb-node-box-head')).toHaveCSS('color', 'rgb(238, 241, 244)');
  // The skin's corners, and a box a key opened rings with its own border in the skin's ring colour, no ring around it (FIX_01).
  await expect(talk).toHaveCSS('border-top-left-radius', '6px');
  await page.keyboard.press('Escape');
  await write(request, d, [{ type: 'node', n: d.n[0]!, node: { region: 'p', kind: 'question', title: 'Book the second truck today?' } }]);
  await expect(mark(page, d.n[0]!, 'badge')).toBeVisible(); // the new version is drawn
  await card(page, d.n[0]!).focus();
  await page.keyboard.press('h');
  const history = card(page, d.n[0]!).locator('.vb-card-pop.vb-node-box[data-pop="history"]');
  await expect(history).toBeFocused();
  await expect(history).toHaveCSS('outline-style', 'none');
  await expect(history).toHaveCSS('border-top-color', PLATE_RING);
  await expect(history).toHaveCSS('border-top-left-radius', '6px');
});

for (const skinFlag of ['default', 'command-lens']) {
  for (const theme of THEMES) {
    test(`on a board: a box and a mark's tip open, looked at (${skinFlag}, ${theme})`, async ({ page, request }) => {
      await setTheme(page, theme);
      await page.setViewportSize({ width: 1400, height: 900 });
      const d = await drawEdges(request);
      await openBoard(page, d, '?vbwork&flags=nodeEdges,skins');
      if (skinFlag === 'command-lens') {
        await menuButton(page).click();
        await menu(page).getByRole('menuitemradio', { name: /Command Lens/ }).click();
      }
      await mark(page, d.n[0]!, 'notes').click();
      await expect(page.locator('vb-note-bubble.vb-node-box')).toBeVisible();
      await mark(page, d.n[2]!, 'number').hover();
      await expect(page.locator('.vb-mark-tip:not([hidden])')).toBeVisible({ timeout: 6000 });
      await page.screenshot({ path: `temp/gate8/${skinFlag}-${theme}.png` });
    });
  }
}

for (const theme of THEMES) {
  test(`Tab reaches the plate's marks then the switch, named; the skin's rings after Tab only (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await open(page);
    const card = skin(page).locator('vb-node', { hasText: 'Same encoder profile for both feeds?' }).first();
    const num = card.locator('[data-mark="number"]');
    await num.click();
    await expect(num).toHaveCSS('outline-style', 'none');
    await card.focus();
    const order: (string | null)[] = [];
    for (let i = 0; i < 5; i += 1) {
      await page.keyboard.press('Tab');
      order.push(await page.evaluate(() => document.activeElement?.getAttribute('data-mark') ?? null));
      if (i === 0) await expect(num).toHaveCSS('outline-color', PLATE_RING);
    }
    expect(order).toEqual(['number', 'badge', 'notes', 'tick', 'cross']);
    await expect(card.locator('[data-mark="cross"]')).toHaveCSS('outline-color', RING[theme]);
    await expect(card.locator('[data-mark="tick"]')).toHaveAttribute('aria-label', /^Tick item \d+ \(A\)$/);
    await expect(card.locator('[data-mark="cross"]')).toHaveAttribute('aria-pressed', 'false');
  });

  test(`axe finds nothing in the Command Lens section, and it matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await open(page);
    await expect(skin(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await expect(skin(page)).toHaveScreenshot(`command-lens-${theme}.png`);
  });
}
