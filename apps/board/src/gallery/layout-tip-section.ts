// Gallery entry for the layout icons' tooltips (layoutTooltip flag, host-styling FE_02): hovering or focusing a
// container's layout icon shows its name over what it does, beside the icon, instead of the layout popover. Real
// <vb-region> frames from the fixture ledger, drawn as the board draws them (on the top line, and in the rail) and
// opened through the element's own `showPanel`, which shows the tip as hover or focus does. The hint is the icon's
// accessible description whether or not the tip shows. The popover's own samples (region-section.ts, rail-section.ts)
// are drawn with the flag off.
import type { Mode } from '#format';
import { MODES } from '#format';
import type { VbRegionElement } from '#ui';
import { MODE_HINT, MODE_LABEL, regionState } from '#ui';
import { el, group, ownIds } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { FRAME_PREFIX } from './fixture.ts';

/** One frame of the fixture's grid container, drawn under a sample id of its own, with `mode`'s tip open. */
function frame(id: string, mode: Mode, fx: Fixture, rail: boolean): VbRegionElement {
  const region = fx.view.regions.find((r) => r.id === `${FRAME_PREFIX}grid`)!;
  const node = document.createElement('vb-region') as VbRegionElement;
  node.render({ ...region, id, title: `${MODE_LABEL[mode]} tooltip` }, { ...ownIds(), layoutTooltip: true, ...(rail && { rail: true, widths: true }) });
  node.update(regionState(region, fx.view, fx.state, new Set(fx.view.nodes.map((n) => n.id))));
  node.querySelector<HTMLElement>('.vb-region-empty')!.hidden = true;
  if (rail) node.dataset.sample = 'tall';
  node.showPanel('modes', { mode, focus: false });
  return node;
}

export function layoutTipSection(body: HTMLElement, fx: Fixture): void {
  const top = el('div', 'g-frames vb-ground');
  top.append(frame('tip-top', 'flow', fx, false));
  const rail = el('div', 'g-frames g-rail-frames vb-ground');
  rail.append(frame('tip-rail-lanes', 'lanes', fx, true), frame('tip-rail-row', 'row', fx, true));
  const box = group('Layout tooltip',
    'Each layout icon shows a tip on hover and on keyboard focus: the layout\'s name over what it does ('
    + MODES.map((m) => `${MODE_LABEL[m]}: ${MODE_HINT[m].toLowerCase()}`).join('; ')
    + '). It sits beside the icon, never over it: below it on the top line, to its right in the rail. Esc dismisses it, the pointer may move onto it, and '
    + 'the hint is the icon\'s accessible description whether or not the tip shows. The big layout popover does not open (layoutTooltip flag; off, it opens as before).',
    top, rail);
  box.classList.add('g-tip-group');
  body.append(box);
}
