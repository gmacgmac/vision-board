// Where the person puts things (split out of controller.ts in 3_FE_01, which grew it past 300
// lines): a card dropped from its kind tab or nudged by Alt+arrows becomes a pin (never a dated one, D-105), R and Reset
// places take pins away, and the layout mode, the card widths and the size tier are the person's picks. Every write
// goes through the controller's `record`, so through the action layer and the I/O module (rule 8).
import type { ActDirection, ActSize, Mode, View, Widths } from '#format';
import type { BoardState } from '#actions';
import type { Box, BoardLayout } from '#layout';
import type { ActFields } from '../io.ts';
import { datedOf } from '#ui';
import { sizeAct } from '../cards/index.ts';
import type { Viewport } from './viewport.ts';

export interface PlaceDeps {
  vp: Viewport;
  view(): View;
  state(): BoardState;
  layout(): BoardLayout | null;
  /** A node act's `n` and the version the person was looking at. */
  target(id: string): { n: number; ver: number | undefined };
  /** Send one act; true when it was recorded. */
  record(fields: ActFields): Promise<boolean>;
  redraw(): void;
  /** Send steps of acts side by side and draw once (sender.ts `run`). */
  run(steps: ActFields[][]): Promise<boolean>;
  /** Hide the connectors until the relayout a container's move causes has drawn (draw.ts). */
  settle(): void;
}

export interface Places {
  pin(id: string, box: Box): Promise<void>;
  unpin(id: string): Promise<void>;
  setSize(id: string, size: ActSize): void;
  setMode(region: string, mode: Mode): Promise<void>;
  /** A container's flow direction (its layout control): the person's `direction` act for it; `auto` clears it. */
  setDirection(region: string, direction: ActDirection): Promise<void>;
  /** Match card widths in a container's mode row (field report batch 3 ruling 5): the person's act. */
  setWidths(region: string, widths: Widths): Promise<void>;
  resetRegion(region: string): Promise<void>;
  /** Reset places for a selection (navigation FE_03): one `unpin` per pinned card, one redraw. */
  resetCards(ids: readonly string[]): Promise<void>;
  /** "Put container back" (3_FE_04 ruling 7): the container returns to where layout puts it. */
  putBack(region: string): Promise<void>;
}

export function createPlaces(d: PlaceDeps): Places {
  const regionBox = (id: string) => d.layout()?.regions.find((x) => x.id === id);

  return {
    async pin(id, box) {
      const n = d.view().nodes.find((x) => x.id === id);
      // A dated node's place is its date (D-105 4): Alt+arrows move it nowhere and write nothing.
      const r = n && !datedOf(n) ? regionBox(n.region) : undefined;
      if (!r) return;
      const x = Math.round(box.x - r.origin.x);
      const y = Math.round(box.y - r.origin.y);
      // On failure the draw snaps the card back to its computed place.
      if (!(await d.record({ action: 'pin', ...d.target(id), x, y }))) d.redraw();
    },
    async unpin(id) {
      if (d.state().pins.has(id)) await d.record({ action: 'unpin', ...d.target(id) });
    },
    setSize: (id, size) => void d.record(sizeAct(id, size)),
    async setMode(region, mode) {
      if (!(await d.record({ action: 'mode', region, mode }))) return;
      const r = regionBox(region);
      if (r) d.vp.reveal(r.box);
    },
    async setDirection(region, direction) {
      await d.record({ action: 'direction', region, direction });
    },
    async setWidths(region, widths) {
      await d.record({ action: 'widths', region, widths });
    },
    async resetRegion(region) {
      const ids = d.view().nodes.filter((n) => n.region === region && d.state().pins.has(n.id)).map((n) => n.id);
      for (const id of ids) if (!(await d.record({ action: 'unpin', ...d.target(id) }))) break;
    },
    async resetCards(ids) {
      const acts = ids.filter((id) => d.state().pins.has(id)).map((id): ActFields => ({ action: 'unpin', ...d.target(id) }));
      if (acts.length) await d.run([acts]);
    },
    async putBack(region) {
      if (!d.state().regionPins.has(region)) return;
      // The board is laid out again once the unpin is back: the links hide until that draw settles.
      d.settle();
      await d.record({ action: 'unpin', region });
      d.settle();
    },
  };
}
