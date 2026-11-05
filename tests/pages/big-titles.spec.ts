// Big titles (bigTitles flag, point 437): a card whose body has structure (a `#` or `##` heading, or a
// table) shows its title at today's `#` size, larger than any of its body headings, and its body's `#`
// steps down to the `##` size; a plain card's title, and a card whose only heading is `###`, are
// unchanged; ?flags=-bigTitles draws today's sizes. In light and dark: the title passes Lc 60, axe passes,
// and the gallery's samples match their screenshot.
import type { Locator, Page } from '@playwright/test';
import { draw, open, write } from './agent-board.ts';
import { lc, pixel, resolved } from './apca.ts';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const THEMES: Theme[] = ['light', 'dark'];
const fontSize = (l: Locator) => l.evaluate((e) => parseFloat(getComputedStyle(e).fontSize));

/** Today's `#` size: a `vb-md-h1` outside any card, as markdown.css draws it. */
const todaysH1 = (page: Page) => page.evaluate(() => {
  const h = document.createElement('span');
  h.className = 'vb-md-h1';
  document.body.append(h);
  const size = parseFloat(getComputedStyle(h).fontSize);
  h.remove();
  return size;
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
  const d = await draw(request, 4, 'big-titles');
  await write(request, d, Object.values(BODIES).map((body, i) => ({ type: 'node', n: d.n[i], node: { region: 'p', kind: 'question', title: `Card ${i + 1}`, body } })));
  return d;
}
const cardOf = (page: Page, i: number) => page.locator('vb-node').filter({ has: page.locator(`h3:text-is("Card ${i}")`) });

test('on the board: a structured card\'s title is today\'s # size and larger than its body headings; # steps down to ##', async ({ page, request }) => {
  const d = await board(request);
  await open(page, d);
  const h1 = await todaysH1(page);
  const [structured, table, label, plain] = await Promise.all([1, 2, 3, 4].map((i) => sizes(cardOf(page, i))));
  expect(structured!.title).toBe(h1);
  expect(Math.max(...structured!.headings)).toBeLessThan(structured!.title);
  const [bodyH1, bodyH2] = [await fontSize(cardOf(page, 1).locator('.vb-md-h1')), await fontSize(cardOf(page, 1).locator('.vb-md-h2'))];
  expect(bodyH1).toBe(bodyH2);
  expect(table!.title).toBe(h1);
  // A card whose only heading is the label, and a plain card, keep the medium title.
  expect(label!.title).toBeLessThan(h1);
  expect(plain!.title).toBe(label!.title);
  // The big title still fits: it wraps inside its card, never wider.
  for (const i of [1, 2]) expect(await cardOf(page, i).locator('.vb-node-title').evaluate((t) => t.scrollWidth <= t.clientWidth)).toBe(true);
});

test('flag off: every title keeps today\'s size and # stays larger than ##', async ({ page, request }) => {
  const d = await board(request);
  await open(page, d, '?flags=-bigTitles');
  const titles = await Promise.all([1, 2, 3, 4].map(async (i) => fontSize(cardOf(page, i).locator('.vb-node-title'))));
  expect(new Set(titles).size).toBe(1);
  expect(await fontSize(cardOf(page, 1).locator('.vb-md-h1'))).toBe(await todaysH1(page));
  expect(await fontSize(cardOf(page, 1).locator('.vb-md-h1'))).toBeGreaterThan(await fontSize(cardOf(page, 1).locator('.vb-md-h2')));
  expect(titles[0]).toBeLessThan(await todaysH1(page));
});

test.describe('on the gallery', () => {
  const sample = (page: Page, i: number) => page.locator('vb-node[data-sample="big-titles"]').nth(i);

  test('a structured card and a plain card side by side; flag off, no samples', async ({ page }) => {
    await page.goto('/gallery.html');
    await expect(page.locator('vb-node[data-sample="big-titles"]')).toHaveCount(2);
    const [structured, plain] = [await sizes(sample(page, 0)), await sizes(sample(page, 1))];
    expect(structured.title).toBe(await todaysH1(page));
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
