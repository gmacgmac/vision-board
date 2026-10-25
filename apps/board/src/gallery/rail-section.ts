// Gallery entry for the container tool rail (toolRail flag; cortex-tasks/board/2026-10-25_board-ui_
// container-tool-rail.md): a container's tools in a slim rail on the frame's left edge, the top line
// holding only the label. A tall frame's full rail at rest (dimmed) and lit; a short frame's collapsed
// rail (the checked layout, Comment, the cog) at rest and expanded over the cards; the narrowest rail
// (the cog, and Comment while its badge shows); the layout popover and the settings menu open to the
// right of the rail; and Later's rail, only the cog. Real <vb-region> frames from the fixture ledger,
// rendered with `rail` as the board renders them and updated with `regionState`; the hovered look is
// drawn with `data-look` on the rail, as the other samples draw theirs. Each frame takes a sample id of
// its own, so no id is on the page twice. Shown only with the flag on, so ?flags=-toolRail draws the
// gallery as it was.
import { LATER_REGION } from '../../../../packages/format/src/index.ts';
import type { Region, View } from '../../../../packages/format/src/index.ts';
import type { BoardState } from '../../../../packages/actions/src/index.ts';
import { placedView } from '../../../../packages/actions/src/index.ts';
import type { VbRegionElement } from '../../../../packages/ui/src/index.ts';
import { regionState } from '../../../../packages/ui/src/index.ts';
import { LATER_FRAME } from '../board/render.ts';
import { el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { FRAME_PREFIX } from './fixture.ts';

/** A sample's height on screen: tall enough for the full rail, short (collapsed), shortest (narrowest). */
type Height = 'tall' | 'short' | 'shortest';

interface Sample {
  id: string;
  height: Height;
  /** The hovered look: lit, and a collapsed rail expanded. */
  lit?: true;
  open?: { what: 'modes'; mode: 'flow' } | { what: 'menu' };
}

/** Draw one frame of `region` (from `view` and `state`) under the sample id. */
function frame(s: Sample, region: Region, view: View, state: BoardState, owed?: ReadonlySet<string>, fixed = false): VbRegionElement {
  const f = document.createElement('vb-region') as VbRegionElement;
  f.render({ ...region, id: `rail-${s.id}` }, fixed ? { ...LATER_FRAME, rail: true } : { rail: true, widths: true });
  f.update(regionState(region, view, state, new Set(view.nodes.map((n) => n.id)), undefined, owed));
  f.querySelector<HTMLElement>('.vb-region-empty')!.hidden = true;
  f.dataset.sample = s.height;
  if (s.lit) f.querySelector('.vb-region-tools')!.setAttribute('data-look', 'hover');
  if (s.open) f.showPanel(s.open.what, { ...(s.open.what === 'modes' && { mode: s.open.mode }), focus: false });
  return f;
}

const frames = (...fs: HTMLElement[]) => {
  const box = el('div', 'g-frames g-rail-frames vb-ground');
  box.append(...fs);
  return box;
};

export function railSection(fx: Fixture): HTMLElement {
  const grid = fx.view.regions.find((r) => r.id === `${FRAME_PREFIX}grid`)!;
  const draw = (s: Sample) => frame(s, grid, fx.view, fx.state);
  const notes = fx.containerNotes;
  const badged = notes.view.regions.find((r) => r.id === 'n-narrow')!;
  const later = placedView(fx.view, fx.state);
  const laterRegion = later.regions.find((r) => r.id === LATER_REGION)!;
  const box = el('section', 'g-section');
  box.dataset.feature = 'toolRail';
  box.setAttribute('aria-labelledby', 'feature-toolRail');
  const heading = el('h2', 'g-title', 'Container tool rail');
  heading.id = 'feature-toolRail';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'vb-region[data-rail] .vb-region-rail > .vb-region-tools'), ' · feature flag toolRail, on by default · off with ?flags=-toolRail');
  box.append(heading,
    el('p', 'g-desc', 'A container\'s tools (the six layouts, Match card widths, Comment and the settings cog) sit in a slim rail across '
      + 'the frame\'s left border, so the top line holds only the title, centred, with the whole line for it. The rail keeps one '
      + 'size on screen at every zoom and never reaches a card or the next container.'),
    meta,
    group('At rest and lit', 'At rest the icons are dimmed (--vb-rail-rest, still APCA Lc 30 or more); hovered, focused or with a '
      + 'popover open they are at full strength. A touch screen never dims them.',
    frames(draw({ id: 'rest', height: 'tall' }), draw({ id: 'lit', height: 'tall', lit: true }))),
    group('A short frame', 'With no room for the whole rail it keeps the checked layout, Comment and the cog. Hovered or focused it '
      + 'expands upward over the cards, so Comment and the cog stay under the pointer, and collapses on leave, blur or Esc.',
    frames(draw({ id: 'collapsed', height: 'short' }), draw({ id: 'expanded', height: 'short', lit: true }))),
    group('The narrowest', 'Only the cog, and Comment while its badge shows (an unsent or a waiting note); the badge is never dimmed.',
      frames(draw({ id: 'narrowest', height: 'shortest' }),
        frame({ id: 'badged', height: 'shortest' }, badged, notes.view, notes.state, notes.owed))),
    group('Popovers', 'The layout popover and the settings menu open to the right of the rail, over the cards, top-aligned with '
      + 'what opened them: the layouts, the cog.',
    frames(draw({ id: 'modes', height: 'tall', open: { what: 'modes', mode: 'flow' } }), draw({ id: 'menu', height: 'tall', open: { what: 'menu' } }))),
    group('Later', 'The board sets Later\'s layout, so its rail holds only the cog.',
      frames(frame({ id: 'later', height: 'short' }, laterRegion, later, fx.state, undefined, true))));
  return box;
}
