// Gallery samples for notes on a whole container and moving containers (3_FE_04): the title
// line's grip and Comment at rest, hovered, focused and pressed; the note pin and the "Your note"
// line before and after a Send; Comment drawn open while the note bubble is up; a frame being
// dragged; and the cog's Put container back disabled (never moved) and enabled (moved). Every
// frame is a real <vb-region> updated with `regionState` from the fixture ledger's containers
// board, exactly as the board does; a look the pointer or focus would give is drawn with
// `data-look` (or the row's `data-hover`), since only one element can hold them for real.
import type { VbRegionElement } from '../../../../packages/ui/src/index.ts';
import { regionState } from '../../../../packages/ui/src/index.ts';
import { el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';

type Look = 'hover' | 'focus' | 'pressed';

/** What each frame draws beyond its ledger state. */
interface Extra {
  look?: Look;
  menu?: true;
  noteOpen?: true;
  dragging?: true;
}

/** Keyed by region id on the containers board. */
const EXTRA: Record<string, Extra> = {
  'c-rest': { menu: true },
  'c-hover': { look: 'hover' },
  'c-focus': { look: 'focus' },
  'c-pressed': { look: 'pressed' },
  'c-open': { noteOpen: true },
  'c-moved': { menu: true },
  'c-dragging': { dragging: true },
};

function lookOf(f: VbRegionElement, look: Look): void {
  f.querySelector('.vb-region-grip')?.setAttribute('data-look', look);
  const comment = f.querySelector('.vb-region-comment');
  if (look === 'hover') comment?.toggleAttribute('data-hover', true);
  else comment?.setAttribute('data-look', look);
  if (look !== 'pressed') f.querySelector('.vb-region-note-pin:not([hidden])')?.setAttribute('data-look', look);
}

function frame(id: string, fx: Fixture): VbRegionElement {
  const { view, state } = fx.containers;
  const region = view.regions.find((r) => r.id === id)!;
  const f = document.createElement('vb-region') as VbRegionElement;
  f.render(region);
  f.update(regionState(region, view, state, new Set(view.nodes.map((n) => n.id))));
  const extra = EXTRA[id] ?? {};
  if (extra.look) lookOf(f, extra.look);
  if (extra.noteOpen) f.setNoteOpen(true);
  if (extra.dragging) f.toggleAttribute('data-dragging', true);
  return f;
}

export function containerSamples(body: HTMLElement, fx: Fixture): void {
  const frames = el('div', 'g-frames vb-ground');
  const drawn = fx.containers.view.regions.map((r) => frame(r.id, fx));
  frames.append(...drawn);
  for (const f of drawn) if (EXTRA[f.dataset.region!]?.menu) f.showPanel('menu', { focus: false });
  body.append(group('Notes on a container, and moving it',
    'The grip at the start of the title line moves the container; Comment, beside the cog, opens its note. '
    + '"Hover", "Focus" and "Pressed" draw the grip, Comment and the note pin in that look. A saved note shows as a '
    + 'numbered pin and a "Your note" line; once sent, the pin is quiet and the line says Sent. "Note open" is how '
    + 'the title line looks while its bubble is up. The cog\'s menu is open on "At rest" (Put container back '
    + 'disabled: not moved) and on "Moved" (enabled).', frames));
}
