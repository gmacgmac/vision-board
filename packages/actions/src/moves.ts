// Where the person put each card (3_FE_03 rulings 1, 2 and 5, api.md 66-70). A person's `move`
// puts cards in a container on their board or in the board's built-in Later; the latest move wins
// over the region in the card's latest version, so an agent redrawing a card in its old region
// does not pull it back (as with pins). The agent's view stays what it drew; the page places each
// card with `placedView`, which also adds the Later container, from the fold: no agent writes it
// and it is never stored as a region. Pure.
import type { Region, View } from '#format';
import { LATER_REGION } from '#format';
import type { BoardState } from './board-state.ts';
import * as actionsRefusalsWords from './words/actions-refusals.ts';

/** Every board's Later container: always last, laid out as a grid (ruling 5). */
export const LATER: Readonly<Region> = Object.freeze({ id: LATER_REGION, title: actionsRefusalsWords.later, mode: 'grid' as const });

/** The agent's view of one board with every card in the container the person put it in, and the
 * Later container last while it holds a card, or while `later` asks for it (a card is being
 * dragged, so Later shows as a drop target). A board whose older lines drew a region named
 * `later` keeps that one frame (api.md 67). */
export function placedView(view: View, state: BoardState, opts: { later?: boolean } = {}): View {
  const nodes = state.moves.size
    ? view.nodes.map((n) => {
      const to = state.moves.get(n.id);
      return to === undefined ? n : { ...n, region: to };
    })
    : view.nodes;
  const drawn = view.regions.some((r) => r.id === LATER_REGION);
  const later = !drawn && (opts.later === true || nodes.some((n) => n.region === LATER_REGION));
  if (nodes === view.nodes && !later) return view;
  return { ...view, nodes, regions: later ? [...view.regions, { ...LATER }] : view.regions };
}
