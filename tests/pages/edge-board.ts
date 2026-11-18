// A board of its own for the node's edges (FE_02): node-edges-board.spec.ts and node-edges-seen.spec.ts.
// Container p holds a question, a finding with a built-in icon and a decision; container q one question. Drawn by a new
// agent through the API, so every change arrives live.
import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { card, joinAgent, write } from './agent-board.ts';
import type { Agent } from './agent-board.ts';

let boards = 0;

export interface EdgeBoard { agent: Agent; board: string; n: number[] }

/** Draw the board; `n` is the four cards' numbers, in the order above. */
export async function drawEdges(request: APIRequestContext, name = 'edges'): Promise<EdgeBoard> {
  const d = { agent: await joinAgent(request, 'Edges chat'), board: `${name}-${Date.now()}-${(boards += 1)}` };
  const r = await write(request, d, [
    { type: 'board', title: 'Edges' },
    { type: 'region', region: { id: 'p', title: 'Uplink plan', mode: 'grid' } },
    { type: 'node', node: { region: 'p', kind: 'question', title: 'Book the second truck?' } },
    { type: 'node', node: { region: 'p', kind: 'finding', title: 'Rain fade on the link', icon: 'signal' } },
    { type: 'node', node: { region: 'p', kind: 'decision', title: 'Switch to the backup?' } },
    { type: 'region', region: { id: 'q', title: 'Crew', mode: 'grid' } },
    { type: 'node', node: { region: 'q', kind: 'question', title: 'Who drives?' } },
  ]);
  return { ...d, n: [r[2]!.n!, r[3]!.n!, r[4]!.n!, r[6]!.n!] };
}

/** Mark `name` of card `n`. */
export const mark = (page: Page, n: number, name: string): Locator => card(page, n).locator(`[data-mark="${name}"]`);
/** A node's menu on the stage, by its name ("Item 3", "Answer item 3", "Actions on item 3"). */
export const menuOf = (page: Page, name: RegExp | string): Locator => page.locator('.vb-mark-menu').getByRole('menu', { name });
