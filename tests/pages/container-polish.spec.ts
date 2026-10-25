// Container polish (found-in-use FE_03), on the gallery's real <vb-region> frames: a title takes
// one line and ends in "…" (review polish ruling 9), and its full text shows in a tip on hover of
// the title or keyboard focus in the label group (titleTip flag, WCAG 1.4.13: hoverable,
// persistent, Esc dismisses); a narrow container keeps its marker and controls whole; and a
// container's popovers draw above its own mode row in a narrow frame. Read-only, but for one board of
// its own that an agent draws on the live board, to zoom a narrow frame with its marker (FIX_01).
import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { draw, write } from './agent-board.ts';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const THEMES: Theme[] = ['dark', 'light'];
const FULL = 'Annual plan pricing, packaging, discount rules and regional overrides for review';

test.beforeEach(async ({ page }) => {
  await page.goto('/gallery.html');
  await expect(page.locator('section[data-pattern="region"] vb-region').first()).toBeVisible();
});

const frame = (page: Page, id: string) => page.locator(`section[data-pattern="region"] vb-region[data-region="${id}"]`);

/** Whether the element at the centre of `target` is `target` or inside it (nothing draws over it). */
const onTop = (target: Locator) => target.evaluate((e) => {
  const r = e.getBoundingClientRect();
  const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return top !== null && e.contains(top);
});

/** The same for the top edge of a popover (4px in), the part the mode row used to cover. */
const topEdgeOnTop = (pop: Locator) => pop.evaluate((e) => {
  const r = e.getBoundingClientRect();
  const top = document.elementFromPoint(r.left + r.width / 2, r.top + 4);
  return top !== null && e.contains(top);
});

/** The sample draws the tip open; start from closed so hover and focus do the opening. */
async function closed(page: Page, id: string): Promise<Locator> {
  const f = frame(page, id);
  await f.evaluate((e) => e.removeAttribute('data-title-tip-open'));
  return f;
}

test('title: one line ending in an ellipsis, never broken mid-word; the full text stays in the heading', async ({ page }) => {
  const one = await frame(page, 'title-short').locator('h2').evaluate((e) => e.clientHeight);
  for (const id of ['title-wide', 'title-narrow']) {
    const h2 = frame(page, id).locator('h2');
    await expect(h2).toHaveText(FULL);
    const m = await h2.evaluate((e) => {
      const s = getComputedStyle(e);
      return { overflow: s.textOverflow, wrap: s.whiteSpace, cut: e.scrollWidth > e.clientWidth, height: e.clientHeight };
    });
    expect(m, id).toEqual({ overflow: 'ellipsis', wrap: 'nowrap', cut: true, height: one });
  }
  const short = frame(page, 'title-short').locator('h2');
  expect(await short.evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(false);
});

// Review polish ruling 9 (tracker N41, decision 7): in a one-card-wide container the retired marker and
// the controls never shrink and the title takes what is left on one line, ending in "…"; the holders
// give way first, then the title down to a few letters, then the count. With round 2 ruling 1's short
// words ("6 retired", "1/1") the count stays whole beside the marker in the narrowest frame at 100%.
// The full title stays the heading, so it names the container, and shows in the tip on hover.
test('a narrow container: the marker and the controls stay whole, the title is one line ending in "…"', async ({ page }) => {
  const f = page.locator('section[data-feature="retiredMarker"] vb-region[data-region="retired-narrow"]');
  // Round 2 ruling 1: the short words on the line, the full words in the name and the tooltip.
  const marker = f.locator('.vb-region-retired');
  await expect(marker).toHaveText('6 retired');
  await expect(marker).toHaveAccessibleName(/^6 cards retired from this container\. Show v\d+/);
  await expect(marker).toHaveAttribute('title', /^6 cards retired from this container\. Show v\d+/);
  const count = f.locator('.vb-region-count');
  await expect(count).toHaveAttribute('title', '1 of 1 answered');
  await expect(count.locator('[aria-hidden="true"]')).toHaveText('1/1');
  await expect(count.locator('.vb-region-count-words')).toHaveText('1 of 1 answered');
  await expect(f).toHaveAccessibleName(FULL);
  const m = await f.evaluate((e) => {
    const box = (s: string) => e.querySelector<HTMLElement>(s)!.getBoundingClientRect();
    const whole = (el: HTMLElement) => el.scrollWidth <= el.clientWidth;
    const h2 = e.querySelector<HTMLElement>('.vb-region-head h2')!;
    const shown = [...e.querySelectorAll<HTMLElement>('.vb-region-tools .vb-mseg')].filter((b) => b.getBoundingClientRect().width > 0);
    return {
      marker: whole(e.querySelector<HTMLElement>('.vb-region-retired')!),
      count: whole(e.querySelector<HTMLElement>('.vb-region-count')!),
      controls: shown.length > 0 && shown.every((b) => whole(b) && b.getBoundingClientRect().width >= 24),
      title: { overflow: getComputedStyle(h2).textOverflow, cut: h2.scrollWidth > h2.clientWidth, letters: h2.clientWidth >= 36 },
      apart: box('.vb-region-retired').right <= box('.vb-region-tools').left,
      inside: box('.vb-region-tools').right <= e.getBoundingClientRect().right,
    };
  });
  expect(m).toEqual({ marker: true, count: true, controls: true, title: { overflow: 'ellipsis', cut: true, letters: true }, apart: true, inside: true });
  await f.locator('h2').hover();
  await expect(f.locator('.vb-title-tip')).toBeVisible();
  await expect(f.locator('.vb-title-tip')).toHaveText(FULL);
});

// The same on the board, zoomed (VERIFY_01 items 8 and 9, FIX_01, round 2 rulings 1 and 2): the top line
// keeps its on-screen size, so a one-card frame's line widens and narrows with the zoom. At every zoom
// where the controls show (from FAR_K, 55%, to 250%) nothing on the label side is covered by the
// controls: the marker is whole ("3 retired", or its icon and "3" when the line has no room for the
// words) and ends before the controls start, and the title keeps its few letters. A frame with no
// marker the same. Measured with the pointer away, so the row is not expanded over the label, which it
// may be while hovered. With the toolRail flag the controls are a rail on the frame's left edge, so
// "covered" is any overlap of the two boxes; the same test holds for both.
interface HeadAt { whole: boolean; uncovered: string[]; title: number; icon: boolean; shown: string }
type HeadsAt = Record<string, { n: HeadAt; u: HeadAt }>;

/** A board of its own with two one-card columns under long titles: `n` with "3 retired", `u` with no
 *  marker; each line at every zoom in `ks`, set by Ctrl + wheel at n's title (pointer.ts zooms by
 *  exp(-deltaY * 0.0015), so one turn lands on k). */
async function headsAt(page: Page, request: APIRequestContext, ks: number[]): Promise<HeadsAt> {
  const d = await draw(request, 0, 'narrow-marker');
  const cards = await write(request, d, [
    { type: 'region', region: { id: 'n', title: 'Release checklist for the spring launch and the press day after it', mode: 'column' } },
    { type: 'region', region: { id: 'u', title: 'Pricing questions for the annual plans', mode: 'column' } },
    ...[1, 2, 3, 4].map((i) => ({ type: 'node', node: { region: 'n', kind: 'question', title: `Step ${i}?` } })),
    { type: 'node', node: { region: 'u', kind: 'question', title: 'Grandfather annual plans?' } },
  ]);
  await write(request, d, cards.slice(3, 6).map((c) => ({ type: 'retire', n: c.n })));
  await page.goto(`/#${d.board}`);
  await expect(page.locator('vb-node')).toHaveCount(2);
  const f = page.locator('vb-region[data-region="n"]');
  await expect(f.locator('.vb-region-retired')).toHaveText('3 retired');
  const zoom = () => page.locator('#world').evaluate((w) => new DOMMatrix(getComputedStyle(w).transform).a);
  const seen: HeadsAt = {};
  for (const k of ks) {
    const head = (await f.locator('h2').boundingBox())!;
    await page.mouse.move(head.x + 4, head.y + head.height / 2);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -Math.log(k / await zoom()) / 0.0015);
    await page.keyboard.up('Control');
    await expect.poll(zoom).toBeCloseTo(k, 2);
    await page.mouse.move(2, 990);
    const line = (id: string) => page.locator(`vb-region[data-region="${id}"]`).evaluate((e): HeadAt => {
      const marker = e.querySelector<HTMLElement>('.vb-region-retired')!;
      const tools = e.querySelector<HTMLElement>('.vb-region-tools')!.getBoundingClientRect();
      // A part in sight: a holder or the count with no room wraps below its one-line box, out of sight (FIX_48).
      const inSight = (p: HTMLElement) => p.getBoundingClientRect().width > 0 && p.getBoundingClientRect().top < p.parentElement!.getBoundingClientRect().bottom;
      const parts = [...e.querySelectorAll<HTMLElement>('.vb-region-label > :not(.vb-tip), .vb-holder, .vb-region-count')].filter(inSight);
      const icon = marker.querySelector('svg');
      return {
        whole: marker.hidden === true || marker.scrollWidth <= marker.clientWidth,
        // Covered: its box overlaps the tools' (on the line's right end, or the rail on the frame's left
        // edge with the toolRail flag).
        uncovered: parts.filter((p) => {
          const b = p.getBoundingClientRect();
          return tools.width > 0 && b.right > tools.left + 0.5 && b.left < tools.right - 0.5 && b.bottom > tools.top + 0.5 && b.top < tools.bottom - 0.5;
        }).map((p) => p.className || p.localName),
        title: Math.round(e.querySelector<HTMLElement>('.vb-region-head h2')!.getBoundingClientRect().width),
        icon: icon !== null && icon.getBoundingClientRect().width > 0,
        shown: marker.hidden === true ? '' : marker.innerText.trim(),
      };
    });
    seen[`${Math.round(k * 100)}%`] = { n: await line('n'), u: await line('u') };
  }
  return seen;
}
/** Every zoom where a part of a line is covered, the marker cut, or the title under its few letters. */
const crowded = (seen: HeadsAt) => Object.entries(seen).flatMap(([k, h]) => Object.entries(h)
  .filter(([, m]) => !m.whole || m.uncovered.length > 0 || m.title < 36).map(([id, m]) => `${id} at ${k}: ${JSON.stringify(m)}`));

test('narrow containers on the board: nothing on the label side is covered, from 55% to 250%', async ({ page, request }) => {
  // FAR_K, the old FIX_01 band (76% to 90%), VERIFY_01's zooms (its sweep's steps and the overlap
  // shots), then the top.
  const seen = await headsAt(page, request, [0.55, 0.6, 0.66, 0.7, 0.76, 0.8, 0.86, 0.9, 1, 1.04, 1.25, 1.49, 1.5, 1.78, 1.8, 2.14, 2.5]);
  expect(crowded(seen)).toEqual([]);
  // Ruling 1: the words where they fit; the icon and the number alone where they do not.
  expect([seen['60%']!.n.shown, seen['60%']!.n.icon]).toEqual(['3', true]);
  expect([seen['150%']!.n.shown, seen['150%']!.n.icon]).toEqual(['3 retired', false]);
});

test('title tip: opens on hover of a cut title, stays while the pointer is on it, closes on leave', async ({ page }) => {
  const f = await closed(page, 'title-narrow');
  const tip = f.locator('.vb-title-tip');
  await expect(tip).toBeHidden();
  await f.locator('h2').hover();
  await expect(f).toHaveAttribute('data-title-tip-open', '');
  await expect(tip).toBeVisible();
  await expect(tip).toHaveText(FULL);
  expect(await onTop(tip)).toBe(true);
  // Hoverable: the pointer crosses onto the tip (over the gap) and it stays.
  await tip.hover();
  await expect(tip).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(tip).toBeHidden();
});

test('title tip: opens on focus of the grip, persists while focus stays, Esc dismisses it', async ({ page }) => {
  const f = await closed(page, 'title-wide');
  const tip = f.locator('.vb-title-tip');
  await f.locator('.vb-region-grip').focus();
  await expect(tip).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(tip).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tip).toBeHidden();
  await expect(f.locator('.vb-region-grip')).toBeFocused();
  await f.locator('.vb-region-grip').blur();
});

test('title tip: a title that fits has none', async ({ page }) => {
  const f = await closed(page, 'title-short');
  await f.locator('h2').hover();
  await expect(f).not.toHaveAttribute('data-title-tip-open');
  await f.locator('.vb-region-grip').focus();
  await expect(f).not.toHaveAttribute('data-title-tip-open');
});

test('title tip: off with ?flags=-titleTip, a cut title ends in an ellipsis with no tip', async ({ page }) => {
  await page.goto('/gallery.html?flags=-titleTip');
  const f = await closed(page, 'title-narrow');
  await expect(f.locator('h2')).toHaveText(FULL);
  await f.locator('h2').hover();
  await f.locator('.vb-region-grip').focus();
  await expect(f).not.toHaveAttribute('data-title-tip-open');
});

test('popovers: in a narrow frame the note preview, the layout popover and the settings menu draw above the mode row', async ({ page }) => {
  const f = frame(page, 'n-narrow');
  await f.locator('.vb-region-comment').hover();
  const preview = f.locator('.vb-note-pop');
  await expect(preview).toBeVisible();
  // The text sits just under the row; with the preview under the expanded row (z 3) it was cut off.
  expect(await topEdgeOnTop(preview)).toBe(true);
  expect(await onTop(f.locator('.vb-note-pop-text'))).toBe(true);
  expect(await onTop(preview.getByRole('button', { name: 'Edit' }))).toBe(true);
  await page.mouse.move(0, 0);
  await expect(preview).toBeHidden();

  await f.getByRole('button', { name: /^Settings for / }).click();
  await expect(f.locator('.vb-region-menu')).toBeVisible();
  expect(await topEdgeOnTop(f.locator('.vb-region-menu'))).toBe(true);
  expect(await onTop(f.getByRole('menuitem', { name: 'Reset places' }))).toBe(true);
  await page.keyboard.press('Escape');

  // The layout popover opens on hover of an icon; the collapsed row first expands on hover.
  await f.locator('.vb-mode-row').hover();
  await f.getByRole('radio', { name: 'Flow' }).hover();
  await expect(f.locator('.vb-mode-pop')).toBeVisible();
  expect(await topEdgeOnTop(f.locator('.vb-mode-pop'))).toBe(true);
  expect(await onTop(f.locator('.vb-mode-tiles'))).toBe(true);
  expect(await onTop(f.locator('.vb-mode-line'))).toBe(true);
});

for (const theme of THEMES) {
  test(`title tip: axe passes with the tip open (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await expect(frame(page, 'title-wide').locator('.vb-title-tip')).toBeVisible();
    await expectNoAxeViolations(page);
    const f = await closed(page, 'title-narrow');
    await f.locator('h2').hover();
    await expect(f.locator('.vb-title-tip')).toBeVisible();
    await expectNoAxeViolations(page);
  });
}
