// Field report batch 3 on the page (FE_01): link labels on their lines or as markers (linkLabels),
// the viewer's alignment in the "⋯" menu (alignSetting), the Match card widths switch in each
// container's mode row (widthsControl), a widened card's height, and the note bubble clear of a
// neighbour's footer buttons. Each flag is on by default and checked off too. The roadmap board is
// only read here (the alignment is the viewer's own, in this browser); the widths acts go to the
// performance server's mixed board, which same-picture.spec.ts changes at random anyway.
import type { Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { PERF_BASE } from './perf-server.ts';

const NODES = 17;
const THEMES: Theme[] = ['dark', 'light'];
const card = (page: Page, n: number) => page.locator(`vb-node[data-id="${n}"]`);

async function openBoard(page: Page, base = '', query = '', hash = ''): Promise<void> {
  await page.goto(`${base}/${query}${hash}`);
  await expect(page.locator('vb-node')).toHaveCount(NODES);
  await expect(page.locator('#world')).not.toHaveClass(/no-anim/);
  await expect(page.locator('#wires')).not.toHaveClass(/settling/);
}

/** A card's box in world pixels (the layout's), read from its transform and size. */
const boxOf = (page: Page, n: number) => card(page, n).evaluate((e) => {
  const m = new DOMMatrix(getComputedStyle(e).transform);
  return { x: m.e, y: m.f, w: (e as HTMLElement).offsetWidth, h: (e as HTMLElement).offsetHeight };
});

// ---- Link labels (ruling 3) ----

test('labels: a label with room sits on its line, centred on a tag no wider than the layout kept for it', async ({ page }) => {
  await openBoard(page);
  const tag = page.locator('#wires .vb-wire-tag');
  await expect(tag).toHaveCount(1);
  await expect(tag.locator('text')).toHaveText('informs');
  const fit = await tag.evaluate((g) => {
    const rect = g.querySelector('rect')!;
    const text = g.querySelector('text')!;
    const w = Number(rect.getAttribute('width'));
    return {
      w, centred: Number(rect.getAttribute('x')) + w / 2 === Number(text.getAttribute('x')),
      inside: Math.min(text.getComputedTextLength(), Number(text.getAttribute('textLength') ?? Infinity)) <= w - 12,
    };
  });
  // labelSize('informs'): 7 characters at 6.5px, plus 6px each side.
  expect(fit).toEqual({ w: 58, centred: true, inside: true });
  // Nothing on the roadmap lacks room, so no marker and the markers' layer stays out of the way.
  await expect(page.locator('#link-marks')).toBeHidden();
  await expect(page.locator('#link-marks .vb-link-mark')).toHaveCount(0);
});

test('labels off (?flags=-linkLabels): every label as text at the middle of its line, no tag, no marker', async ({ page }) => {
  await openBoard(page, '', '?flags=-linkLabels');
  await expect(page.locator('#wires .vb-wire-tag')).toHaveCount(0);
  await expect(page.locator('#wires text.vb-wire-label')).toHaveText(['informs']);
  await expect(page.locator('#link-marks .vb-link-mark')).toHaveCount(0);
});

const labels = (page: Page) => page.locator('section[data-feature="linkLabels"]');

test('gallery: a marker floats its label on hover and on keyboard focus, Esc closes it, and its name carries the words', async ({ page }) => {
  await page.goto('/gallery.html');
  const first = labels(page).locator('.g-mini').first();
  await expect(first.locator('.vb-wire-tag text')).toHaveText(['next']);
  const marks = first.locator('.vb-link-mark');
  await expect(marks).toHaveCount(2);
  const button = first.getByRole('button', { name: 'Link from 1 to 3: when a note fits no theme' });
  const tip = marks.nth(1).locator('.vb-link-tip');
  await expect(tip).toBeHidden();
  await button.hover();
  await expect(tip).toBeVisible();
  await expect(tip).toHaveText('when a note fits no theme');
  await page.mouse.move(0, 0);
  await expect(tip).toBeHidden();
  await button.focus();
  await expect(tip).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tip).toBeHidden();
  await expect(button).toBeFocused();
  // The floating sample draws one open, above the cards.
  await expect(labels(page).locator('.vb-link-mark[data-tip-open] .vb-link-tip')).toBeVisible();
});

// ---- Alignment (ruling 4): the viewer's, in the "⋯" menu, kept in this browser ----

const centreCards = (page: Page) => page.getByRole('menuitemcheckbox', { name: 'Centre cards' });

async function toggleCentre(page: Page): Promise<void> {
  await page.locator('#toolbar-menu').click();
  await centreCards(page).click();
  await expect(page.locator('#wires')).not.toHaveClass(/settling/);
}

test('alignment: Centre cards centres a row, is kept per viewer across a reload, and off again lines the row up by its tops', async ({ page }) => {
  await openBoard(page);
  // "Prove the idea" is a flow row: 5 (three lines) and 6 (a title only) side by side.
  const [five, six] = [await boxOf(page, 5), await boxOf(page, 6)];
  expect(six.h).toBeLessThan(five.h);
  expect(six.y).toBe(five.y);
  await page.locator('#toolbar-menu').click();
  await expect(centreCards(page)).toHaveAttribute('aria-checked', 'false');
  await page.keyboard.press('Escape');
  await toggleCentre(page);
  await expect.poll(async () => { const [a, b] = [await boxOf(page, 5), await boxOf(page, 6)]; return Math.round(a.y + a.h / 2 - (b.y + b.h / 2)); }).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem('vb.align'))).toBe('center');
  await openBoard(page);
  const [a, b] = [await boxOf(page, 5), await boxOf(page, 6)];
  expect(Math.round(a.y + a.h / 2 - (b.y + b.h / 2))).toBe(0);
  await page.locator('#toolbar-menu').click();
  await expect(centreCards(page)).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
  await toggleCentre(page);
  await expect.poll(async () => Math.round((await boxOf(page, 6)).y - (await boxOf(page, 5)).y)).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem('vb.align'))).toBe('start');
});

test('alignment off (?flags=-alignSetting): no Centre cards, and a kept centre is not applied', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => localStorage.setItem('vb.align', 'center'));
  await openBoard(page, '', '?flags=-alignSetting');
  expect((await boxOf(page, 6)).y).toBe((await boxOf(page, 5)).y);
  await page.locator('#toolbar-menu').click();
  await expect(page.getByRole('menuitem', { name: /Theme/ })).toBeVisible();
  await expect(centreCards(page)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.evaluate(() => localStorage.removeItem('vb.align'));
});

// ---- Card widths (ruling 5): the switch in each container's mode row ----

const MIXED = '#mixed';
const frame = (page: Page, region: string) => page.locator(`vb-region[data-region="${region}"]`);
const widthsSwitch = (page: Page, region: string) => frame(page, region).getByRole('switch', { name: 'Match card widths' });
const act = (page: Page, body: Record<string, unknown>) => page.request.post(`${PERF_BASE}/api/boards/mixed/act`, { data: { type: 'act', ...body } });
const widthsOn = async (page: Page) =>
  ((await (await page.request.get(`${PERF_BASE}/api/boards/mixed`)).json()) as { state: { widths?: Record<string, string> } }).state.widths ?? {};

test('widths: each frame\'s switch shows the widths in force; a press or the keyboard sends the act, and the column follows', async ({ page }) => {
  // Controls kept at every zoom (N13): the whole board fits the window, and the frames' mode rows are
  // not drawn zoomed out otherwise; this test is about the switch, not about hiding.
  await openBoard(page, PERF_BASE, '?vbwork&flags=-hideControlsZoomedOut', MIXED);
  // Grid and column match by default; flow keeps its own.
  await expect(widthsSwitch(page, 'review')).toHaveAttribute('aria-checked', 'true');
  await expect(widthsSwitch(page, 'review')).toHaveAttribute('title', 'Card widths: Match');
  await expect(widthsSwitch(page, 'prove')).toHaveAttribute('aria-checked', 'false');
  await expect(widthsSwitch(page, 'prove')).toHaveAttribute('title', 'Card widths: Own');
  // "Prove the idea" as a column, card 4 at L: the column matches it, every card 464 wide.
  expect((await act(page, { action: 'size', n: 4, size: 'l' })).ok()).toBe(true);
  await frame(page, 'prove').locator('button[data-mode="column"]').click();
  await expect(widthsSwitch(page, 'prove')).toHaveAttribute('aria-checked', 'true');
  await expect.poll(async () => [(await boxOf(page, 4)).w, (await boxOf(page, 5)).w, (await boxOf(page, 6)).w]).toEqual([464, 464, 464]);
  // A widened card is measured at its drawn width: the gaps down the column stay the layout's own.
  const gaps = async () => {
    const [a, b, c] = [await boxOf(page, 4), await boxOf(page, 5), await boxOf(page, 6)];
    return [Math.round(b.y - (a.y + a.h)), Math.round(c.y - (b.y + b.h))];
  };
  expect(await gaps()).toEqual([24, 24]);
  // A press: own widths, so 5 and 6 go back to their own width.
  await widthsSwitch(page, 'prove').click();
  await expect(widthsSwitch(page, 'prove')).toHaveAttribute('aria-checked', 'false');
  expect((await widthsOn(page)).prove).toBe('own');
  await expect.poll(async () => (await boxOf(page, 5)).w).toBeLessThan(464);
  expect((await boxOf(page, 4)).w).toBe(464);
  expect(await gaps()).toEqual([24, 24]);
  // The keyboard: Right from the last layout moves on to the switch, Space presses it.
  await frame(page, 'prove').locator('button[data-mode="row"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(widthsSwitch(page, 'prove')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(widthsSwitch(page, 'prove')).toHaveAttribute('aria-checked', 'true');
  await expect.poll(async () => (await widthsOn(page)).prove).toBe('match');
  await expect(widthsSwitch(page, 'prove')).toBeFocused();
  await expect.poll(async () => (await boxOf(page, 6)).w).toBe(464);
});

test('widths off (?flags=-widthsControl): no switch in any frame; the widths in force still apply', async ({ page }) => {
  await openBoard(page, PERF_BASE, '?flags=-widthsControl', MIXED);
  await expect(page.locator('vb-region .vb-widths')).toHaveCount(0);
  // The person's match from the test above still lays "Prove the idea" out at one width.
  await expect.poll(async () => [(await boxOf(page, 5)).w, (await boxOf(page, 6)).w]).toEqual([464, 464]);
});

// ---- The note bubble clear of a neighbour's footer buttons (BE_02's hand-off) ----

async function zoomToFull(page: Page): Promise<void> {
  const scale = () => page.locator('#world').evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).a);
  for (let i = 0; i < 12 && (await scale()) < 1; i += 1) await page.keyboard.press('+');
}

test('the note bubble beside card 4 leaves card 5\'s footer buttons clear', async ({ page }) => {
  await openBoard(page);
  await zoomToFull(page);
  await card(page, 4).focus();
  // Card 4 starts the board's left column: at the popover size (360px, popovers-larger-thread) its
  // right is card 5's buttons, its left the board's edge and below it card 11's buttons, so no place
  // is clear. The board pans right first (focus stays on card 4), which leaves its left clear.
  const before = (await card(page, 4).boundingBox())!.x;
  await page.mouse.move(800, 700);
  await page.mouse.wheel(-440, 0);
  await expect.poll(async () => (await card(page, 4).boundingBox())!.x).toBeGreaterThan(before + 400);
  await page.keyboard.press('c');
  const bubble = page.getByRole('dialog', { name: 'Note on 4' });
  await expect(bubble).toBeVisible();
  await expect(bubble).toHaveAttribute('data-side', 'left');
  const [b, f] = [await bubble.boundingBox(), await card(page, 5).locator('.vb-node-foot').boundingBox()];
  const meets = b!.x < f!.x + f!.width && f!.x < b!.x + b!.width && b!.y < f!.y + f!.height && f!.y < b!.y + b!.height;
  expect(meets).toBe(false);
  await page.keyboard.press('Escape');
});

// ---- Every new pair checked by axe, light and dark, and the gallery sections' screenshots ----

for (const theme of THEMES) {
  test(`axe passes with the "⋯" menu open on Centre cards and a frame's switch focused (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await openBoard(page);
    await zoomToFull(page); // zoomed out to fit, every control is under the 24px target size (N13)
    await frame(page, 'review').locator('button[data-mode="row"]').focus();
    await page.keyboard.press('ArrowRight');
    await expect(widthsSwitch(page, 'review')).toBeFocused();
    await expectNoAxeViolations(page);
    await page.locator('#toolbar-menu').click();
    await expect(centreCards(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await page.keyboard.press('Escape');
  });

  for (const [feature, shot] of [['linkLabels', 'link-labels'], ['alignSetting', 'alignment'], ['widthsControl', 'card-widths']] as const) {
    test(`gallery: the ${feature} section passes axe and matches its screenshot (${theme})`, async ({ page }) => {
      await setTheme(page, theme);
      await page.goto('/gallery.html');
      const section = page.locator(`section[data-feature="${feature}"]`);
      await expect(section.locator('.g-mini vb-node').first()).toBeVisible();
      await expectNoAxeViolations(page);
      await expect(section).toHaveScreenshot(`${shot}-${theme}.png`);
    });
  }
}

test('gallery: each section shows only with its flag', async ({ page }) => {
  await page.goto('/gallery.html?flags=-linkLabels,-alignSetting,-widthsControl');
  await expect(page.locator('section[data-pattern]').first()).toBeVisible();
  await expect(page.locator('section[data-feature="linkLabels"], section[data-feature="alignSetting"], section[data-feature="widthsControl"]')).toHaveCount(0);
});
