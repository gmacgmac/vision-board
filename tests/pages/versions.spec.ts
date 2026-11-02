// The toolbar and a past version (navigation FE_01, versionView flag, on by default): the picker
// holds titles only and the title heading is for screen readers; the version dropdown lists the
// open board's own versions, "now" first (its own head, so other boards and the person's board
// seen never move it), then each run of the agent's drawing, newest first. Choosing a past one
// draws the board as it was, read-only: no act buttons, an act is never sent, no board seen; a
// banner says so, and Back to now or Esc ends it. A container's retired marker opens its version
// with the answers as they stood just before the retire (review polish ruling 10). Then the
// gallery's banner sample. Agents write through the API with a Bearer secret, as in
// live-boards.spec.ts, on the shared test server.
import type { APIRequestContext, Page, Request } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test, bid } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { idle, openDrawn as open } from './board-page.ts';
import { joinAgent } from './agent-board.ts';
import type { Agent } from './agent-board.ts';

const THEMES: Theme[] = ['dark', 'light'];
const REGION = 'ideas';
// The banner's time is the person's own clock: one zone and locale, so the gallery's screenshot holds.
test.use({ timezoneId: 'UTC', locale: 'en-GB' });


/** Write `items` on `board`; the seq of the last line written. */
async function write(request: APIRequestContext, a: Agent, board: string, items: unknown[]): Promise<number> {
  const r = await request.post(`/api/boards/${board}/write`, { headers: { Authorization: `Bearer ${a.secret}` }, data: { items } });
  expect(r.status(), await r.text()).toBe(200);
  const out = await r.json() as { results: { ok: boolean; seq?: number }[] };
  expect(out.results.every((x) => x.ok)).toBe(true);
  return Math.max(...out.results.map((x) => x.seq ?? 0));
}

const card = (title: string) => ({ type: 'node', node: { region: REGION, kind: 'question', title } });

/** The board's own head, from `list_boards`. */
async function headOf(request: APIRequestContext, board: string): Promise<number> {
  const { boards } = await (await request.get('/api/boards')).json() as { boards: { board: string; seq: number }[] };
  return boards.find((b) => b.board === board)!.seq;
}

/** Every act or board seen the page sends from now on. */
function personWrites(page: Page): Request[] {
  const sent: Request[] = [];
  page.on('request', (r) => { if (r.method() === 'POST' && /\/api\/boards\/[^/]+\/(act|seen)$/.test(r.url())) sent.push(r); });
  return sent;
}

const version = (page: Page) => page.locator(bid('version'));
const banner = (page: Page) => page.locator('.vb-banner');

test('the picker holds titles only, the title heading is for screen readers, the dropdown starts at now', async ({ page, request }) => {
  await open(page, '/?vbwork#roadmap');
  const head = await headOf(page.request, 'roadmap');
  await expect(page.locator(`${bid('board')} option[value="roadmap"]`)).toHaveText('Where Vision Board goes from here');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Where Vision Board goes from here');
  expect((await page.locator(bid('title')).boundingBox())!.width).toBeLessThanOrEqual(1);
  await expect(version(page)).toHaveValue('now');
  await expect(version(page).locator('option').first()).toHaveText(`v${head} · now`);
  await expect(page.getByLabel('Version', { exact: true })).toBeVisible();
  // A board seen is not a change to the board, and another board's lines are not its own.
  await idle(page);
  await write(request, await joinAgent(request, 'Elsewhere chat'), 'ver-elsewhere', [{ type: 'board', title: 'Elsewhere' }]);
  await idle(page);
  await expect(version(page).locator('option').first()).toHaveText(`v${head} · now`);
});

test('with versionView off the toolbar is as it was: the title, the ledger\'s latest line, the picker\'s versions', async ({ page }) => {
  await open(page, '/?vbwork&flags=-versionView#roadmap');
  await expect(page.locator(bid('title'))).toBeVisible();
  await expect(page.locator(`${bid('version')}.vb-chip`)).toHaveText(/^v\d+$/);
  await expect(page.locator(`${bid('board')} option[value="roadmap"]`)).toHaveText(/^Where Vision Board goes from here · v\d+$/);
});

test('a past version shows the board as it was, read-only, and Back to now and Esc end it', async ({ page, request }) => {
  const a = await joinAgent(request, 'Versions chat');
  const first = await write(request, a, 'ver-past', [
    { type: 'board', title: 'Versions board' },
    { type: 'region', region: { id: REGION, title: 'Ideas', mode: 'grid' } },
    card('Which idea goes first?'),
  ]);
  await open(page, '/?vbwork#ver-past');
  const ack = await page.request.post('/api/boards/ver-past/act', { data: { type: 'act', action: 'ack', n: Number(await page.locator('vb-node').first().getAttribute('data-id')), ver: 1 } });
  expect(ack.status(), await ack.text()).toBe(201);
  const now = await write(request, a, 'ver-past', [card('And which one waits?')]);
  await idle(page);
  await expect(version(page).locator('option')).toHaveText([`v${now} · now`, new RegExp(`^v${first} · .+`)]);
  await expect(page.locator('vb-node')).toHaveCount(2);

  const sent = personWrites(page);
  await version(page).selectOption(String(first));
  await expect(banner(page)).toBeVisible();
  await expect(banner(page).getByRole('status')).toHaveText(new RegExp(`^Viewing v${first} from .+ · read-only$`));
  await expect(page.locator('.vb-world')).toHaveAttribute('data-readonly', '');
  await expect(page.locator('vb-node')).toHaveCount(1);
  const old = page.locator('vb-node').first();
  await expect(old).toHaveAttribute('data-status', 'open'); // the ack came after this version
  for (const control of ['.vb-act', '.vb-size', '.vb-region-grip', '.vb-region-tools', '.vb-note-pin']) {
    await expect(page.locator(`.vb-world ${control}:visible`), control).toHaveCount(0);
  }
  await expect(page.locator(bid('send'))).toHaveCount(0);
  // Selection still works; an act key, a note key and a nudge do nothing and send nothing.
  await old.locator('.vb-node-title').click({ position: { x: 4, y: 4 } });
  await expect(old).toHaveAttribute('data-selected', '');
  await old.focus();
  for (const key of ['a', 'x', 'c', 'Alt+ArrowRight']) await page.keyboard.press(key);
  await expect(page.locator('vb-note-bubble:visible')).toHaveCount(0);
  await expect(page.locator('vb-selection-bar [data-command="comment"]')).toHaveCount(0);
  // New lines don't redraw the past view; the dropdown's now moves.
  const later = await write(request, a, 'ver-past', [card('A third idea')]);
  await idle(page);
  await expect(page.locator('vb-node')).toHaveCount(1);
  await expect(version(page).locator('option').first()).toHaveText(`v${later} · now`);
  await expect(version(page)).toHaveValue(String(first));
  for (const theme of THEMES) {
    await setTheme(page, theme);
    await expectNoAxeViolations(page);
  }
  await idle(page);
  expect(sent.map((r) => r.url())).toEqual([]);

  await banner(page).getByRole('button', { name: 'Back to now' }).click();
  await expect(banner(page)).toHaveCount(0);
  await expect(version(page)).toHaveValue('now');
  await expect(page.locator('.vb-world')).not.toHaveAttribute('data-readonly');
  await expect(page.locator('vb-node')).toHaveCount(3);
  await expect(page.locator('vb-node .vb-act:visible').first()).toBeVisible();

  await version(page).selectOption(String(first));
  await expect(banner(page)).toBeVisible();
  await page.locator(bid('stage')).focus();
  await page.keyboard.press('Escape');
  await expect(banner(page)).toHaveCount(0);
  await expect(page.locator('vb-node')).toHaveCount(3);
});

// ---- The retired marker's past view (review polish ruling 10, N42) ----

const answers = (page: Page) => page.locator('vb-node').evaluateAll((els) => els.map((e) => [e.querySelector('.vb-node-title')?.textContent, e.getAttribute('data-status')]));
const count = (page: Page) => page.locator(`vb-region[data-region="${REGION}"] .vb-region-count`);
const ALL = [['Question 1?', 'acknowledged'], ['Question 2?', 'dropped'], ['Question 3?', 'acknowledged'], ['Question 4?', 'dropped']];
/** Each card's review buttons that show, by act: in a past view only a lit ✓ or ✗ (FIX_01). */
const marks = (page: Page) => page.locator('vb-node').evaluateAll((els) => els.map((e) =>
  [...e.querySelectorAll<HTMLElement>('.vb-act')].filter((b) => b.checkVisibility({ visibilityProperty: true })).map((b) => b.dataset.act ?? 'flag')));
/** Every mark that shows takes no pointer and no focus: a mark, not a button to press. */
const markIsInert = (page: Page) => page.locator('.vb-world').evaluate((w) => {
  const shown = [...w.querySelectorAll<HTMLElement>('.vb-act')].filter((b) => b.checkVisibility({ visibilityProperty: true }));
  return shown.length > 0 && shown.every((b) => { b.focus(); return getComputedStyle(b).pointerEvents === 'none' && document.activeElement !== b; });
});

test('the retired marker opens its version with the answers as they stood just before the retire, read-only; the dropdown\'s is as at it', async ({ page, request }) => {
  const a = await joinAgent(request, 'Retire chat');
  const first = await write(request, a, 'ver-retired', [
    { type: 'board', title: 'Retired answers' },
    { type: 'region', region: { id: REGION, title: 'Ideas', mode: 'grid' } },
    ...[1, 2, 3, 4].map((n) => card(`Question ${n}?`)),
  ]);
  await open(page, '/?vbwork#ver-retired');
  for (const [n, action] of [[1, 'ack'], [2, 'drop'], [3, 'ack'], [4, 'drop']] as const) {
    const r = await page.request.post('/api/boards/ver-retired/act', { data: { type: 'act', action, n, ver: 1 } });
    expect(r.status(), await r.text()).toBe(201);
  }
  // One batch: a summary, then two retires.
  await write(request, a, 'ver-retired', [
    { type: 'node', node: { region: REGION, kind: 'finding', title: 'Summary' } },
    { type: 'retire', n: 1 }, { type: 'retire', n: 2 },
  ]);
  await idle(page);
  await expect(page.locator('vb-node')).toHaveCount(3);
  const marker = page.locator(`vb-region[data-region="${REGION}"] .vb-region-retired`);
  await expect(marker).toHaveText('2 retired');

  const sent = personWrites(page);
  await marker.click();
  await expect(banner(page).getByRole('status')).toHaveText(new RegExp(`^Viewing v${first} from .+ · read-only$`));
  await expect(page.locator('.vb-world')).toHaveAttribute('data-readonly', '');
  for (const theme of THEMES) {
    await setTheme(page, theme);
    await expect.poll(() => answers(page), theme).toEqual(ALL); // v1's cards, not the summary
    await expect(count(page)).toHaveAttribute('title', '4 of 4 answered');
    await expectNoAxeViolations(page);
  }
  // Each card shows its mark (FIX_01): the ✓ or ✗ lit, a mark that takes no focus and no press.
  await expect.poll(() => marks(page)).toEqual(ALL.map(([, status]) => [status === 'acknowledged' ? 'ack' : 'drop']));
  await expect.poll(() => markIsInert(page)).toBe(true);
  const lit = page.locator('.vb-world .vb-act:visible').first();
  const box = (await lit.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  // Still read-only: a key sends nothing either.
  await page.locator('vb-node').first().focus();
  for (const key of ['a', 'x']) await page.keyboard.press(key);
  await idle(page);
  expect(sent.map((r) => r.url())).toEqual([]);
  await expect.poll(() => answers(page)).toEqual(ALL);

  // The same version from the dropdown: as at that version, before any answer.
  await banner(page).getByRole('button', { name: 'Back to now' }).click();
  await version(page).selectOption(String(first));
  await expect(banner(page)).toBeVisible();
  await expect.poll(() => answers(page)).toEqual(ALL.map(([title]) => [title, 'open']));
  await expect(count(page)).toHaveAttribute('title', '0 of 4 answered');
  await expect.poll(() => marks(page)).toEqual([[], [], [], []]);
});

test('a past version from the dropdown shows each answered card\'s ✓ or ✗ lit, a mark that takes no press', async ({ page, request }) => {
  const a = await joinAgent(request, 'Marks chat');
  await write(request, a, 'ver-marks', [
    { type: 'board', title: 'Past marks' },
    { type: 'region', region: { id: REGION, title: 'Ideas', mode: 'grid' } },
    card('Question 1?'), card('Question 2?'),
  ]);
  await open(page, '/?vbwork#ver-marks');
  for (const [n, action] of [[1, 'ack'], [2, 'drop']] as const) {
    const r = await page.request.post('/api/boards/ver-marks/act', { data: { type: 'act', action, n, ver: 1 } });
    expect(r.status(), await r.text()).toBe(201);
  }
  const answered = await write(request, a, 'ver-marks', [card('Question 3?')]);
  // A person's line on the board ends the agent's run, so the next drawing is a version of its own.
  const noted = await page.request.post('/api/boards/ver-marks/act', { data: { type: 'act', action: 'comment', n: 3, ver: 1, text: 'Later today.' } });
  expect(noted.status(), await noted.text()).toBe(201);
  await write(request, a, 'ver-marks', [card('Question 4?')]);
  await idle(page);
  const sent = personWrites(page);
  await version(page).selectOption(String(answered));
  await expect(page.locator('.vb-world')).toHaveAttribute('data-readonly', '');
  await expect(page.locator('vb-node')).toHaveCount(3);
  for (const theme of THEMES) {
    await setTheme(page, theme);
    await expect.poll(() => marks(page), theme).toEqual([['ack'], ['drop'], []]);
    await expect.poll(() => markIsInert(page), theme).toBe(true);
    await expectNoAxeViolations(page);
  }
  await page.locator('.vb-world .vb-act:visible').first().click({ force: true });
  await idle(page);
  expect(sent.map((r) => r.url())).toEqual([]);
  await expect(page.locator('vb-node').first()).toHaveAttribute('data-status', 'acknowledged');
  // Back to now, the row is the person's buttons again: every one shows and can be pressed.
  await banner(page).getByRole('button', { name: 'Back to now' }).click();
  await expect(page.locator('vb-node')).toHaveCount(4);
  await expect.poll(async () => (await marks(page)).every((m) => m.length > 1)).toBe(true);
});

// ---- The gallery's banner sample ----

const section = (page: Page) => page.locator('section[data-feature="versionView"]');

test('gallery: the Past versions section shows by default and not with -versionView', async ({ page }) => {
  await page.goto('/gallery.html?flags=-versionView');
  await expect(page.locator('section[data-pattern]').first()).toBeVisible();
  await expect(section(page)).toHaveCount(0);
  await page.goto('/gallery.html');
  await expect(section(page).locator('.vb-banner')).toHaveText(/^Viewing v\d+ from .+ · read-only\s*Back to now$/);
});

for (const theme of THEMES) {
  test(`gallery: the banner passes axe and matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    await expect(section(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await expect(section(page)).toHaveScreenshot(`past-version-${theme}.png`);
  });
}
