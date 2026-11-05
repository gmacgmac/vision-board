// Lanes' order inside each stack (field-report batch 3 ruling 1): the lane is fixed, so the only
// freedom is the order of the cards one lane holds in one column. Barycentre sweeps, as flow does:
// left to right by where each card's predecessors sit, back by its successors, then once more
// forwards. A stack's height does not depend on its order, so lane tops stay put while it runs.
import type { Graph } from '../../layers.ts';
import { mean } from '../../layers.ts';
import { GAP } from '../../types.ts';

/** `stacks[lane][column]`: the card ids, top to bottom; sorted in place. `top[lane]`: where the
 *  lane's first card starts; `h`: a card's height; `gap`: between a card and the one under it. */
export function orderStacks(stacks: string[][][], top: number[], h: (id: string) => number, dag: Graph, gap = GAP): void {
  const cy = new Map<string, number>();
  const settle = (lane: number, stack: string[]) => {
    let y = top[lane]!;
    for (const id of stack) { cy.set(id, y + h(id) / 2); y += h(id) + gap; }
  };
  stacks.forEach((cols, lane) => cols.forEach((stack) => settle(lane, stack)));
  const columns = Math.max(0, ...stacks.map((cols) => cols.length));
  const sweep = (towards: 'preds' | 'succs', forwards: boolean) => {
    for (let k = 0; k < columns; k++) {
      const c = forwards ? k : columns - 1 - k;
      stacks.forEach((cols, lane) => {
        const stack = cols[c];
        if (!stack || stack.length < 2) return;
        const want = new Map(stack.map((id, i) =>
          [id, { at: mean(dag[towards].get(id)!.map((o) => cy.get(o)!)) ?? cy.get(id)!, i }]));
        stack.sort((a, b) => want.get(a)!.at - want.get(b)!.at || want.get(a)!.i - want.get(b)!.i);
        settle(lane, stack);
      });
    }
  };
  sweep('preds', true);
  sweep('succs', false);
  sweep('preds', true);
}
