// Notes on a whole container and dragging containers (3_FE_04 rulings 2-8): Comment on a frame's
// title line opens the note bubble beside it (one unsent note, edit, Remove, read-only after Send);
// the grip moves the frame and its cards and writes one container pin; a plain drag on the title
// line still pans and Shift+drag still lassoes; containers never overlap; "Put container back"
// unpins; Alt+arrows on the grip move it; C or N on the title line opens the note. Runs on its own
// board, "frames", written through the API by an agent, so no other file's board changes.
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const BOARD = 'frames';
const THEMES: Theme[] = ['dark', 'light'];
type Point = { x: number; y: number };
type Box = Point & { width: number; height: number };

const frame = (page: Page, region: string) => page.locator(`vb-region[data-region="${region}"]`);
const grip = (page: Page, region: string) => frame(page, region).locator('.vb-region-grip');
const card = (page: Page, n: number) => page.locator(`vb-node[data-id="${n}"]`);
const bubble = (page: Page) => page.locator('vb-note-bubble');
const text = (page: Page) => bubble(page).getByLabel('Note text');
const comment = (page: Page, title: string) => page.getByRole('button', { name: `Comment on container ${title}` });

/** Board "frames": three containers, items in two of them, a link across two. Written once. */
async function ensureBoard(request: APIRequestContext): Promise<void> {
  const boards = await (await request.get('/api/boards')).json() as { boards: { board: string }[] };
  if (boards.boards.some((b) => b.board === BOARD)) return;
  const j = await request.post('/api/agents', { data: { label: 'Frames chat' } });
  expect(j.status(), await j.text()).toBe(201);
  const { secret } = await j.json() as { secret: string };
  const node = (region: string, title: string, key: string) =>
    ({ type: 'node', key, node: { region, kind: 'question', title, item: true } });
  const r = await request.post(`/api/boards/${BOARD}/write`, {
    headers: { Authorization: `Bearer ${secret}` },
    data: { items: [
      { type: 'board', title: 'Frames' },
      { type: 'region', region: { id: 'plan', title: 'Plan', mode: 'grid' } },
      { type: 'region', region: { id: 'risks', title: 'Risks', mode: 'grid' } },
      { type: 'region', region: { id: 'parked', title: 'Parked', mode: 'grid' } },
      node('plan', 'Ship the beta in May?', 'p1'), node('plan', 'Who signs off the copy?', 'p2'),
      node('risks', 'Is the import too slow?', 'r1'), node('parked', 'Dark mode for print?', 'k1'),
      { type: 'link', from: { key: 'p1' }, to: { key: 'r1' }, label: 'blocks' },
    ] },
  });
  expect(r.status(), await r.text()).toBe(200);
}

async function openFrames(page: Page): Promise<void> {
  await page.goto(`/?frames#${BOARD}`);
  await expect(page.locator('vb-node')).toHaveCount(4);
  await expect(page.locator('#world')).not.toHaveClass(/no-anim/);
  await expect(page.locator('#wires')).not.toHaveClass(/settling/);
}

const api = (page: Page, path: string) => page.request.get(`/api${path}`).then((r) => r.json());
const head = async (page: Page) => (await api(page, `/boards/${BOARD}`)).head as number;
const linesAfter = async (page: Page, after: number) => (await api(page, `/ledger?after=${after}&board=${BOARD}`)).events as Record<string, unknown>[];
const regionPins = async (page: Page) => ((await api(page, `/boards/${BOARD}`)).state.regionPins ?? {}) as Record<string, Point>;
const boxOf = async (page: Page, sel: ReturnType<Page['locator']>): Promise<Box> => (await sel.boundingBox())!;
const centre = (b: Box): Point => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
const scale = (page: Page) => page.locator('#world').evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).a);
const settled = async (page: Page) => expect(page.locator('#wires')).not.toHaveClass(/settling/);

/** Press on `from`, move to `to` in steps, run `during`, let go. */
async function drag(page: Page, from: Point, to: Point, during?: () => Promise<void>): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await during?.();
  await page.mouse.up();
}

function apart(boxes: Box[]): boolean {
  return boxes.every((a, i) => boxes.every((b, j) => j <= i
    || a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y));
}

/** Every container back where the layout puts it (setup and clean-up). */
async function putAllBack(page: Page): Promise<void> {
  for (const region of Object.keys(await regionPins(page))) {
    const r = await page.request.post(`/api/boards/${BOARD}/act`, { data: { type: 'act', action: 'unpin', board: BOARD, region } });
    expect(r.status(), await r.text()).toBe(201);
  }
}

test.beforeEach(async ({ page, request }) => {
  await page.goto('/?setup');
  await ensureBoard(request);
  await putAllBack(page);
});

test('Comment on the title line opens the bubble beside it; Enter adds one note, shown as a pin and a "Your note" line', async ({ page }) => {
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
  const pin = frame(page, 'plan').locator('.vb-region-note-pin');
  await expect(pin).toHaveText('1');
  await expect(frame(page, 'plan').locator('.vb-region-note-text')).toHaveText('Is the plan in the right order?');
  const lines = await linesAfter(page, before);
  expect(lines.map((e) => [e.action, e.board, e.region, e.n, e.text])).toEqual([['comment', BOARD, 'plan', undefined, 'Is the plan in the right order?']]);
  // Pressing Comment again opens that note to edit, with Remove: never a second note.
  await comment(page, 'Plan').click();
  await expect(page.getByRole('dialog', { name: 'Edit note on container Plan' })).toBeVisible();
  await expect(text(page)).toHaveValue('Is the plan in the right order?');
  await text(page).fill('Is May realistic?');
  await page.keyboard.press('Enter');
  await expect(frame(page, 'plan').locator('.vb-region-note-text')).toHaveText('Is May realistic?');
  expect((await linesAfter(page, before)).map((e) => e.action)).toEqual(['comment', 'note-edit']);
  // The pin opens it too; Remove takes it back.
  await pin.click();
  await bubble(page).getByRole('button', { name: 'Remove' }).click();
  await expect(pin).toBeHidden();
  await expect(frame(page, 'plan').locator('.vb-region-note')).toBeHidden();
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

test('after Send the container note is history: the pin reads it, and Comment starts note 2', async ({ page }) => {
  await openFrames(page);
  await comment(page, 'Parked').click();
  await text(page).fill('Should this wait for v2?');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Send to agent' }).click();
  const pin = frame(page, 'parked').locator('.vb-region-note-pin');
  await expect(pin).toHaveAttribute('data-sent', '');
  await expect(frame(page, 'parked').locator('.vb-region-note-who')).toHaveText('Your note · Sent');
  await pin.click();
  const read = page.getByRole('dialog', { name: 'Note 1 on container Parked, sent' });
  await expect(read).toBeVisible();
  await expect(read.locator('textarea')).toHaveCount(0);
  await read.getByRole('button', { name: 'Close' }).click();
  await comment(page, 'Parked').click();
  await expect(page.getByRole('dialog', { name: 'Note on container Parked' })).toBeVisible();
  await text(page).fill('One more thought.');
  await page.keyboard.press('Enter');
  await expect(pin).toHaveText('2');
  await expect(pin).not.toHaveAttribute('data-sent', '');
});

test('the grip moves the frame and its cards; the drop writes one container pin; Put container back undoes it', async ({ page }) => {
  await openFrames(page);
  const before = await head(page);
  const f0 = await boxOf(page, frame(page, 'risks'));
  const c0 = await boxOf(page, card(page, 3));
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
  const c1 = await boxOf(page, card(page, 3));
  expect([Math.round(f1.x - f0.x), Math.round(f1.y - f0.y)]).toEqual([0, d.y]);
  expect([Math.round(c1.x - c0.x), Math.round(c1.y - c0.y)]).toEqual([0, d.y]);
  const lines = await linesAfter(page, before);
  expect(lines.map((e) => [e.action, e.board, e.region, e.n])).toEqual([['pin', BOARD, 'risks', undefined]]);
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

test('a plain drag on the title line pans and writes nothing; Shift+drag on it draws the lasso', async ({ page }) => {
  await openFrames(page);
  const before = await head(page);
  const title = frame(page, 'plan').locator('h2');
  const f0 = await boxOf(page, frame(page, 'plan'));
  const t = centre(await boxOf(page, title));
  await drag(page, t, { x: t.x + 120, y: t.y + 40 });
  const f1 = await boxOf(page, frame(page, 'plan'));
  expect([Math.round(f1.x - f0.x), Math.round(f1.y - f0.y)]).toEqual([120, 40]);
  expect(await head(page)).toBe(before);
  const t2 = centre(await boxOf(page, title));
  await page.keyboard.down('Shift');
  await drag(page, t2, { x: t2.x + 80, y: t2.y + 60 }, async () => {
    await expect(page.locator('.vb-lasso')).toBeVisible();
  });
  await page.keyboard.up('Shift');
  expect(await head(page)).toBe(before);
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
    await comment(page, 'Plan').click();
    await expect(page.getByRole('dialog', { name: /container Plan/ })).toBeVisible();
    await expectNoAxeViolations(page);
    await page.keyboard.press('Escape');
  });
}
