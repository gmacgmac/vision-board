// Big titles (bigTitles flag, point 437): a card whose body has structure (a `#` or `##` heading, or a
// table) shows its title four pixels over the card title (--vb-card-title + 4px, point 671) in the bold
// weight (point 442), larger than any of its body headings, and its body's `#` steps down to the `##`
// size (body + 2px); a plain card's title, and a card whose only heading is `###`, keep --vb-card-title;
// ?flags=-bigTitles draws every title at --vb-card-title and the body's `#` at body + 4px. In light and
// dark: the title passes Lc 60, axe passes, and the gallery's samples match their screenshot.
import type { Locator, Page } from '@playwright/test';
import { draw, open, write } from './agent-board.ts';
import { lc, pixel, resolved } from './apca.ts';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const THEMES: Theme[] = ['light', 'dark'];
const fontSize = (l: Locator) => l.evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
const weight = (l: Locator) => l.evaluate((e) => Number(getComputedStyle(e).fontWeight));

/** The card's type tokens in px: the title (--vb-card-title) and the body (--vb-card-text). */
const tokens = (page: Page) => page.evaluate(() => {
  const px = (name: string) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return { title: px('--vb-card-title'), text: px('--vb-card-text') };
});

/** The card's title size and each of its body headings' sizes. */
const sizes = async (card: Locator) => ({
  title: await fontSize(card.locator('.vb-node-title')),
  headings: await card.locator('.vb-node-body :is(.vb-md-h1, .vb-md-h2, .vb-md-label)').evaluateAll((hs) => hs.map((h) => parseFloat(getComputedStyle(h).fontSize))),
});

const BODIES = {
  structured: '# Plans\n\nWhat we ship.\n\n## Before launch\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n### Checks\n\n- Pages',
  table: 'Which fits?\n\n| Plan | Seats |\n|---|---|\n| Team | 25 |',
  label: '### Checks\n\n- Pages\n- Contrast',
  plain: 'A sentence, no structure.',
};

async function board(request: Parameters<typeof draw>[0]) {
  const d = await draw(request, 5, 'big-titles');
  await write(request, d, [
    ...Object.values(BODIES).map((body, i) => ({ type: 'node', n: d.n[i], node: { region: 'p', kind: 'question', title: `Card ${i + 1}`, body } })),
    // Card 5: a topic with an icon, whose title sits in the head beside the tile (node-edges.ts `heading`).
    { type: 'node', n: d.n[4], node: { region: 'p', kind: 'topic', icon: 'chart', title: 'Card 5', body: '## Purpose\n\nWhat it does.\n\n### Checks\n\n- Pages' } },
  ]);
  return d;
}
const cardOf = (page: Page, i: number) => page.locator('vb-node').filter({ has: page.locator(`h3:text-is("Card ${i}")`) });

test('on the board: a structured card\'s title is the card title + 4px and larger than its body headings; # steps down to ##', async ({ page, request }) => {
  const d = await board(request);
  await open(page, d);
  const t = await tokens(page);
  const big = t.title + 4;
  const [structured, table, label, plain] = await Promise.all([1, 2, 3, 4].map((i) => sizes(cardOf(page, i))));
  expect(structured!.title).toBe(big);
  expect(Math.max(...structured!.headings)).toBeLessThan(structured!.title);
  const [bodyH1, bodyH2] = [await fontSize(cardOf(page, 1).locator('.vb-md-h1')), await fontSize(cardOf(page, 1).locator('.vb-md-h2'))];
  expect(bodyH2, '## is body + 2px').toBe(t.text + 2);
  expect(bodyH1, '# steps down to ## under a big title').toBe(bodyH2);
  expect(table!.title).toBe(big);
  // A card whose only heading is the label, and a plain card, keep the medium title at --vb-card-title.
  expect(label!.title).toBe(t.title);
  expect(plain!.title).toBe(t.title);
  // Bold, the `#` weight (point 442): the headline over its bold `##`; the label and plain cards keep the medium title.
  const bold = await weight(cardOf(page, 1).locator('.vb-md-h2'));
  for (const i of [1, 2]) expect(await weight(cardOf(page, i).locator('.vb-node-title')), `card ${i}: bold`).toBe(bold);
  for (const i of [3, 4]) expect(await weight(cardOf(page, i).locator('.vb-node-title')), `card ${i}: medium`).toBeLessThan(bold);
  // A card with an icon (its title in the head beside the tile) takes the big title too, over its `##`.
  const icon = await sizes(cardOf(page, 5));
  expect(await cardOf(page, 5).locator('.vb-node-head .vb-node-title').count(), 'card 5 holds its title in the head').toBe(1);
  expect(icon.title).toBe(big);
  expect(Math.max(...icon.headings)).toBeLessThan(icon.title);
  expect(await weight(cardOf(page, 5).locator('.vb-node-title')), 'card 5: bold').toBe(bold);
  // The big title still fits: it wraps inside its card, never wider.
  for (const i of [1, 2]) expect(await cardOf(page, i).locator('.vb-node-title').evaluate((t) => t.scrollWidth <= t.clientWidth)).toBe(true);
});

test('flag off: every title keeps the card title and # stays larger than ##', async ({ page, request }) => {
  const d = await board(request);
  await open(page, d, '?flags=-bigTitles');
  const t = await tokens(page);
  const titles = await Promise.all([1, 2, 3, 4].map(async (i) => fontSize(cardOf(page, i).locator('.vb-node-title'))));
  expect([...new Set(titles)]).toEqual([t.title]);
  const bodyH1 = await fontSize(cardOf(page, 1).locator('.vb-md-h1'));
  expect(bodyH1, '# is body + 4px').toBe(t.text + 4);
  expect(bodyH1).toBeGreaterThan(await fontSize(cardOf(page, 1).locator('.vb-md-h2')));
  expect(titles[0]).toBeLessThan(bodyH1);
  const weights = await Promise.all([1, 2, 3, 4].map(async (i) => weight(cardOf(page, i).locator('.vb-node-title'))));
  expect(new Set(weights).size, 'every title keeps the medium weight').toBe(1);
  expect(weights[0]).toBeLessThan(await weight(cardOf(page, 1).locator('.vb-md-h2')));
});

test.describe('on the gallery', () => {
  const sample = (page: Page, i: number) => page.locator('vb-node[data-sample="big-titles"]').nth(i);

  test('a structured card and a plain card side by side; flag off, no samples', async ({ page }) => {
    await page.goto('/gallery.html');
    await expect(page.locator('vb-node[data-sample="big-titles"]')).toHaveCount(2);
    const [structured, plain] = [await sizes(sample(page, 0)), await sizes(sample(page, 1))];
    expect(structured.title).toBe((await tokens(page)).title + 4);
    expect(Math.max(...structured.headings)).toBeLessThan(structured.title);
    expect(plain.title).toBeLessThan(structured.title);
    await page.goto('/gallery.html?flags=-bigTitles');
    await expect(page.locator('section[data-pattern="markdown"] vb-node').first()).toBeVisible();
    await expect(page.locator('vb-node[data-sample="big-titles"]')).toHaveCount(0);
  });

  for (const theme of THEMES) {
    test(`the big title passes Lc 60, axe passes, and the samples match their screenshot (${theme})`, async ({ page }) => {
      await page.goto('/gallery.html');
      await setTheme(page, theme);
      const title = sample(page, 0).locator('.vb-node-title');
      await expect(title).toBeVisible();
      const ink = await pixel(page, await title.evaluate((e) => getComputedStyle(e).color));
      const card = await pixel(page, await resolved(page, 'var(--vb-surface-card)'));
      const value = lc(ink, card);
      expect(value, `title Lc ${value.toFixed(1)}`).toBeGreaterThanOrEqual(60);
      await expectNoAxeViolations(page);
      await expect(page.locator('.g-group').filter({ has: sample(page, 0) })).toHaveScreenshot(`big-titles-${theme}.png`);
    });
  }
});
