// A short, narrow pane (docs/specification/plugin.md § A guest in the host's page; the board's window-sized caps): what
// opens stays inside the root, by the root's size and not the window's. The window here is 1600 by 1000.
import type { Locator, Page } from '@playwright/test';
import { drawPlans, expect, openHost, test } from './harness.ts';

/** Shorter and narrower than anything the board's window-sized caps knew. */
const PANE = [420, 300] as const;

/** `inner` lies inside the root's box. */
async function staysIn(page: Page, inner: Locator): Promise<void> {
  const [root, box] = await Promise.all([page.locator('.host-root').boundingBox(), inner.boundingBox()]);
  expect(box, 'shown').toBeTruthy();
  expect(box!.y, 'not above the root').toBeGreaterThanOrEqual(root!.y - 0.5);
  expect(box!.y + box!.height, 'not below the root').toBeLessThanOrEqual(root!.y + root!.height + 0.5);
  expect(box!.x, 'not left of the root').toBeGreaterThanOrEqual(root!.x - 0.5);
  expect(box!.x + box!.width, 'not right of the root').toBeLessThanOrEqual(root!.x + root!.width + 0.5);
}

test.beforeEach(async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host, { size: PANE });
  await expect(page.locator('.host-root vb-node')).toHaveCount(3);
});

test('the "⋯" surface keeps inside a short pane', async ({ page }) => {
  await page.locator('.host-root #vb1-toolbar-menu').click();
  await staysIn(page, page.locator('.host-root .vb-menu-surface[data-fields]'));
});

test('the key help keeps inside a short, narrow pane', async ({ page }) => {
  await page.locator('.host-root .vb-keys-btn').hover();
  const tip = page.locator('.host-root .vb-keys-tip');
  await expect(tip).toBeVisible();
  await staysIn(page, tip);
});

test('the proposals notice keeps inside a narrow pane', async ({ page, host }) => {
  await page.locator('.host-root').evaluate((e) => { (e as HTMLElement).style.width = '220px'; });
  const wrote = await host.tool('write_board', { board: 'plans', items: [{ type: 'propose', n: 1, ver: 1, action: 'cross', reason: 'The client declined', source: 'A message' }] });
  expect(wrote.isError, JSON.stringify(wrote)).toBe(false);
  const notice = page.locator('.host-root .vb-proposals');
  await expect(notice).toBeVisible();
  await staysIn(page, notice);
});

test('the selection pill paints under what opens over it: "⋯" and the key help', async ({ page }) => {
  await page.locator('.host-root vb-node').first().click();
  const pill = page.locator('.host-root vb-selection-bar');
  await expect(pill).toBeVisible();
  const box = (await pill.boundingBox())!;
  const on = () => page.evaluate(({ x, y }) => { const e = document.elementFromPoint(x, y); return e?.closest('vb-selection-bar') ? 'pill' : 'over it'; }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
  const overlaps = async (other: Locator) => { const o = (await other.boundingBox())!; return o.x < box.x + box.width && box.x < o.x + o.width && o.y < box.y + box.height && box.y < o.y + o.height; };
  expect(await on()).toBe('pill');
  await page.locator('.host-root #vb1-toolbar-menu').click();
  expect(await overlaps(page.locator('.host-root .vb-menu-surface[data-fields]')), 'the surface reaches the pill').toBe(true);
  expect(await on()).toBe('over it');
  await page.keyboard.press('Escape');
  await page.locator('.host-root .vb-keys-btn').hover();
  await expect(page.locator('.host-root .vb-keys-tip')).toBeVisible();
  expect(await overlaps(page.locator('.host-root .vb-keys-tip')), 'the box reaches the pill').toBe(true);
  expect(await on()).toBe('over it');
});

test('a tip caps by the root, though a nearer container holds it', async ({ page }) => {
  await page.locator('.host-root').evaluate((e) => { (e as HTMLElement).style.width = '220px'; });
  const cap = () => page.locator('.host-root vb-region .vb-title-tip').first().evaluate((e) => parseFloat(getComputedStyle(e).maxWidth));
  await expect.poll(cap).toBeLessThanOrEqual(176.5);
});

test('the Reply panel keeps inside the pane, whatever its width', async ({ page }) => {
  for (const width of [420, 240]) {
    await page.locator('.host-root').evaluate((e, w) => { (e as HTMLElement).style.width = `${w}px`; }, width);
    await page.locator('.host-root #vb1-toolbar-menu').click();
    await page.getByRole('menuitem', { name: /Reply/ }).click();
    const panel = page.locator('.host-root #vb1-reply');
    await expect(panel).toBeVisible();
    await staysIn(page, panel);
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
  }
});

test('the access strip keeps inside the pane and stacks when narrow: nothing on top of the words', async ({ page, host }) => {
  const other = (await host.engine.route({ method: 'POST', path: 'agents', body: { label: 'A second bot' } }))!.body as { agent: string };
  await host.engine.tools.call('request_grant', { board: 'plans', reason: 'To draw a long plan of what is coming next, in some detail.' }, { caller: { by: 'agent', agent: other.agent } });
  const strip = page.locator('.host-root .vb-access');
  await expect(strip).toBeVisible();
  const root = page.locator('.host-root');
  for (const [w, h] of [[640, 400], [360, 400], [320, 400], [280, 400], [240, 400], [180, 220]] as const) {
    await root.evaluate((e, [a, b]) => { Object.assign((e as HTMLElement).style, { width: `${a}px`, height: `${b}px` }); }, [w, h]);
    await staysIn(page, strip);
    const [allow, words] = await Promise.all([strip.locator('.vb-access-allow').boundingBox(), strip.locator('.vb-access-text').boundingBox()]);
    const clash = allow!.y < words!.y + words!.height - 0.5 && words!.y < allow!.y + allow!.height - 0.5 && allow!.x < words!.x + words!.width - 0.5 && words!.x < allow!.x + allow!.width - 0.5;
    expect(clash, `Allow clear of the words at ${w}`).toBe(false);
    for (const button of [strip.locator('.vb-access-allow'), strip.getByRole('button', { name: /Refuse/ })]) {
      await button.scrollIntoViewIfNeeded(); // the strip scrolls, by the pane's height
      await staysIn(page, button);
    }
    expect((await strip.boundingBox())!.height, `by the pane's height at ${h}`).toBeLessThanOrEqual(h * 0.4 + 1);
  }
});
