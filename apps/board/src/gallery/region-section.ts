// Gallery entry for <vb-region>: each layout mode with its count, then Reset places enabled, the
// empty message, and a region with nothing to count. Each frame is a real <vb-region>, updated
// with `regionState`, exactly as the board does. The frame draws no cards (D-013), so a sample
// says which nodes the layout drew by passing `placed`. Four samples are drawn open, through the
// element's own `showPanel`: the layout popover (wide, and compact on a narrow frame) and the
// settings menu with Reset places enabled and disabled.
import type { Mode } from '../../../../packages/format/src/index.ts';
import type { VbRegionElement } from '../../../../packages/ui/src/index.ts';
import { regionState } from '../../../../packages/ui/src/index.ts';
import { el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { FRAME_PREFIX } from './fixture.ts';

/** The one frame whose layout drew none of its nodes, so it shows the empty message. */
const DREW_NOTHING = `${FRAME_PREFIX}empty`;

/** The samples drawn open: the popover with one layout highlighted, or the settings menu. */
const OPEN: Record<string, { what: 'modes'; mode: Mode } | { what: 'menu' }> = {
  [`${FRAME_PREFIX}grid`]: { what: 'modes', mode: 'flow' },
  [DREW_NOTHING]: { what: 'modes', mode: 'radial' },
  [`${FRAME_PREFIX}pinned`]: { what: 'menu' },
  [`${FRAME_PREFIX}bare`]: { what: 'menu' },
};

function frame(id: string, fx: Fixture): VbRegionElement {
  const region = fx.view.regions.find((r) => r.id === id)!;
  const placed = new Set(id === DREW_NOTHING ? [] : fx.view.nodes.map((n) => n.id));
  const node = document.createElement('vb-region') as VbRegionElement;
  node.render(region);
  node.update(regionState(region, fx.view, fx.state, placed));
  return node;
}

export function regionSamples(body: HTMLElement, fx: Fixture): void {
  const frames = el('div', 'g-frames vb-ground');
  const drawn = fx.view.regions.filter((r) => r.id.startsWith(FRAME_PREFIX)).map((r) => frame(r.id, fx));
  frames.append(...drawn);
  for (const f of drawn) {
    const open = OPEN[f.dataset.region!];
    if (open) f.showPanel(open.what, { ...(open.what === 'modes' && { mode: open.mode }), focus: false });
  }
  body.append(group('Every mode, and the states around the count',
    'The checked icon is the layout in force. Items are counted as decided when acknowledged or dropped. '
    + 'Grid mode shows the popover with Flow under the pointer; the narrow "Empty message showing" frame shows its compact form. '
    + 'The cog\'s menu is open on "Reset places showing" (a card was moved) and on "No items, so no count" (nothing to reset).', frames));
}
