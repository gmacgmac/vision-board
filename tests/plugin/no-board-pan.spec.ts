// With no board open ("No boards yet"), panning and zooming the stage do nothing and throw nothing: the viewport's moves
// reach no board (controller.ts `vp.onApply`). The harness fails the test on any page error.
import { drawPlans, drawn, drive, expect, openHost, test } from './harness.ts';

test('no board open: scrolling, ctrl-scrolling and dragging the stage throw nothing, and a board drawn after still opens', async ({ page, host }) => {
  await openHost(page, host);
  const stage = page.locator('.host-root .vb-stage');
  await expect(page.locator('.host-root')).toContainText('No boards yet');
  const box = (await stage.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 120);
  await page.mouse.wheel(40, 0);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -120);
  await page.keyboard.up('Control');
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 40, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  expect(await drive(page, 'pageChip')).toBe(null);
  await drive(page, 'reveal', { board: 'plans' });
  await drawPlans(host);
  await drawn(page);
});

test('the last board archived: panning and zooming the empty stage after it throw nothing', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host);
  await drawn(page);
  const archived = await host.engine.route({ method: 'POST', path: 'boards/plans/act', body: { type: 'act', action: 'archive', board: 'plans' } }, { caller: { by: 'person' } });
  expect(archived?.status).toBe(201);
  await expect.poll(() => drive(page, 'pageChip')).toBe(null);
  const box = (await page.locator('.host-root .vb-stage').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 120);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -120);
  await page.keyboard.up('Control');
  await page.waitForTimeout(200);
});
