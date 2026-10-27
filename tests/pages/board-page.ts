// The board page as the specs drive it, one definition each: a card and a container by their ids,
// the page's work settled, the ledger's head, and the board opened and drawn. The roadmap board (the
// worker's main board, servers.ts) has 17 cards. A board of its own drawn by an agent is
// agent-board.ts's; the chat panel's parts are chat-page.ts's.
import type { Frame, Locator, Page } from '@playwright/test';
import { expect } from './helpers.ts';

/** The roadmap fixture's cards. */
export const ROADMAP_CARDS = 17;

export const card = (page: Page, n: number | string) => page.locator(`vb-node[data-id="${n}"]`);
export const frame = (page: Page, region: string) => page.locator(`vb-region[data-region="${region}"]`);

/** Wait until the page has done all the work it has queued (`?vbwork` exposes it; a no-op without). */
export const idle = (page: Page) => page.evaluate(() => (window as unknown as { __vbWork?: { idle(): Promise<void> } }).__vbWork?.idle());

/** The ledger's head on the board server at `base` (the main board by default). */
export const head = async (page: Page, base = '') => ((await (await page.request.get(`${base}/api/boards`)).json()) as { head: number }).head;

/** Open the board (the roadmap unless `cards` says otherwise) and wait until it is drawn and settled. */
export async function openBoard(page: Page, { base = '', query = '', hash = '', cards = ROADMAP_CARDS }: { base?: string; query?: string; hash?: string; cards?: number } = {}): Promise<void> {
  await page.goto(`${base}/${query}${hash}`);
  await expect(page.locator('vb-node')).toHaveCount(cards);
  await expect(page.locator('.vb-world')).not.toHaveClass(/no-anim/);
  await expect(page.locator('.vb-wires:not(.vb-wires-top)')).not.toHaveClass(/settling/);
}

export type Point = { x: number; y: number };

// The page's parts.
export const bar = (page: Page) => page.locator('vb-selection-bar');
export const bubble = (page: Page) => page.locator('vb-note-bubble');
export const toast = (page: Page) => page.locator('#toast');
export const picker = (page: Page) => page.locator('#board');
export const menuButton = (page: Page) => page.locator('#toolbar-menu');
export const menu = (page: Page) => page.getByRole('menu', { name: 'More' });
/** A card's replies, and its Updates tab. */
export const replies = (page: Page, n: number) => card(page, n).locator('.vb-node-reply');
export const tab = (page: Page, n: number) => card(page, n).locator('.vb-node-btab[data-tab="updates"]');
/** An app card's control in its status line, and its panel's frame once ready. */
export const control = (card: Locator) => card.locator('.vb-app-status > button:visible');
export async function panelOf(card: Locator): Promise<Frame> {
  await expect(card.locator('vb-app-frame')).toHaveAttribute('data-state', 'ready');
  return (await (await card.locator('vb-app-frame iframe').elementHandle())!.contentFrame())!;
}

// What is selected, by card id: in drawing order, or by number.
export const selected = (page: Page) => page.locator('vb-node[data-selected]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.id));
export const selectedIds = (page: Page) => page.locator('vb-node[data-selected]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.id!).sort((a, b) => Number(a) - Number(b)));

// Where things are, and the board's zoom and pan.
export const box = async (l: Locator) => (await l.boundingBox())!;
export const stageBox = async (page: Page) => (await page.locator('#stage').boundingBox())!;
export const world = (page: Page) => page.locator('.vb-world').evaluate((e) => getComputedStyle(e).transform);
export const scale = (page: Page) => page.locator('.vb-world').evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).a);

/** Pan by the wheel over the stage's middle, and wait until the board has moved. */
export async function panBy(page: Page, dx: number, dy: number): Promise<void> {
  const s = await stageBox(page);
  await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
  const before = await world(page);
  await page.mouse.wheel(-dx, -dy);
  await expect.poll(() => world(page)).not.toBe(before);
}

/** Zoom in with the + key until the board is at full size (`check`: fail if it never gets there). */
export async function zoomToFull(page: Page, { check = false } = {}): Promise<void> {
  for (let i = 0; i < 12 && (await scale(page)) < 1; i += 1) await page.keyboard.press('+');
  if (check) expect(await scale(page)).toBeGreaterThanOrEqual(1);
}

/** A press, a move in ten steps and a release; `during` runs before the release. */
export async function drag(page: Page, from: Point, to: Point, during?: () => Promise<void>): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await during?.();
  await page.mouse.up();
}

// The ledger as the page reads it, on the main board.
export const api = (page: Page, path: string) => page.request.get(`/api${path}`).then((r) => r.json());
/** The ledger lines after `after`, as the file holds them. */
export async function linesAfter(page: Page, after: number): Promise<Record<string, unknown>[]> {
  return (await (await page.request.get(`/api/ledger?after=${after}`)).json() as { events: Record<string, unknown>[] }).events;
}

/** Open `url` and wait for the page's first drawing (`?vbwork` in the url exposes it). */
export async function openDrawn(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: { work: { firstDrawMs: number | null } } }).__vbWork?.work.firstDrawMs != null);
}

/** The folder dialog (the folder chip's, and "⋯" › Open folder…). */
export const folderDialog = (page: Page) => page.getByRole('dialog', { name: 'Open folder' });
