// A board's ledger lines as a page test reads them: through `read_ledger` (the page's), with every
// card named by its number on the board (D-041 proposed, api.md 125). The file names a card by its
// ledger identity on every line; the board numbers its cards in the order first drawn, so the
// board's lines from the start give each card its number. One definition for every spec that
// checks what the page stored.
import type { Page } from '@playwright/test';

export type BoardLine = Record<string, unknown> & { seq: number; type: string; n?: number; nodes?: number[] };

/** The lines that name a card in `n` (as the file holds it). */
const CARD_LINES = new Set(['node', 'act', 'seen', 'reply', 'propose', 'park']);

/** Board `board`'s lines after `after`, oldest first, each card by its board number. */
export async function boardLines(page: Page, board: string, after = 0): Promise<BoardLine[]> {
  const r = await page.request.get(`/api/ledger?board=${board}&after=0`);
  const events = (await r.json() as { events: BoardLine[] }).events;
  const numbers = new Map<number, number>();
  for (const e of events) if (e.type === 'node' && typeof e.n === 'number' && !numbers.has(e.n)) numbers.set(e.n, numbers.size + 1);
  const num = (v: number) => numbers.get(v) ?? v;
  return events.filter((e) => e.seq > after).map((e) => ({
    ...e,
    ...(CARD_LINES.has(e.type) && typeof e.n === 'number' && { n: num(e.n) }),
    ...(Array.isArray(e.nodes) && { nodes: e.nodes.map(num) }),
  }));
}
