// The board's side of the node's edges (nodeEdges and skins flags, D-099, D-100; FE_02), split out of controller.ts:
// the board root says the node draws its edges (`data-vb-edges`, Decision's fuchsia) and which skin the board is in
// (`data-vb-skin`); the nodes draw in the skin's row (packages/ui skins.ts) and with the project's icon library; the
// marks' presses, menus, boxes and tips (cards/mark-flow.ts); a container's pill cleared on this screen by a click
// inside it, its replies quieted too (cards/container-seen.ts). With both flags off it changes nothing.
import type { ActionId, LedgerEvent, Skin, ViewNode } from '#format';
import { DEFAULT_SKIN, isLibraryIcon } from '#format';
import type { FreshCount, LedgerState } from '#actions';
import type { CardReply, NodeState } from '#ui';
import { SKIN_DEFS } from '#ui';
import type { Drawing } from '../canvas/index.ts';
import type { MarkFlow } from '../cards/index.ts';
import { createContainerSeen, createIconLibrary, createMarkFlow } from '../cards/index.ts';
import type { Io } from '../io.ts';
import type { Status } from '../status.ts';

export interface NodeEdgesDeps {
  /** The nodeEdges flag. */
  on: boolean;
  /** The skins flag: the board's skin applies and the person can change it. */
  skins: boolean;
  stage: HTMLElement;
  prefix: string;
  status: Status;
  io: Pick<Io, 'listIcons'>;
  drawing(): Drawing;
  node(id: string): ViewNode | undefined;
  state(id: string): NodeState | undefined;
  card(id: string): HTMLElement | undefined;
  paused(what: 'answer' | 'bookmark'): string | null;
  act(id: string, action: ActionId): Promise<boolean | undefined> | void;
  bookmark(id: string): Promise<unknown> | void;
  unpin(id: string): void;
  ledger(): LedgerState | null;
  board(): string;
  /** Nothing may change (a past version, a ledger open read-only): a click in a container clears nothing. */
  readOnly(): boolean;
  /** The fresh containers and the replies under container notes, as the conditions give them. */
  freshIn(): ReadonlyMap<string, FreshCount>;
  replies(): readonly CardReply[];
  redraw(): void;
}

export interface NodeEdges {
  readonly marks: MarkFlow | undefined;
  /** How the nodes first draw: the default skin's row with the flag on. */
  readonly first: (typeof SKIN_DEFS)[Skin] | undefined;
  /** The open board's skin, before each draw: the root says it, and nodes draw again in a new one. */
  skin(skin: Skin): void;
  /** Lines were applied (`full`: a ledger opened): an `icon` line reads the library again. */
  lines(lines: readonly LedgerEvent[], full: boolean): void;
  fresh(fresh: ReadonlyMap<string, FreshCount>): ReadonlyMap<string, FreshCount>;
  replies(replies: readonly CardReply[]): readonly CardReply[];
  /** A click inside container `region`. */
  seen(region: string): void;
  place(): void;
  destroy(): void;
}

export function createNodeEdges(d: NodeEdgesDeps): NodeEdges {
  const root = d.stage.closest<HTMLElement>('.vb-board');
  if (d.on) root?.toggleAttribute('data-vb-edges', true);
  let shown: Skin | undefined;
  const seen = createContainerSeen();
  const regionOf = (to: number) => d.ledger()?.asks.get(to)?.region;
  const icons = createIconLibrary({
    on: d.on, load: () => d.io.listIcons(),
    changed: (library) => { d.drawing().restyle({ icons: library }, (n) => n.icon !== undefined && isLibraryIcon(n.icon)); d.redraw(); },
  });
  const marks = d.on ? createMarkFlow(d) : undefined;
  return {
    marks,
    first: d.on ? SKIN_DEFS[DEFAULT_SKIN] : undefined,
    skin(skin) {
      if (skin === shown) return;
      shown = skin;
      if (d.skins && root) root.dataset.vbSkin = skin;
      if (d.on) d.drawing().restyle({ edges: SKIN_DEFS[skin] });
      if (d.skins) d.status.set({ skin });
    },
    lines(lines, full) {
      if (d.on && (full || lines.some((l) => l.type === 'icon'))) void icons.refresh();
    },
    fresh: (fresh) => (d.on ? seen.fresh(d.board(), fresh) : fresh),
    replies: (replies) => (d.on ? seen.replies(d.ledger(), d.board(), replies, regionOf) : replies),
    seen(region) {
      if (!d.on || d.readOnly()) return;
      if (seen.clear(d.board(), region, d.freshIn(), d.replies(), regionOf)) d.redraw();
    },
    place: () => marks?.place(),
    destroy() {
      marks?.destroy();
      root?.removeAttribute('data-vb-edges');
      if (root) delete root.dataset.vbSkin;
    },
  };
}
