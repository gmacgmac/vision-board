// Moving cards between containers on the board page (3_FE_03 rulings 3-6 and 8). A drag on a kind
// tab carries the card, or the whole selection when the card is in it; while it runs the container
// under the pointer lights up (`data-drop` on its frame, tokens only) and Later shows as a drop
// target. The drop is judged here: in another container the cards join it (one `move`, then each
// card pinned where it landed, rule 9); in their own container it is today's pin; outside every
// container they snap back and nothing is written. Later is one thing, two ways in: into it
// writes `move` and `later`; out of it, `move` and `reopen` (Reopen with no target returns the
// card to the region its agent drew it in). Every write goes through the action layer and the I/O
// module as one batch, drawn once (sender.ts).
import type { View, ViewNode } from '#format';
import { LATER_REGION } from '#format';
import type { BoardState } from '#actions';
import { LATER, statusOf } from '#actions';
import type { BoardLayout, Box, Point } from '#layout';
import type { StageBox, VbRegionElement } from '#ui';
import { offers } from '#ui';
import type { ActFields } from '../io.ts';
import type { MoveMenu, MoveTarget } from './move-menu.ts';
import { createMoveMenu } from './move-menu.ts';
import type { Selection } from './selection.ts';
import type { Viewport } from '../canvas/index.ts';
import * as cardsWords from '../words/cards.ts';

export interface MoveDeps {
  stage: HTMLElement;
  vp: Viewport;
  selection: Selection;
  layout(): BoardLayout | null;
  /** The board as drawn: each card in the container the person put it in (`placedView`). */
  view(): View;
  /** The board as the agent drew it: where Reopen sends a card back. */
  drawn(): View;
  state(): BoardState;
  frame(region: string): VbRegionElement | undefined;
  /** A node act's `n` and the version the person was looking at. */
  target(id: string): { n: number; ver: number | undefined };
  /** Send the steps as one batch, drawn once (sender.ts). */
  run(steps: ActFields[][]): Promise<boolean>;
  /** Show Later as a drop target although it holds no card, from the next draw on. */
  showLater(on: boolean): void;
  redraw(): void;
  toast(text: string): void;
}

export interface Moves {
  /** The cards a drag on `id` carries: the selection when `id` is in it, else `id` alone. */
  carried(id: string): string[];
  dragStart(ids: readonly string[]): void;
  dragOver(at: Point): void;
  drop(boxes: ReadonlyMap<string, Box>, at: Point | null): Promise<void>;
  /** L, the card's Later button, Reopen: the status act, with the move that goes with it. */
  status(id: string, action: 'later' | 'reopen'): Promise<boolean>;
  /** Move to (Shift+M, the bar): the list of containers for `ids`, under `anchor`. */
  openMenu(ids: readonly string[], anchor: StageBox): void;
  readonly menu: MoveMenu;
}

export function createMoves(d: MoveDeps): Moves {
  let carrying: readonly string[] = [];
  let lit: VbRegionElement | undefined;

  const node = (id: string): ViewNode | undefined => d.view().nodes.find((n) => n.id === id);
  const regionOf = (id: string) => node(id)?.region;
  const home = (id: string) => d.drawn().nodes.find((n) => n.id === id)?.region;
  /** Later takes only items that can be saved for later (api.md 67). */
  const laterTakes = (ids: readonly string[]) => ids.every((id) => {
    const n = node(id);
    return n !== undefined && offers(n).includes('later');
  });
  const takes = (region: string, ids: readonly string[]) => region !== LATER_REGION || laterTakes(ids);

  /** The container whose frame is under client point `at`, if any. */
  function regionAt(at: Point): string | undefined {
    const w = d.vp.toWorld(at.x, at.y);
    return d.layout()?.regions.find(({ box: b }) => w.x >= b.x && w.x <= b.x + b.w && w.y >= b.y && w.y <= b.y + b.h)?.id;
  }

  function light(region: string | undefined) {
    const el = region === undefined ? undefined : d.frame(region);
    if (el === lit) return;
    lit?.removeAttribute('data-drop');
    el?.setAttribute('data-drop', '');
    lit = el;
  }

  const moveAct = (ids: readonly string[], region: string): ActFields => (ids.length === 1
    ? { action: 'move', n: Number(ids[0]), region }
    : { action: 'move', nodes: ids.map(Number), region });

  /** The status acts that go with putting `ids` in `to`: `later` into Later, `reopen` out of it. */
  function statusActs(ids: readonly string[], to: string): ActFields[] {
    const st = d.state();
    if (to === LATER_REGION) return ids.filter((id) => statusOf(st, id) !== 'later').map((id) => ({ action: 'later', ...d.target(id) }));
    return ids.filter((id) => regionOf(id) === LATER_REGION && statusOf(st, id) === 'later')
      .map((id) => ({ action: 'reopen', ...d.target(id) }));
  }

  /** The steps that put `ids` in `to`: one move for the cards that leave their container, then
   *  the status acts and, for a drop, every card's pin where it landed (local to `to`). */
  function plan(ids: readonly string[], to: string, boxes?: ReadonlyMap<string, Box>): ActFields[][] {
    const leaving = ids.filter((id) => regionOf(id) !== to);
    const after = statusActs(leaving, to);
    const r = d.layout()?.regions.find((x) => x.id === to);
    if (boxes && r) {
      for (const [id, b] of boxes) after.push({ action: 'pin', ...d.target(id), x: Math.round(b.x - r.origin.x), y: Math.round(b.y - r.origin.y) });
    }
    return [...(leaving.length ? [[moveAct(leaving, to)]] : []), ...(after.length ? [after] : [])];
  }

  const menu = createMoveMenu({
    stage: d.stage,
    pick(region) {
      const ids = d.selection.selected();
      const title = targets(ids).find((t) => t.id === region)?.title ?? region;
      void d.run(plan(ids, region)).then((ok) => { if (ok) d.toast(cardsWords.movedTo(ids.length, title)); });
    },
  });

  /** Every container on the board, Later last; Later disabled when a card cannot go in it. */
  function targets(ids: readonly string[]): MoveTarget[] {
    const regions = d.view().regions.filter((r) => r.id !== LATER_REGION).map((r) => ({ id: r.id, title: r.title }));
    return [...regions, { id: LATER.id, title: LATER.title, ...(!laterTakes(ids) && { disabled: true }) }];
  }

  return {
    menu,
    carried: (id) => (d.selection.has(id) ? d.selection.selected() : [id]),
    dragStart(ids) {
      carrying = ids;
      d.showLater(true);
      if (!d.frame(LATER_REGION)) d.redraw();
    },
    dragOver(at) {
      const to = regionAt(at);
      light(to !== undefined && takes(to, carrying) ? to : undefined);
    },
    async drop(boxes, at) {
      const ids = [...boxes.keys()];
      const to = at && regionAt(at);
      light(undefined);
      carrying = [];
      const steps = to && takes(to, ids) ? plan(ids, to, boxes) : [];
      d.showLater(false);
      // Outside every container (or a Later that cannot take them): the cards go back.
      if (!steps.length) return d.redraw();
      await d.run(steps);
    },
    status(id, action) {
      const act: ActFields = { action, ...d.target(id) };
      const here = regionOf(id);
      if (action === 'later') return d.run(here === LATER_REGION ? [[act]] : [[moveAct([id], LATER_REGION)], [act]]);
      // Reopen with no target: back to the region its agent drew it in (ruling 6).
      const back = home(id);
      const leaves = here === LATER_REGION && back !== undefined && back !== LATER_REGION;
      return d.run(leaves ? [[moveAct([id], back)], [act]] : [[act]]);
    },
    openMenu(ids, anchor) {
      menu.show(ids.length, targets(ids), anchor);
    },
  };
}
