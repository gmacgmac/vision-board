// Note polish (found-in-use FE_04), on the gallery's real <vb-note-bubble>: the note editor grows with its words from
// three lines to the popover maximum height, then scrolls. Read-only; no server state. (A node's notes are its
// conversation box: conversation-box.spec.ts.)
import { expect, test } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await page.goto('/gallery.html');
  await expect(page.locator('section[data-pattern="note-bubble"] vb-note-bubble').first()).toBeVisible();
});

// The editor stops at the popover's maximum height, --vb-pop-max-h (popovers-larger-thread ruling 4; 240px before it).
const MAX_H = 320;

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
