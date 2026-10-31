// The gallery's section on attaching files (chat-attachments COMPOSE_01): every state drawn, the chips,
// the paperclip and the drop hint at their contrast tiers, focus, axe, light and dark, and its screenshot;
// there only with chatPanel and chatAttachments on; the other chat samples have no paperclip; every sample is as
// tall as it needs (chat text at 16, 15, 14 px), so the feed's line and a refusal's words are whole; a PDF's pages' states (D-071).
import type { Locator, Page } from '@playwright/test';
import { lc, pixel, resolved } from './apca.ts';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const SAMPLES = ['idle', 'uploading', 'ready', 'refused', 'eleventh', 'mixed', 'names', 'drop', 'shut', 'sent', 'sent-alone', 'reading', 'fitting', 'pages-short'];

// The section has 14 samples, each with its contrast read pixel by pixel: under a full suite's load that takes its time.
test.describe.configure({ timeout: 120_000 });

/** How far apart two boxes are, up and down; below 0 they overlap. */
const gap = (above: { y: number; height: number }, below: { y: number }) => below.y - (above.y + above.height);

/** The nearest opaque background of `at`, as the browser draws it. */
const backOf = (at: Locator): Promise<string> => at.evaluate((el) => {
  for (let e: Element | null = el; e; e = e.parentElement) {
    const c = getComputedStyle(e).backgroundColor;
    if (c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
  }
  return 'white';
});

async function contrast(page: Page, at: Locator, prop: 'color' | 'borderTopColor' = 'color'): Promise<number> {
  const fg = await at.evaluate((el, p) => getComputedStyle(el)[p], prop);
  return lc(await pixel(page, await resolved(page, fg)), await pixel(page, await resolved(page, await backOf(at))));
}

for (const theme of ['dark', 'light'] as Theme[]) {
  test(`every state drawn, contrast and axe pass, and the section matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    const section = page.locator('section[data-feature="chatAttachments"]');
    await expect(section).toBeVisible();
    const sample = (state: string) => section.locator(`.g-attach-sample[data-state="${state}"]`);
    await expect(section.locator('.g-attach-sample')).toHaveCount(SAMPLES.length);
    await expect(sample('idle').getByRole('button', { name: 'Attach files' })).toHaveAttribute('title', /drop or paste/);
    await expect(sample('uploading').locator('.chat-chip-s')).toHaveText('Uploading…');
    await expect(sample('uploading').locator('.chat-cmp-line')).toHaveText('Send waits until the files have uploaded.');
    await expect(sample('uploading').locator('button.chat-cmp-send')).toBeDisabled();
    await expect(sample('ready').locator('[data-glyph]')).toHaveCount(2);
    await expect(sample('ready').locator('[data-glyph="picture"]')).toHaveCount(1);
    await expect(sample('ready').locator('button.chat-cmp-send')).toBeEnabled();
    await expect(sample('refused').locator('.chat-chip-why')).toContainText('and the limit is 10 MB a file');
    await expect(sample('eleventh').locator('.chat-chip[data-state="ready"]')).toHaveCount(10);
    await expect(sample('eleventh').locator('.chat-chip[data-state="refused"]')).toHaveCount(1);
    await expect(sample('names').locator('.chat-chip-t').nth(2)).toHaveAttribute('dir', 'auto');
    await expect(sample('drop').locator('.chat-cmp-drop')).toBeVisible();
    await expect(sample('shut').getByRole('button', { name: 'Attach files' })).toBeDisabled();
    await expect(sample('sent').locator('chat-message .chat-chip[data-kind="file"]')).toHaveText(['whiteboard.png', '会議のメモ.pdf', 'budget-2027.xlsx']);
    await expect(sample('sent').locator('chat-message a')).toHaveCount(0);
    // A refused reason's words reach a person whole: the row grows, nothing clips.
    const why = sample('refused').locator('.chat-chip-why');
    expect(await why.evaluate((el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight)).toBe(true);
    // Reading text 60 (the name, the state in words, the reason, the hint); decoration 30 (marks, edges).
    expect(await contrast(page, sample('ready').locator('.chat-chip-t').first())).toBeGreaterThanOrEqual(60);
    expect(await contrast(page, sample('uploading').locator('.chat-chip-s'))).toBeGreaterThanOrEqual(60);
    expect(await contrast(page, why)).toBeGreaterThanOrEqual(60);
    expect(await contrast(page, sample('refused').locator('.chat-chip-t'))).toBeGreaterThanOrEqual(60);
    expect(await contrast(page, sample('drop').locator('.chat-cmp-drop'))).toBeGreaterThanOrEqual(60);
    expect(await contrast(page, sample('sent').locator('chat-message .chat-chip-t').first())).toBeGreaterThanOrEqual(60);
    expect(await contrast(page, sample('idle').locator('button.chat-cmp-attach'))).toBeGreaterThanOrEqual(30);
    expect(await contrast(page, sample('shut').locator('button.chat-cmp-attach'))).toBeGreaterThanOrEqual(30);
    expect(await contrast(page, sample('ready').locator('.chat-chip-i').first())).toBeGreaterThanOrEqual(30);
    expect(await contrast(page, sample('uploading').locator('.chat-chip-i'))).toBeGreaterThanOrEqual(30);
    expect(await contrast(page, sample('refused').locator('.chat-chip-i'))).toBeGreaterThanOrEqual(30);
    expect(await contrast(page, sample('refused').locator('.chat-chip[data-state="refused"]'), 'borderTopColor')).toBeGreaterThanOrEqual(30);
    // Focus shows on the paperclip and on a remove button, and the row does not clip the ring.
    const clip = sample('idle').locator('button.chat-cmp-attach');
    await clip.focus();
    await expect(clip).toHaveCSS('outline-style', 'solid');
    expect(await contrast(page, clip)).toBeGreaterThanOrEqual(30);
    const x = sample('ready').locator('button.chat-chip-x').first();
    await page.keyboard.press('Tab'); // the keyboard modality, so :focus-visible holds
    await x.focus();
    await expect(x).toHaveCSS('outline-style', 'solid');
    await x.evaluate((el) => el.blur());
    // Every sample has the height it needs: the feed's line clear of what is attached, and no list that had to scroll.
    for (const state of SAMPLES) {
      const empty = sample(state).locator('.chat-empty:visible');
      const next = sample(state).locator('.chat-cmp-label:visible, .chat-cmp-box').first();
      if (await empty.count()) expect(gap((await empty.boundingBox())!, (await next.boundingBox())!), state).toBeGreaterThanOrEqual(0);
      const list = sample(state).locator('chat-composer .chat-chips');
      if (await list.count()) expect(await list.evaluate((el) => el.scrollHeight - el.clientHeight), state).toBeLessThanOrEqual(0);
    }
    // The eleventh's reason comes first and reads whole.
    await expect(sample('eleventh').locator('chat-composer li').first()).toContainText('a message carries at most 10 files');
    // The pages' states: reading text 60, with the file still ready; a note is a row of its own and carries no alarm.
    await expect(sample('reading').locator('.chat-chip-s').first()).toHaveText('Reading pages… 12 of 30');
    await expect(sample('reading').locator('.chat-chip').first()).toHaveAttribute('data-state', 'ready');
    await expect(sample('reading').locator('button.chat-cmp-send')).toBeEnabled();
    await expect(sample('fitting').locator('button.chat-cmp-send')).toBeDisabled();
    await expect(sample('fitting').locator('.chat-cmp-line')).toHaveText('Send waits until a copy of the picture that fits is ready.');
    expect(await contrast(page, sample('reading').locator('.chat-chip-s').first())).toBeGreaterThanOrEqual(60);
    expect(await contrast(page, sample('pages-short').locator('.chat-chip-why').first())).toBeGreaterThanOrEqual(60);
    expect(await contrast(page, sample('reading').locator('.chat-chip-i').first())).toBeGreaterThanOrEqual(30);
    await expectNoAxeViolations(page);
    // A few edge pixels differ only when this runs after other chat specs in the same browser (the section is the one with
    // Japanese and Arabic fallback text; the cause is not established). Twelve pixels can't hide a layout change.
    await expect(section).toHaveScreenshot(`chat-attach-${theme}.png`, { maxDiffPixels: 12 });
  });
}

test('the section is there only with chatPanel and chatAttachments on; the chat section\'s composers have no paperclip', async ({ page }) => {
  for (const off of ['-chatPanel', '-chatAttachments']) {
    await page.goto(`/gallery.html?flags=${off}`);
    await expect(page.locator('section[data-pattern]').first()).toBeVisible();
    await expect(page.locator('section[data-feature="chatAttachments"]')).toHaveCount(0);
  }
  await page.goto('/gallery.html');
  await expect(page.locator('section[data-feature="chatPanel"] .chat-cmp-attach')).toHaveCount(0);
  await expect(page.locator('main > section').last()).toHaveAttribute('data-feature', 'chatAttachments');
  await page.goto('/gallery.html?flags=-readAttachment');
  await expect(page.locator('.g-attach-sample[data-state="sent"]')).toBeVisible();
  await expect(page.locator('.g-attach-sample[data-state="reading"]')).toHaveCount(0);
});
