// Note polish (found-in-use FE_04), on the gallery's real <vb-node> and <vb-note-bubble>: a card note
// cut at three lines shows its full text, as Markdown, in a box beside the card on hover and on
// keyboard focus (notePreview flag, WCAG 1.4.13: hoverable, persistent, Esc dismisses), scrolling
// past its maximum height; and the note editor grows with its words from three lines to the popover
// maximum height, then scrolls. Read-only; no server state.
import type { Locator, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const THEMES: Theme[] = ['dark', 'light'];

test.beforeEach(async ({ page }) => {
  await page.goto('/gallery.html');
  await expect(page.locator('section[data-pattern="node"] vb-node').first()).toBeVisible();
});

/** A card of the "Notes on a card" group, by title. */
const card = (page: Page, title: string): Locator =>
  page.locator('.g-group').filter({ has: page.getByRole('heading', { name: 'Notes on a card' }) })
    .locator('vb-node').filter({ hasText: title });

/** Whether the element at the centre of `target` is `target` or inside it (nothing draws over it). */
const onTop = (target: Locator) => target.evaluate((e) => {
  const r = e.getBoundingClientRect();
  const top = document.elementFromPoint(r.left + r.width / 2, r.top + 20);
  return top !== null && e.contains(top);
});

const LONG = 'A note longer than its preview';

// The tip and the editor stop at the popover's maximum height, --vb-pop-max-h (popovers-larger-thread
// ruling 4; 240px before it).
const MAX_H = 320;

test('note preview: hover on a cut note shows the full text as Markdown, beside the card, and scrolls past the popover maximum', async ({ page }) => {
  const c = card(page, LONG);
  const note = c.locator('.vb-node-note');
  const tip = note.locator('.vb-note-tip');
  await expect(tip).toBeHidden();
  await note.hover();
  await expect(note).toHaveAttribute('data-tip-open', '');
  await expect(tip).toBeVisible();
  await expect(tip).toContainText('Who signs off on the final wording');
  await expect(tip.locator('li')).toHaveCount(12);
  const m = await tip.evaluate((e) => ({ h: e.clientHeight, scrolls: e.scrollHeight > e.clientHeight, left: e.getBoundingClientRect().left,
    cardRight: e.closest('vb-node')!.getBoundingClientRect().right }));
  expect(m.h).toBeLessThanOrEqual(MAX_H);
  expect(m.scrolls).toBe(true);
  expect(m.left).toBeGreaterThanOrEqual(m.cardRight);
  expect(await onTop(tip)).toBe(true);
  // Hoverable: the pointer crosses onto the box (over the gap) and it stays; leaving closes it.
  await tip.hover();
  await expect(tip).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(tip).toBeHidden();
});

test('note preview: opens on keyboard focus, persists while focus stays, Esc dismisses it', async ({ page }) => {
  const note = card(page, LONG).locator('.vb-node-note');
  const tip = note.locator('.vb-note-tip');
  await note.focus();
  await expect(tip).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(tip).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tip).toBeHidden();
  await expect(note).toBeFocused();
  await note.blur();
});

test('note preview: a note that is not cut has none', async ({ page }) => {
  const note = card(page, 'A sent note').locator('.vb-node-note');
  await note.hover();
  await note.focus();
  await expect(note).not.toHaveAttribute('data-tip-open');
});

test('note preview: off with ?flags=-notePreview, a cut note has no preview', async ({ page }) => {
  await page.goto('/gallery.html?flags=-notePreview');
  const note = card(page, LONG).locator('.vb-node-note');
  await note.hover();
  await note.focus();
  await expect(note).not.toHaveAttribute('data-tip-open');
});

for (const theme of THEMES) {
  test(`note preview: axe passes with the preview open (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await expect(page.locator('.g-tips .vb-note-tip').first()).toBeVisible();
    await expectNoAxeViolations(page);
    const note = card(page, LONG).locator('.vb-node-note');
    await note.hover();
    await expect(note.locator('.vb-note-tip')).toBeVisible();
    await expectNoAxeViolations(page);
  });
}

test('editor: grows with what is typed from its minimum, stops at the popover maximum and scrolls', async ({ page }) => {
  const text = page.locator('section[data-pattern="note-bubble"] vb-note-bubble[data-mode="new"]').first().getByLabel('Note text');
  const h = () => text.evaluate((e) => e.getBoundingClientRect().height);
  const start = await h();
  expect(start).toBeGreaterThanOrEqual(15 * 1.45 * 3);
  await text.fill('One\nTwo\nThree');
  expect(await h()).toBe(start);
  await text.fill(Array.from({ length: 6 }, (_, i) => `Line ${i + 1}`).join('\n'));
  const grown = await h();
  expect(grown).toBeGreaterThan(start);
  expect(grown).toBeLessThan(MAX_H);
  await text.fill(Array.from({ length: 20 }, (_, i) => `Line ${i + 1}`).join('\n'));
  expect(Math.round(await h())).toBe(MAX_H);
  expect(await text.evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(true);
});

test('editor: a note that opens with long text starts grown', async ({ page }) => {
  const long = page.locator('section[data-pattern="note-bubble"] vb-note-bubble[data-mode="edit"]').getByLabel('Note text').filter({ hasText: 'Before we settle this' });
  expect(Math.round(await long.evaluate((e) => e.getBoundingClientRect().height))).toBe(MAX_H);
});

// card-polish FE_02: a note's and a reply's time, in a chip at the top right of its box, on hover and on
// keyboard focus only, gone after; its title the whole date; said once to screen readers after who wrote it.
test('note time: the chip shows on hover and on keyboard focus only, and goes after; screen readers hear the time once', async ({ page }) => {
  const note = card(page, 'A sent note').locator('.vb-node-note');
  const chip = note.locator('.vb-note-time');
  await expect(chip).toBeHidden();
  await note.hover();
  await expect(chip).toBeVisible();
  const words = (await chip.textContent())!;
  expect(words).toMatch(/\d/);
  await expect(chip).toHaveAttribute('aria-hidden', 'true');
  expect(await chip.getAttribute('title')).toContain('2026');
  await expect(note.locator('.vb-visually-hidden')).toHaveText(` · ${words}`);
  // At its top right: on the box's top edge, at its right.
  const [b, n] = [(await chip.boundingBox())!, (await note.boundingBox())!];
  expect(b.y).toBeLessThan(n.y);
  expect(b.x + b.width).toBeGreaterThan(n.x + n.width - 40);
  await page.mouse.move(0, 0);
  await expect(chip).toBeHidden();
  // Keyboard focus shows it; leaving the note hides it.
  await note.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(note).toBeFocused();
  await expect(chip).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(chip).toBeHidden();
});

test('note time: a reply has its chip too, and the gallery draws the hovered ones and the put-away threads', async ({ page }) => {
  const group = page.locator('[aria-label="Notes put away, and note times"]');
  const timed = group.locator('vb-node').filter({ hasText: 'Note times' });
  await expect(timed.locator('.vb-note-time')).toHaveCount(2);
  for (const chip of await timed.locator('.vb-note-time').all()) await expect(chip).toBeVisible();
  await expect(timed.locator('.vb-node-reply')).toHaveAttribute('data-flash', '');
  const put = group.locator('vb-node').filter({ hasText: 'A reply since you put them away' });
  await expect(put.locator('.vb-node-notes-count')).toHaveText('1 note · 1 new reply');
  await expect(put.locator('button[data-notes="show"]')).toHaveText('Show');
  await expect(put.locator('.vb-node-note')).toHaveCount(0);
  await expect(group.locator('vb-node').filter({ hasText: 'Notes put away' }).locator('.vb-node-notes-count')).toHaveText('2 notes');
});
