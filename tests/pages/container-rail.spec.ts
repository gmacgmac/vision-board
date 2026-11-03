// Container tool rail (toolRail flag; cortex-tasks/board/2026-10-25_board-ui_container-tool-rail.md):
// a container's tools (layout icons, Match card widths, Comment, the cog) sit in a slim vertical rail
// across the frame's left border, so the top line holds only the label, centred, with the whole line.
// The rail keeps its bounds at every zoom where it shows (Design 3), collapses on a short frame and
// expands over the cards on hover or focus (Design 4), is dimmed at rest and lit on hover, focus or an
// open popover (Design 5), opens its popovers to its right (Design 6), and moves by Up and Down with
// Right opening the cog's menu (Design 7). Off (?flags=-toolRail), the row is on the top line as before.
// On a board of its own, drawn through the API by an agent (rail-board.ts); the rail's states are
// container-rail-states.spec.ts.
import { act } from './agent-board.ts';
import { expect, setTheme, test } from './helpers.ts';
import { lc, pixel, resolved } from './apca.ts';
import { board, boxOf, frame, iconOpacity, INSIDE, OUTSIDE, rail, reach, THEMES, TITLE, zoomTo } from './rail-board.ts';

test('the rail is on the left edge and the top line holds only the label, centred, with the title whole', async ({ page, request }) => {
  await board(page, request);
  await zoomTo(page, 1);
  const f = frame(page);
  await expect(f).toHaveAttribute('data-rail', '');
  await expect(f.locator('.vb-region-head .vb-region-tools, .vb-region-head .vb-mode-row')).toHaveCount(0);
  await expect(f.locator('> .vb-region-rail > .vb-region-tools > .vb-mode-row')).toHaveCount(1);
  const m = await f.evaluate((e) => {
    const box = (s: string) => e.querySelector(s)!.getBoundingClientRect();
    const [fr, label, tools] = [e.getBoundingClientRect(), box('.vb-region-label'), box('.vb-region-tools')];
    const h2 = e.querySelector<HTMLElement>('.vb-region-head h2')!;
    return { frameMid: fr.left + fr.width / 2, labelMid: label.left + label.width / 2, toolsLeft: tools.left, frameLeft: fr.left,
      toolsTop: tools.top, headBottom: e.querySelector('.vb-region-head')!.getBoundingClientRect().bottom, cut: h2.scrollWidth > h2.clientWidth,
      labelWidth: label.width, headWidth: e.querySelector('.vb-region-head')!.getBoundingClientRect().width };
  });
  // The whole line is the title's: cut only when it is wider than the line, and then it takes all of it.
  if (m.cut) expect(m.labelWidth, 'a cut title takes the whole line').toBeGreaterThanOrEqual(m.headWidth - 1);
  expect(Math.abs(m.labelMid - m.frameMid), 'the label is centred on the frame').toBeLessThanOrEqual(1);
  expect(m.toolsLeft).toBeLessThan(m.frameLeft);
  expect(m.toolsTop, 'the rail starts under the top line').toBeGreaterThan(m.headBottom);
  // The same controls, in the same order: six layouts, the widths switch, Comment and the cog.
  const names = await f.locator('.vb-mode-row button').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label')));
  expect(names).toEqual(['Grid', 'Flow', 'Lanes', 'Radial', 'Column', 'Row', 'Match card widths', `Comment on container ${TITLE}`, `Settings for ${TITLE}`]);
});

test('a narrow frame zoomed out keeps the whole line for its title: the label is cut only when the line itself is short', async ({ page, request }) => {
  await board(page, request);
  for (const k of [1, 0.8, 0.6, 0.56]) {
    await zoomTo(page, k);
    const m = await frame(page).evaluate((e) => {
      const [head, label] = [e.querySelector('.vb-region-head')!.getBoundingClientRect(), e.querySelector('.vb-region-label')!.getBoundingClientRect()];
      return { head: head.width, label: label.width, mid: Math.abs(label.left + label.width / 2 - (head.left + head.width / 2)) };
    });
    // Centred on the line, and never narrower than the line when it is cut (no tool takes a share).
    expect(m.mid, `${k}`).toBeLessThanOrEqual(1);
    expect(m.label, `${k}`).toBeLessThanOrEqual(m.head + 0.5);
  }
});

test('bounds: at every zoom down to FAR_K the rail never reaches a card, a lane label or the next container', async ({ page, request }) => {
  const d = await board(page, request);
  // Comment's badge shows (an unsent note), so the widest rail is measured.
  await act(page, d, { action: 'comment', board: d.board, region: 'p', text: 'Is the order right?' });
  await expect(frame(page)).toHaveAttribute('data-badge', 'unsent');
  const [p, q] = [await boxOf(frame(page, 'p')), await boxOf(frame(page, 'q'))];
  expect(Math.abs(p.y - q.y), 'p and q stand side by side').toBeLessThan(2);
  for (const k of [1, 0.9, 0.8, 0.7, 0.6, 0.56]) {
    await zoomTo(page, k);
    for (const id of ['p', 'q', 'l']) {
      const r = await reach(frame(page, id));
      expect(r.inside, `${id} at ${k}: into the frame`).toBeLessThanOrEqual(INSIDE);
      expect(r.outside, `${id} at ${k}: past the frame`).toBeLessThanOrEqual(OUTSIDE);
      // The cards and lane labels drawn in this frame (their centres inside it), level with the rail.
      const nearest = await page.evaluate(({ id, top, bottom }) => {
        const fr = document.querySelector(`vb-region[data-region="${id}"]`)!.getBoundingClientRect();
        const inFrame = (b: DOMRect) => b.left + b.width / 2 > fr.left && b.left + b.width / 2 < fr.right
          && b.top + b.height / 2 > fr.top && b.top + b.height / 2 < fr.bottom;
        const drawn = [...document.querySelectorAll('vb-node, .vb-lane-label')].map((c) => c.getBoundingClientRect()).filter(inFrame);
        return Math.min(...drawn.filter((b) => b.bottom > top && b.top < bottom).map((b) => b.left), Infinity);
      }, { id, top: r.top, bottom: r.bottom });
      expect(nearest - r.right, `${id} at ${k}: clear of its cards`).toBeGreaterThanOrEqual(0);
    }
    const [pr, qr] = [await boxOf(frame(page, 'p')), await reach(frame(page, 'q'))];
    expect(qr.frameLeft - qr.outside - (pr.x + pr.width), `q's rail at ${k}: clear of p`).toBeGreaterThanOrEqual(2);
  }
});

// The dimmed-at-rest look is the railOnHover flag off (?flags=-railOnHover); on, the rest strength is the
// container in use's and the others hide (container-rail-hover.spec.ts).
test('dim at rest, lit on hover, on focus and while a popover is open; Comment\'s badge is never dimmed', async ({ page, request }) => {
  const d = await board(page, request, '?flags=-railOnHover');
  await zoomTo(page, 1);
  const f = frame(page);
  const rest = Number(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--vb-rail-rest')));
  expect(rest).toBeGreaterThan(0);
  expect(rest).toBeLessThan(1);
  expect(await iconOpacity(f)).toBeCloseTo(rest, 2);
  await rail(page).hover();
  expect(await iconOpacity(f)).toBe(1);
  await page.mouse.move(2, 990);
  expect(await iconOpacity(f)).toBeCloseTo(rest, 2);
  await f.locator('.vb-mseg[role="radio"][aria-checked="true"]').focus();
  expect(await iconOpacity(f)).toBe(1);
  await f.locator('.vb-mseg[role="radio"][aria-checked="true"]').blur();
  expect(await iconOpacity(f)).toBeCloseTo(rest, 2);
  // An open popover with neither the pointer nor focus on the rail: the menu, opened without focus.
  await f.evaluate((e) => (e as HTMLElement & { showPanel(w: string, o: object): void }).showPanel('menu', { focus: false }));
  await expect(f).toHaveAttribute('data-open', 'menu');
  expect(await iconOpacity(f)).toBe(1);
  await page.keyboard.press('Escape');
  await page.mouse.click(2, 990);
  await expect(f).not.toHaveAttribute('data-open');
  // The badge (an unsent note) keeps full strength on a resting rail.
  await act(page, d, { action: 'comment', board: d.board, region: 'p', text: 'Is the order right?' });
  await expect(f).toHaveAttribute('data-badge', 'unsent');
  expect(await iconOpacity(f)).toBeCloseTo(rest, 2);
  const badge = await f.locator('.vb-region-badge').evaluate((b) => {
    let o = 1;
    for (let e: Element | null = b; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity);
    return o;
  });
  expect(badge).toBe(1);
});

for (const theme of THEMES) {
  test(`APCA: every icon at rest on the canvas and on the rail (Lc 30 in light; dark's trial numbers reported); lit, the quiet icon is as before (${theme})`, async ({ page, request }) => {
    await setTheme(page, theme);
    await board(page, request, '?flags=-railOnHover');
    await zoomTo(page, 1);
    const f = frame(page);
    const rest = await iconOpacity(f);
    const [canvas, fill] = await Promise.all([pixel(page, await resolved(page, 'var(--vb-surface-canvas)')),
      f.locator('.vb-mode-row').evaluate((e) => getComputedStyle(e).backgroundColor).then((c) => pixel(page, c))]);
    const [measured, lcs]: [string[], number[]] = [[], []];
    for (const sel of ['.vb-mseg[aria-checked="false"]', '.vb-mseg[role="radio"][aria-checked="true"]', '.vb-cog']) {
      const b = f.locator(sel).first();
      const [ink, back] = await b.evaluate((e) => [getComputedStyle(e).color, getComputedStyle(e).backgroundColor]);
      const own = back === 'rgba(0, 0, 0, 0)' ? fill : await pixel(page, back);
      const icon = await pixel(page, ink);
      const blend = (under: [number, number, number]) => icon.map((c, i) => Math.round(rest * c + (1 - rest) * under[i]!)) as [number, number, number];
      measured.push(`${sel} on its fill ${lc(blend(own), own).toFixed(1)}`, `${sel} on the canvas ${lc(blend(canvas), canvas).toFixed(1)}`);
      lcs.push(lc(blend(own), own), lc(blend(canvas), canvas));
    }
    // The dark rest value is a trial (rail polish task, 2026-10-26: 0.5 in both themes). Its numbers are
    // reported here, never hidden: light keeps the decoration tier (Lc 30, D-009); dark is under it
    // until the maintainer rules, and then this becomes the tier's check again (or the token moves).
    test.info().annotations.push({ type: `apca-rest-${theme}`, description: `opacity ${rest}: ${measured.join('; ')}` });
    console.log(`APCA rest ${theme} (opacity ${rest}): ${measured.join('; ')}`);
    if (theme === 'light') for (const v of lcs) expect(v, 'at rest').toBeGreaterThanOrEqual(30);
    // Lit, the quiet icon is the row's as before: --vb-ink-subtle at full strength; only the opacity rests.
    await f.locator('.vb-mseg[role="radio"][aria-checked="true"]').hover();
    const cog = f.locator('.vb-cog');
    expect(await cog.locator('.vb-mode-icon').evaluate((e) => Number(getComputedStyle(e).opacity))).toBe(1);
    expect(await pixel(page, await cog.evaluate((e) => getComputedStyle(e).color))).toEqual(await pixel(page, await resolved(page, 'var(--vb-ink-subtle)')));
  });
}

test('flag off (?flags=-toolRail): the row is on the top line after the title, as before', async ({ page, request }) => {
  await board(page, request, '?flags=-toolRail');
  const f = frame(page);
  await expect(f).not.toHaveAttribute('data-rail');
  await expect(f.locator('.vb-region-rail')).toHaveCount(0);
  await expect(f.locator('.vb-region-head .vb-region-bar > .vb-region-tools > .vb-mode-row')).toHaveCount(1);
});
