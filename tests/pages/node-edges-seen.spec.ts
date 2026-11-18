// The board's side of the node's edges and its skin (FE_02): the skin reaches the board's root; a click
// inside a container clears its new-and-updated pill on this screen only (point 308) and quiets its replies (N47),
// writing nothing; the project's icon library is read with `list_icons` and `paths` when the ledger opens and when an
// `icon` line arrives; a node with an icon is dragged by its grip; the "⋯" menu sets the board's skin; and the moments
// on a pressed mark: a write on its way, one that failed, a press on a locked board. On a board of its own.
import type { Page, Route } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { act, card, open, write } from './agent-board.ts';
import { drawEdges, mark, menuOf } from './edge-board.ts';
import { frame, head, idle, linesAfter, menu, menuButton } from './board-page.ts';

const THEMES: Theme[] = ['dark', 'light'];
const FLAGS = '?vbwork';
const root = (page: Page) => page.locator('.vb-board').first();
const pill = (page: Page, id: string) => frame(page, id).locator('.vb-region-fresh');

test('the board\'s root says its skin; every node draws its marks on its edges; Decision is off the accent pink (D-100 4)', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  await expect(root(page)).toHaveAttribute('data-vb-skin', 'default');
  await expect(page.locator('vb-node[data-edges]')).toHaveCount(4);
  // Each resolved through a probe, so the two colours compare as drawn.
  const [decision, accent] = await card(page, d.n[2]!).evaluate((e) => ['--vb-kind-decision', '--vb-accent'].map((v) => {
    const probe = document.createElement('span');
    probe.style.setProperty('color', `var(${v})`);
    e.append(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    return c;
  }));
  expect(decision).not.toBe(accent);
});

test('a click inside a container clears its pill on this screen only, until its next change; nothing is written; a reload shows it again', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  await write(request, d, [{ type: 'node', node: { region: 'p', kind: 'question', title: 'Is the venue wired?' } }]);
  await expect(pill(page, 'p')).toBeVisible();
  const before = await head(page);
  const f = (await frame(page, 'p').boundingBox())!;
  await page.mouse.click(f.x + f.width - 8, f.y + f.height - 8);
  await expect(frame(page, 'p')).not.toHaveAttribute('data-fresh', '');
  await expect(pill(page, 'p')).toBeHidden();
  await idle(page);
  expect((await linesAfter(page, before)).map((e) => e.type)).toEqual([]);
  await page.reload();
  await expect(pill(page, 'p')).toBeVisible();
  await page.mouse.click(f.x + f.width - 8, f.y + f.height - 8);
  await expect(pill(page, 'p')).toBeHidden();
  // The agent's next change shows it again.
  await write(request, d, [{ type: 'node', node: { region: 'p', kind: 'finding', title: 'The venue is wired' } }]);
  await expect(pill(page, 'p')).toBeVisible();
});

test('a reply to a container\'s note is bright until a click inside the container quiets it (tracker N47)', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  const note = await act(page, d, { action: 'comment', board: d.board, region: 'q', text: 'Who has a licence?' });
  await write(request, d, [{ type: 'reply', n: d.n[3]!, text: 'Two of the crew.', to: note }]);
  const reply = frame(page, 'q').locator('.vb-nblock-reply');
  await expect(reply).toHaveAttribute('data-unseen', '');
  const f = (await frame(page, 'q').boundingBox())!;
  await page.mouse.click(f.x + f.width - 8, f.y + f.height - 8);
  await expect(reply).not.toHaveAttribute('data-unseen', '');
});

test('the icon library: read with paths when the ledger opens and again when an icon line arrives, and the node draws it', async ({ page, request }) => {
  const d = await drawEdges(request);
  const name = `x-dish-${Date.now()}`;
  const reads: string[] = [];
  page.on('request', (r) => { if (r.url().includes('/api/icons')) reads.push(new URL(r.url()).search); });
  await open(page, d, FLAGS);
  await expect.poll(() => reads).toEqual(['?paths=true']);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 20l4-9 4 9"/><path d="M6 16h4"/></svg>';
  const r = await request.post('/api/icons', { headers: { Authorization: `Bearer ${d.agent.secret}` }, data: { name, title: 'Dish', svg } });
  expect(r.status(), await r.text()).toBeLessThan(300);
  // The first node naming it writes the icon line (BE_04): the page reads the library again and the tile draws it.
  await write(request, d, [{ type: 'node', node: { region: 'q', kind: 'finding', title: 'The dish', icon: name } }]);
  const tile = page.locator('vb-node', { hasText: 'The dish' }).locator('.vb-node-tile');
  await expect(tile.locator('path')).toHaveCount(2);
  expect(reads).toEqual(['?paths=true', '?paths=true']);
});

test('a node with an icon is dragged by the grip in the middle of its top line', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  const f = card(page, d.n[1]!);
  const grip = f.locator('.vb-node-grip');
  await expect(grip).toBeVisible();
  const before = await head(page);
  const g = (await grip.boundingBox())!;
  const q = (await frame(page, 'q').boundingBox())!;
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await page.mouse.down();
  await page.mouse.move(q.x + q.width / 2, q.y + q.height / 2, { steps: 8 });
  await page.mouse.up();
  await idle(page);
  expect((await linesAfter(page, before)).some((e) => e.action === 'move' || e.action === 'pin')).toBe(true);
});

test('the skin: the "⋯" menu lists each skin, the board\'s ticked; a choice writes the skin act and the board draws in it', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  await menuButton(page).click();
  const rows = menu(page).getByRole('menuitemradio');
  await expect(rows).toHaveText([/Default skin/, /Command Lens skin/]);
  await expect(rows.first()).toHaveAttribute('aria-checked', 'true');
  const before = await head(page);
  await rows.nth(1).click();
  await expect(root(page)).toHaveAttribute('data-vb-skin', 'command-lens');
  await expect(card(page, d.n[0]!)).toHaveAttribute('data-answer-at', 'switch');
  const skins = (await linesAfter(page, before)).filter((e) => e.action === 'skin');
  expect(skins.map((e) => [e.skin, e.board])).toEqual([['command-lens', d.board]]);
});

test('a locked board: the disc looks as at rest; a press turns it into a lock with "Board is locked" for a moment and writes nothing', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  const [q] = d.n as [number];
  await act(page, d, { action: 'lock', board: d.board });
  const disc = mark(page, q, 'answer');
  await expect(disc).toHaveAttribute('data-answer', 'waiting');
  await expect(disc).not.toHaveAttribute('data-locked');
  const before = await head(page);
  // Paused (aria-disabled, its reason in its title), it still takes a press, as a person can make.
  await disc.click({ force: true });
  await expect(disc).toHaveAttribute('data-locked', '');
  await expect(page.locator('.vb-mark-tip')).toHaveText('Board is locked');
  await expect(menuOf(page, `Answer item ${q}`)).toHaveCount(0);
  await expect(disc).not.toHaveAttribute('data-locked', '', { timeout: 4000 });
  // The popover only: no toast (FIX_01), and X on the node says it on the disc the same way.
  await expect(page.locator('#toast')).toBeHidden();
  await card(page, q).focus();
  await page.keyboard.press('x');
  await expect(disc).toHaveAttribute('data-locked', '');
  await expect(page.locator('.vb-mark-tip')).toHaveText('Board is locked');
  await expect(page.locator('#toast')).toBeHidden();
  await expect(disc).not.toHaveAttribute('data-locked', '', { timeout: 4000 });
  // The bookmark still works on a locked board.
  await mark(page, q, 'number').click();
  await expect(mark(page, q, 'number')).toHaveAttribute('aria-pressed', 'true');
  await idle(page);
  expect((await linesAfter(page, before)).map((e) => e.action)).toEqual(['bookmark']);
});

test.describe('a write that fails', () => {
  test.use({ expected: { problems: [/500/, /Failed to load resource/] } });
  test('shows it is on its way past 150 ms, then rings the disc with "!" and its words; the answer from before stays', async ({ page, request }) => {
    const d = await drawEdges(request);
    await open(page, d, FLAGS);
    const [q] = d.n as [number];
    let release!: () => void;
    const held = new Promise<void>((r) => { release = r; });
    await page.route('**/act', async (route: Route) => {
      await held;
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ problem: 'failed', detail: 'The ledger could not be written.' }) });
    });
    const disc = mark(page, q, 'answer');
    await disc.click();
    await menuOf(page, `Answer item ${q}`).getByRole('menuitem', { name: 'Tick (A)' }).click();
    await expect(disc).toHaveAttribute('data-saving', '');
    release();
    await expect(disc).toHaveAttribute('data-failed', '');
    await expect(disc).not.toHaveAttribute('data-saving');
    await expect(disc).toHaveAttribute('data-answer', 'waiting');
    await expect(page.locator('.vb-mark-tip')).toHaveText('Tick not saved. Press to try again.');
    // The next press tries again and takes the ring off.
    await page.unroute('**/act');
    await disc.click();
    await expect(disc).not.toHaveAttribute('data-failed');
  });
});

for (const theme of THEMES) {
  test(`axe passes with a container's reply bright, and the actions listed (${theme})`, async ({ page, request }) => {
    await setTheme(page, theme);
    const d = await drawEdges(request);
    await open(page, d, FLAGS);
    const note = await act(page, d, { action: 'comment', board: d.board, region: 'q', text: 'Who has a licence?' });
    await write(request, d, [{ type: 'reply', n: d.n[3]!, text: 'Two of the crew.', to: note }]);
    await expect(frame(page, 'q').locator('.vb-nblock-reply[data-unseen]')).toHaveCount(1);
    await card(page, d.n[0]!).focus();
    await page.keyboard.press('Shift+F10');
    await expect(menuOf(page, `Actions on item ${d.n[0]}`)).toBeVisible();
    await expectNoAxeViolations(page);
  });
}
