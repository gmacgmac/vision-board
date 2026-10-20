// Notes on a whole container and dragging containers (3_FE_04 rulings 2-8, step 4G): Comment on
// a frame's title line opens the note bubble beside it (one unsent note, edit, Remove, read-only
// after Send); the note shows only as Comment's badge, its preview (hover or focus: Edit, Show in
// container) and, when shown, the note block that pushes the containers below down; changed words
// are never lost silently (note-discard.spec.ts); the grip, and the title beside it (open list and
// container title FE_02), move the frame and its cards and write one container pin; a drag on the
// line's empty part still pans and Shift+drag on the title still lassoes; containers never overlap; "Put container back" unpins; Alt+arrows on the grip move it;
// C or N on the title line opens the note. Runs on its own board, written through the API by an
// agent, so no other file's board changes.
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import {
  agentWrite, apart, block, bubble, boxOf, card, centre, comment, drag, ensureBoard, frame, frames, fx, grip, head,
  linesAfter, openFrames, preview, putAllBack, regionPins, REGIONS, scale, settled, text,
} from './frames-board.ts';

const THEMES: Theme[] = ['dark', 'light'];

test.beforeEach(async ({ page, request }, info) => {
  await page.goto('/?setup');
  await ensureBoard(request, info.workerIndex);
  await putAllBack(page);
});

test('Comment opens the bubble beside the title line; Enter adds one note, shown only as Comment\'s badge and preview', async ({ page }) => {
  await openFrames(page);
  const before = await head(page);
  await comment(page, 'Plan').click();
  await expect(page.getByRole('dialog', { name: 'Note on container Plan' })).toBeVisible();
  await expect(text(page)).toBeFocused();
  await expect(bubble(page)).toHaveAttribute('data-on', 'container');
  // Beside the title line, its arrow on it.
  const [f, b] = [await boxOf(page, frame(page, 'plan').locator('.vb-region-head')), await boxOf(page, bubble(page))];
  expect(b.x > f.x + f.width || b.x + b.width < f.x || b.y > f.y + f.height).toBe(true);
  await page.keyboard.type('Is the plan in the right order?');
  await page.keyboard.press('Enter');
  await expect(bubble(page)).toBeHidden();
  // No pin and no "Your note" line: the badge "1", bright while unsent (ruling 1).
  await expect(frame(page, 'plan')).toHaveAttribute('data-badge', 'unsent');
  await expect(comment(page, 'Plan')).toHaveAccessibleName('Comment on container Plan, 1 unsent note');
  await expect(frame(page, 'plan').locator('.vb-region-note-pin, .vb-region-note-who')).toHaveCount(0);
  await expect(block(page, 'plan')).toBeHidden();
  const lines = await linesAfter(page, before);
  expect(lines.map((e) => [e.action, e.board, e.region, e.n, e.text])).toEqual([['comment', fx.board, 'plan', undefined, 'Is the plan in the right order?']]);
  // Pressing Comment again opens that note to edit: never a second note.
  await comment(page, 'Plan').click();
  await expect(page.getByRole('dialog', { name: 'Edit note on container Plan' })).toBeVisible();
  await expect(text(page)).toHaveValue('Is the plan in the right order?');
  await text(page).fill('Is May realistic?');
  await page.keyboard.press('Enter');
  await expect(bubble(page)).toBeHidden();
  // Hover shows the preview: the text, its state, Edit and Show in container (ruling 2).
  await comment(page, 'Plan').hover();
  await expect(preview(page, 'plan')).toBeVisible();
  await expect(preview(page, 'plan').locator('.vb-note-pop-text')).toHaveText('Is May realistic?');
  await expect(preview(page, 'plan').locator('.vb-note-state')).toHaveText('Unsent');
  await expect(preview(page, 'plan').getByRole('button', { name: 'Show in container' })).toBeVisible();
  // Edit opens the bubble; Remove there takes the note back.
  await preview(page, 'plan').getByRole('button', { name: 'Edit' }).click();
  await expect(page.getByRole('dialog', { name: 'Edit note on container Plan' })).toBeVisible();
  await bubble(page).getByRole('button', { name: 'Remove' }).click();
  await expect(frame(page, 'plan').locator('.vb-region-badge')).toBeHidden();
  expect((await linesAfter(page, before)).map((e) => e.action)).toEqual(['comment', 'note-edit', 'note-remove']);
});

test('C or N with focus on the title line opens the container note; Esc cancels and gives focus back', async ({ page }) => {
  await openFrames(page);
  const before = await head(page);
  await grip(page, 'risks').focus();
  await page.keyboard.press('c');
  await expect(page.getByRole('dialog', { name: 'Note on container Risks' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(bubble(page)).toBeHidden();
  await expect(grip(page, 'risks')).toBeFocused();
  await page.keyboard.press('n');
  await expect(page.getByRole('dialog', { name: 'Note on container Risks' })).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await head(page)).toBe(before);
});

test('after Send the badge goes quiet and the preview opens the note read-only; the answer takes the badge away', async ({ page, request }) => {
  await openFrames(page);
  const before = await head(page);
  await comment(page, 'Parked').click();
  await text(page).fill('Should this wait for v2?');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Send to agent' }).click();
  await expect(frame(page, 'parked')).toHaveAttribute('data-badge', 'sent');
  await expect(comment(page, 'Parked')).toHaveAccessibleName('Comment on container Parked, 1 sent note waiting for the agent');
  await comment(page, 'Parked').hover();
  await expect(preview(page, 'parked').locator('.vb-note-state')).toHaveText('Sent, waiting for the agent');
  await preview(page, 'parked').getByRole('button', { name: 'Open' }).click();
  const read = page.getByRole('dialog', { name: 'Note 1 on container Parked, sent' });
  await expect(read).toBeVisible();
  await expect(read.locator('textarea')).toHaveCount(0);
  await read.getByRole('button', { name: 'Close' }).click();
  // The agent answers: pendingItems no longer lists the container, so the badge goes.
  const note = (await linesAfter(page, before)).find((e) => e.action === 'comment')!;
  await agentWrite(request, [{ type: 'reply', n: fx.n.k1, text: 'Yes, after v2.', to: note.seq }]);
  await expect(frame(page, 'parked').locator('.vb-region-badge')).toBeHidden();
  await expect(comment(page, 'Parked')).toHaveAccessibleName('Comment on container Parked');
  await expect(frame(page, 'parked')).toHaveAttribute('data-note-stage', 'answered');
  // Comment starts note 2, bright again.
  await comment(page, 'Parked').click();
  await expect(bubble(page)).toHaveAttribute('aria-label', 'Note on container Parked');
  await text(page).fill('One more thought.');
  await page.keyboard.press('Enter');
  await expect(frame(page, 'parked')).toHaveAttribute('data-badge', 'unsent');
});


test('Show in container draws the note block above the cards and pushes the containers below down; Hide puts all back', async ({ page }) => {
  await openFrames(page);
  await comment(page, 'Plan').click();
  await text(page).fill('Check the order before May.');
  await page.keyboard.press('Enter');
  await expect(frame(page, 'plan')).toHaveAttribute('data-badge', 'unsent');
  await settled(page);
  const [f0, c0, before] = [await frames(page), await boxOf(page, card(page, 'p1')), await head(page)];
  // Keyboard focus on Comment opens the preview too (ruling 2).
  await comment(page, 'Plan').focus();
  await expect(preview(page, 'plan')).toBeVisible();
  await preview(page, 'plan').getByRole('button', { name: 'Show in container' }).click();
  await expect(block(page, 'plan')).toBeVisible();
  await expect(block(page, 'plan').locator('.vb-nblock-text')).toHaveText('Check the order before May.');
  await expect.poll(async () => (await boxOf(page, frame(page, 'plan'))).height).toBeGreaterThan(f0[0]!.height + 10);
  await settled(page);
  const [f1, c1] = [await frames(page), await boxOf(page, card(page, 'p1'))];
  const grow = f1[0]!.height - f0[0]!.height;
  // The cards start below the block; every container below Plan moved down to make room.
  expect(Math.abs(c1.y - c0.y - grow)).toBeLessThan(2);
  const below = REGIONS.map((_, i) => i).filter((i) => i > 0 && f0[i]!.y >= f0[0]!.y + f0[0]!.height - 1);
  expect(below.length).toBeGreaterThan(0);
  for (const i of below) expect(f1[i]!.y).toBeGreaterThan(f0[i]!.y);
  // Page state only: nothing is written.
  expect(await head(page)).toBe(before);
  await comment(page, 'Plan').hover();
  await preview(page, 'plan').getByRole('button', { name: 'Hide' }).click();
  await expect(block(page, 'plan')).toBeHidden();
  await expect.poll(() => frames(page)).toEqual(f0);
  // Shown again, then reloaded: hidden (not in the ledger, ruling 3).
  await comment(page, 'Plan').hover();
  await preview(page, 'plan').getByRole('button', { name: 'Show in container' }).click();
  await expect(block(page, 'plan')).toBeVisible();
  await page.reload();
  await expect(page.locator('vb-node')).toHaveCount(7);
  await expect(frame(page, 'plan')).toHaveAttribute('data-badge', 'unsent');
  await expect(block(page, 'plan')).toBeHidden();
  // The block's Remove takes the note back (unsent only).
  await comment(page, 'Plan').hover();
  await preview(page, 'plan').getByRole('button', { name: 'Show in container' }).click();
  // The preview stays while focus is in it; Esc closes it, focus back on Comment.
  await page.keyboard.press('Escape');
  await expect(preview(page, 'plan')).toBeHidden();
  await expect(comment(page, 'Plan')).toBeFocused();
  await block(page, 'plan').getByRole('button', { name: 'Remove note on container Plan' }).click();
  await expect(frame(page, 'plan').locator('.vb-region-badge')).toBeHidden();
  await expect(block(page, 'plan')).toBeHidden();
  expect((await linesAfter(page, before)).map((e) => [e.action, e.region])).toEqual([['note-remove', 'plan']]);
  await expect.poll(() => frames(page)).toEqual(f0);
});

test('Remove in the note block closes that note\'s open bubble', async ({ page }) => {
  await openFrames(page);
  await comment(page, 'Plan').click();
  await text(page).fill('Gone soon.');
  await page.keyboard.press('Enter');
  await expect(frame(page, 'plan')).toHaveAttribute('data-badge', 'unsent');
  await comment(page, 'Plan').hover();
  await preview(page, 'plan').getByRole('button', { name: 'Show in container' }).click();
  await expect(block(page, 'plan')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(preview(page, 'plan')).toBeHidden();
  // The block's Edit opens the bubble on the note; Remove in the block, with the bubble still up.
  await block(page, 'plan').getByRole('button', { name: 'Edit note on container Plan' }).click();
  await expect(bubble(page)).toBeVisible();
  await expect(text(page)).toHaveValue('Gone soon.');
  await block(page, 'plan').getByRole('button', { name: 'Remove note on container Plan' }).focus();
  await page.keyboard.press('Enter');
  await expect(block(page, 'plan')).toBeHidden();
  await expect(bubble(page)).toBeHidden();
  await expect(frame(page, 'plan')).not.toHaveAttribute('data-note-open', '');
});

test('the grip moves the frame and its cards; the drop writes one container pin; Put container back undoes it', async ({ page }) => {
  await openFrames(page);
  const before = await head(page);
  const f0 = await boxOf(page, frame(page, 'risks'));
  const c0 = await boxOf(page, card(page, 'r1'));
  const g = centre(await boxOf(page, grip(page, 'risks')));
  const d = { x: 0, y: Math.round(f0.height + 80) };
  await drag(page, g, { x: g.x + d.x, y: g.y + d.y }, async () => {
    // While dragging, the frame and its card follow the pointer.
    const mid = await boxOf(page, frame(page, 'risks'));
    expect(Math.abs(mid.y - (f0.y + d.y))).toBeLessThan(2);
  });
  await settled(page);
  await expect.poll(() => regionPins(page).then((p) => Object.keys(p))).toEqual(['risks']);
  const f1 = await boxOf(page, frame(page, 'risks'));
  const c1 = await boxOf(page, card(page, 'r1'));
  expect([Math.round(f1.x - f0.x), Math.round(f1.y - f0.y)]).toEqual([0, d.y]);
  expect([Math.round(c1.x - c0.x), Math.round(c1.y - c0.y)]).toEqual([0, d.y]);
  const lines = await linesAfter(page, before);
  expect(lines.map((e) => [e.action, e.board, e.region, e.n])).toEqual([['pin', fx.board, 'risks', undefined]]);
  // The cog's Put container back writes unpin and returns it.
  await frame(page, 'risks').getByRole('button', { name: 'Settings for Risks' }).click();
  await frame(page, 'risks').getByRole('menuitem', { name: 'Put container back' }).click();
  await settled(page);
  await expect.poll(() => regionPins(page)).toEqual({});
  expect(await boxOf(page, frame(page, 'risks'))).toEqual(f0);
  expect((await linesAfter(page, before)).map((e) => e.action)).toEqual(['pin', 'unpin']);
  // Not moved: the item is greyed out with its hint.
  await frame(page, 'plan').getByRole('button', { name: 'Settings for Plan' }).click();
  const back = frame(page, 'plan').getByRole('menuitem', { name: 'Put container back' });
  await expect(back).toHaveAttribute('aria-disabled', 'true');
  await expect(back).toContainText('Not moved');
  await page.keyboard.press('Escape');
});

test('a drag on the title moves the container like the grip; one on the line\'s empty part pans and writes nothing; Shift+drag on the title draws the lasso', async ({ page }) => {
  await openFrames(page);
  const title = frame(page, 'plan').locator('h2');
  const [f0, r0] = [await boxOf(page, frame(page, 'plan')), await boxOf(page, frame(page, 'backlog'))];
  const t = centre(await boxOf(page, title));
  await drag(page, t, { x: t.x, y: t.y + 40 });
  await settled(page);
  await expect.poll(() => regionPins(page).then((p) => Object.keys(p))).toEqual(['plan']);
  expect(Math.abs((await boxOf(page, frame(page, 'plan'))).y - f0.y - 40)).toBeLessThanOrEqual(1);
  await putAllBack(page);
  await expect.poll(async () => boxOf(page, frame(page, 'plan'))).toEqual(f0);
  const before = await head(page);
  // The line outside the label and the tools is the frame's own, so a drag there pans: every frame
  // moves on screen, and nothing is written. The wider of the two empty stretches: before the label
  // (centred or sliding) or between it and the tools (at the start).
  const part = (sel: string) => boxOf(page, frame(page, 'backlog').locator(sel));
  const [line, label, tools] = [await part('.vb-region-head'), await part('.vb-region-label'), await part('.vb-region-tools')];
  const [lead, gap] = [label.x - line.x, tools.x - (label.x + label.width)];
  expect(Math.max(lead, gap)).toBeGreaterThanOrEqual(10);
  const from = { x: lead > gap ? line.x + lead / 2 : tools.x - gap / 2, y: label.y + label.height / 2 };
  await drag(page, from, { x: from.x + 120, y: from.y + 40 });
  const [f2, r1] = [await boxOf(page, frame(page, 'plan')), await boxOf(page, frame(page, 'backlog'))];
  expect([Math.round(r1.x - r0.x), Math.round(r1.y - r0.y), Math.round(f2.x - f0.x), Math.round(f2.y - f0.y)]).toEqual([120, 40, 120, 40]);
  expect(await head(page)).toBe(before);
  const t2 = centre(await boxOf(page, title));
  await page.keyboard.down('Shift');
  await drag(page, t2, { x: t2.x + 80, y: t2.y + 60 }, async () => {
    await expect(page.locator('.vb-lasso')).toBeVisible();
  });
  await page.keyboard.up('Shift');
  // The lasso writes no act; the cards it selects are marked seen (proposals-seen-parking FE_02).
  expect((await linesAfter(page, before)).filter((e) => e.type !== 'seen')).toEqual([]);
});

test('dropped over another container, the dropped one stays and the other makes room: no overlaps', async ({ page }) => {
  await openFrames(page);
  const plan0 = await boxOf(page, frame(page, 'plan'));
  const g = centre(await boxOf(page, grip(page, 'parked')));
  const p0 = await boxOf(page, frame(page, 'parked'));
  // Put parked's top left 30 px inside plan's.
  const to = { x: g.x + (plan0.x + 30 - p0.x), y: g.y + (plan0.y + 20 - p0.y) };
  await drag(page, g, to);
  await settled(page);
  await expect.poll(() => regionPins(page).then((p) => Object.keys(p))).toEqual(['parked']);
  const boxes = await Promise.all(['plan', 'risks', 'parked'].map((r) => boxOf(page, frame(page, r))));
  const parked = boxes[2]!;
  expect([Math.round(parked.x - (plan0.x + 30)), Math.round(parked.y - (plan0.y + 20))]).toEqual([0, 0]);
  expect(apart(boxes)).toBe(true);
  expect(boxes[0]!.x >= plan0.x - 1 && boxes[0]!.y >= plan0.y - 1).toBe(true);
});

test('Alt+arrows on the grip move the container by the cards\' step, one pin per press', async ({ page }) => {
  await openFrames(page);
  const before = await head(page);
  const f0 = await boxOf(page, frame(page, 'plan'));
  const k = await scale(page);
  await grip(page, 'plan').focus();
  await page.keyboard.press('Alt+ArrowRight');
  await expect.poll(() => regionPins(page).then((p) => Object.keys(p))).toEqual(['plan']);
  await settled(page);
  const f1 = await boxOf(page, frame(page, 'plan'));
  expect(Math.round(f1.x - f0.x)).toBe(Math.round(16 * k));
  await page.keyboard.press('Alt+ArrowDown');
  await expect.poll(async () => (await linesAfter(page, before)).length).toBe(2);
  const lines = await linesAfter(page, before);
  expect(lines.map((e) => [e.action, e.region])).toEqual([['pin', 'plan'], ['pin', 'plan']]);
  expect((lines[1]!.y as number) - (lines[0]!.y as number)).toBe(16);
  expect(lines[1]!.x).toBe(lines[0]!.x);
  await expect(grip(page, 'plan')).toBeFocused();
});

for (const theme of THEMES) {
  test(`axe passes with a container note open and a moved container (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await openFrames(page);
    await grip(page, 'risks').focus();
    await page.keyboard.press('Alt+ArrowDown');
    await expect.poll(() => regionPins(page).then((p) => Object.keys(p))).toEqual(['risks']);
    // Parked is the last container, panned left (from the empty board under it), so its bubble opens
    // over empty board, not another card's buttons.
    const p = await boxOf(page, frame(page, 'parked'));
    const t = { x: p.x + p.width / 2, y: p.y + p.height + 40 };
    await drag(page, t, { x: t.x - 420, y: t.y });
    await comment(page, 'Parked').click();
    await expect(page.getByRole('dialog', { name: /container Parked/ })).toBeVisible();
    const [b, f] = [await boxOf(page, bubble(page)), await boxOf(page, frame(page, 'parked'))];
    expect(b.x >= f.x + f.width - 1).toBe(true);
    await expectNoAxeViolations(page);
    await page.keyboard.press('Escape');
  });
}
