// The toolbar and a past version (navigation FE_01, versionView flag, on by default): the picker
// holds titles only and the title heading is for screen readers; the version dropdown lists the
// open board's own versions, "now" first (its own head, so other boards and the person's board
// seen never move it), then each run of the agent's drawing, newest first. Choosing a past one
// draws the board as it was, read-only: no act buttons, an act is never sent, no board seen; a
// banner says so, and Back to now or Esc ends it. Then the gallery's banner sample. Agents write
// through the API with a Bearer secret, as in live-boards.spec.ts, on the shared test server.
import type { APIRequestContext, Page, Request } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const THEMES: Theme[] = ['dark', 'light'];
const REGION = 'ideas';
// The banner's time is the person's own clock: one zone and locale, so the gallery's screenshot holds.
test.use({ timezoneId: 'UTC', locale: 'en-GB' });

interface Agent { secret: string }

async function join(request: APIRequestContext, label: string): Promise<Agent> {
  const r = await request.post('/api/agents', { data: { label } });
  expect(r.status(), await r.text()).toBe(201);
  return await r.json() as Agent;
}

/** Write `items` on `board`; the seq of the last line written. */
async function write(request: APIRequestContext, a: Agent, board: string, items: unknown[]): Promise<number> {
  const r = await request.post(`/api/boards/${board}/write`, { headers: { Authorization: `Bearer ${a.secret}` }, data: { items } });
  expect(r.status(), await r.text()).toBe(200);
  const out = await r.json() as { results: { ok: boolean; seq?: number }[] };
  expect(out.results.every((x) => x.ok)).toBe(true);
  return Math.max(...out.results.map((x) => x.seq ?? 0));
}

const card = (title: string) => ({ type: 'node', node: { region: REGION, kind: 'question', title, item: true } });

/** The board's own head, from `list_boards`. */
async function headOf(request: APIRequestContext, board: string): Promise<number> {
  const { boards } = await (await request.get('/api/boards')).json() as { boards: { board: string; seq: number }[] };
  return boards.find((b) => b.board === board)!.seq;
}

/** Open the page and wait for its first draw. */
async function open(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: { work: { firstDrawMs: number | null } } }).__vbWork?.work.firstDrawMs != null);
}

/** The page has read every line written so far and drawn it. */
const idle = (page: Page) => page.evaluate(() => (window as unknown as { __vbWork: { idle(): Promise<void> } }).__vbWork.idle());

/** Every act or board seen the page sends from now on. */
function personWrites(page: Page): Request[] {
  const sent: Request[] = [];
  page.on('request', (r) => { if (r.method() === 'POST' && /\/api\/boards\/[^/]+\/(act|seen)$/.test(r.url())) sent.push(r); });
  return sent;
}

const version = (page: Page) => page.locator('#version');
const banner = (page: Page) => page.locator('.vb-banner');

test('the picker holds titles only, the title heading is for screen readers, the dropdown starts at now', async ({ page, request }) => {
  await open(page, '/?vbwork#roadmap');
  const head = await headOf(page.request, 'roadmap');
  await expect(page.locator('#board option[value="roadmap"]')).toHaveText('Where Vision Board goes from here');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Where Vision Board goes from here');
  expect((await page.locator('#title').boundingBox())!.width).toBeLessThanOrEqual(1);
  await expect(version(page)).toHaveValue('now');
  await expect(version(page).locator('option').first()).toHaveText(`v${head} · now`);
  await expect(page.getByLabel('Version', { exact: true })).toBeVisible();
  // A board seen is not a change to the board, and another board's lines are not its own.
  await idle(page);
  await write(request, await join(request, 'Elsewhere chat'), 'ver-elsewhere', [{ type: 'board', title: 'Elsewhere' }]);
  await idle(page);
  await expect(version(page).locator('option').first()).toHaveText(`v${head} · now`);
});

test('with versionView off the toolbar is as it was: the title, the ledger\'s latest line, the picker\'s versions', async ({ page }) => {
  await open(page, '/?vbwork&flags=-versionView#roadmap');
  await expect(page.locator('#title')).toBeVisible();
  await expect(page.locator('#version.vb-chip')).toHaveText(/^v\d+$/);
  await expect(page.locator('#board option[value="roadmap"]')).toHaveText(/^Where Vision Board goes from here · v\d+$/);
});

test('a past version shows the board as it was, read-only, and Back to now and Esc end it', async ({ page, request }) => {
  const a = await join(request, 'Versions chat');
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
  await expect(page.locator('#world')).toHaveAttribute('data-readonly', '');
  await expect(page.locator('vb-node')).toHaveCount(1);
  const old = page.locator('vb-node').first();
  await expect(old).toHaveAttribute('data-status', 'open'); // the ack came after this version
  for (const control of ['.vb-act', '.vb-size', '.vb-region-grip', '.vb-region-tools', '.vb-note-pin']) {
    await expect(page.locator(`#world ${control}:visible`), control).toHaveCount(0);
  }
  await expect(page.locator('#send')).toHaveCount(0);
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
    await expectNoAxeViolations(page, ['target-size']);
  }
  await idle(page);
  expect(sent.map((r) => r.url())).toEqual([]);

  await banner(page).getByRole('button', { name: 'Back to now' }).click();
  await expect(banner(page)).toHaveCount(0);
  await expect(version(page)).toHaveValue('now');
  await expect(page.locator('#world')).not.toHaveAttribute('data-readonly');
  await expect(page.locator('vb-node')).toHaveCount(3);
  await expect(page.locator('vb-node .vb-act:visible').first()).toBeVisible();

  await version(page).selectOption(String(first));
  await expect(banner(page)).toBeVisible();
  await page.locator('#stage').focus();
  await page.keyboard.press('Escape');
  await expect(banner(page)).toHaveCount(0);
  await expect(page.locator('vb-node')).toHaveCount(3);
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
