// Gallery entry for <vb-region>: each layout mode with its count, then Reset places showing, the
// empty message, and a region with nothing to count. Each frame is a real <vb-region>, updated
// with `regionState`, exactly as the board does. The frame draws no cards (D-013), so a sample
// says which nodes the layout drew by passing `placed`.
import type { VbRegionElement } from '../../../../packages/ui/src/index.ts';
import { regionState } from '../../../../packages/ui/src/index.ts';
import { el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { FRAME_PREFIX } from './fixture.ts';

/** The one frame whose layout drew none of its nodes, so it shows the empty message. */
const DREW_NOTHING = `${FRAME_PREFIX}empty`;

function frame(id: string, fx: Fixture): VbRegionElement {
  const region = fx.view.regions.find((r) => r.id === id)!;
  const placed = new Set(id === DREW_NOTHING ? [] : fx.view.nodes.map((n) => n.id));
  const node = document.createElement('vb-region') as VbRegionElement;
  node.render(region);
  node.update(regionState(region, fx.view, fx.state, placed));
  return node;
}

export function regionSamples(body: HTMLElement, fx: Fixture): void {
  const frames = el('div', 'g-frames');
  frames.append(...fx.view.regions.filter((r) => r.id.startsWith(FRAME_PREFIX)).map((r) => frame(r.id, fx)));
  body.append(group('Every mode, and the states around the count', 'The pressed button is the layout mode in force. Items are counted as decided when acknowledged or dropped.', frames));
}
