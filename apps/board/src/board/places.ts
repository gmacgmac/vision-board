// Where the person puts things (split out of controller.ts in 3_FE_01, which grew it past 300
// lines): a card dropped from its kind tab or nudged by Alt+arrows becomes a pin, R and Reset
// places take pins away, and the layout mode and the size tier are the person's picks. Every write
// goes through the controller's `record`, so through the action layer and the I/O module (rule 8).
import type { ActSize, Mode, View } from '../../../../packages/format/src/index.ts';
import type { BoardState } from '../../../../packages/actions/src/index.ts';
import type { Box, BoardLayout } from '../../../../packages/layout/src/index.ts';
import type { ActFields } from './io.ts';
import { sizeAct } from './size.ts';
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
}

export interface Places {
  pin(id: string, box: Box): Promise<void>;
  unpin(id: string): Promise<void>;
  setSize(id: string, size: ActSize): void;
  setMode(region: string, mode: Mode): Promise<void>;
  resetRegion(region: string): Promise<void>;
  /** "Put container back" (3_FE_04 ruling 7): the container returns to where layout puts it. */
  putBack(region: string): Promise<void>;
}

export function createPlaces(d: PlaceDeps): Places {
  const regionBox = (id: string) => d.layout()?.regions.find((x) => x.id === id);

  return {
    async pin(id, box) {
      const r = regionBox(d.view().nodes.find((n) => n.id === id)?.region ?? '');
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
    async resetRegion(region) {
      const ids = d.view().nodes.filter((n) => n.region === region && d.state().pins.has(n.id)).map((n) => n.id);
      for (const id of ids) if (!(await d.record({ action: 'unpin', ...d.target(id) }))) break;
    },
    async putBack(region) {
      if (d.state().regionPins.has(region)) await d.record({ action: 'unpin', region });
    },
  };
}
