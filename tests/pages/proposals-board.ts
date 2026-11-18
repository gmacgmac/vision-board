// The proposals specs' shared board (proposals.spec.ts, proposals-review.spec.ts): a board of its
// own drawn through the API as an agent would, the agent's proposals, and the page's proposal mark,
// box, bar and Review. Moved out of proposals.spec.ts unchanged (VERIFY_01 F11).
import type { APIRequestContext, Page } from '@playwright/test';
import { card } from './board-page.ts';
import { joinAgent, write } from './agent-board.ts';
import type { Agent } from './agent-board.ts';

export interface Drawn { agent: Agent; board: string; n: number[] }

let boards = 0;

/** A board of its own with `kinds.length` cards, drawn by a new agent. */
export async function draw(request: APIRequestContext, kinds: string[] = ['question']): Promise<Drawn> {
  const d = { agent: await joinAgent(request), board: `proposals-${Date.now()}-${(boards += 1)}` };
  const results = await write(request, d, [
    { type: 'board', title: 'Proposals' },
    { type: 'region', region: { id: 'p', title: 'Pricing thread', mode: 'grid' } },
    ...kinds.map((kind, i) => ({ type: 'node', node: { region: 'p', kind, title: `Card ${i + 1}`, body: 'Offered on the last call.' } })),
  ]);
  return { ...d, n: results.slice(2).map((x) => x.n!) };
}

export const propose = (request: APIRequestContext, d: Drawn, n: number, action: 'check' | 'cross', reason: string, ver = 1) =>
  write(request, d, [{ type: 'propose', n, ver, action, reason, source: 'Email pasted in chat' }]);

/** The mark that opens a node's proposal box (D-099 7): the disc carrying a proposal (its dashed ring), or a Command Lens
 *  switch's proposal chip. None while no proposal stands, or once the node changed (withdrawn: the history box says so). */
export const tab = (page: Page, n: number) => card(page, n).locator('[data-mark="answer"][data-proposed], [data-mark="proposal"]:not([hidden])');
export const box = (page: Page, n: number) => card(page, n).locator('.vb-card-pop[data-pop="proposal"]');
export const bar = (page: Page) => page.locator('.vb-proposals');
/** Review: a button, or with proposals on more than one card (reviewList flag) a list named for what it does. */
export const review = (page: Page) => bar(page).getByRole('button', { name: 'Review', exact: true }).or(bar(page).getByRole('combobox', { name: /^Review/ }));
