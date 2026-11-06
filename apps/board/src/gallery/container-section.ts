// Gallery samples for notes on a whole container and moving containers (3_FE_04): the title
// line's grip (with the title, one hover tint: FE_02) and Comment at rest, hovered, focused and pressed; every container-note state of
// step 4G: Comment's badge with no note, unsent (bright), sent and waiting (quiet) and answered
// (none); the note preview open by hover and by keyboard focus; the note block shown in the
// container, short and long (cut at 3 lines with "Show all"); a narrow frame with a badge; Comment
// drawn open while the note bubble is up; a frame being dragged; and the cog's Put container back
// disabled (never moved) and enabled (moved). The discard confirm is the shell's dialog, not a
// state of this pattern. Every frame is a real <vb-region> updated with `regionState` from the
// fixture ledger's container boards, `owed` included, exactly as the board does; a look the
// pointer or focus would give is drawn with `data-look` (or the row's `data-hover`), since only
// one element can hold them for real.
import type { VbRegionElement } from '#ui';
import { regionState } from '#ui';
import { el, group, ownIds } from './dom.ts';
import type { Containers, Fixture } from './fixture.ts';

type Look = 'hover' | 'focus' | 'pressed';

/** What each frame draws beyond its ledger state. */
interface Extra {
  look?: Look;
  menu?: true;
  noteOpen?: true;
  dragging?: true;
  /** The note preview open under Comment (as hover or focus opens it). */
  preview?: true;
  /** The note block shown in the container (Show in container). */
  shown?: true;
}

/** Keyed by region id on the two container boards. */
const EXTRA: Record<string, Extra> = {
  'c-rest': { menu: true },
  'c-hover': { look: 'hover', preview: true },
  'c-focus': { look: 'focus', preview: true },
  'c-pressed': { look: 'pressed' },
  'c-open': { noteOpen: true },
  'c-moved': { menu: true },
  'c-dragging': { dragging: true },
  'c-sent': { shown: true },
  'n-long': { shown: true },
};

function lookOf(f: VbRegionElement, look: Look): void {
  f.querySelector('.vb-region-grip')?.setAttribute('data-look', look);
  // Hovering the grip or the title tints the whole handle (open list and container title FE_02).
  if (look === 'hover') f.querySelector('.vb-region-handle')?.setAttribute('data-look', look);
  const comment = f.querySelector('.vb-region-comment');
  if (look === 'hover') comment?.toggleAttribute('data-hover', true);
  else comment?.setAttribute('data-look', look);
}

function frame(id: string, board: Containers): VbRegionElement {
  const { view, state, owed } = board;
  const region = view.regions.find((r) => r.id === id)!;
  const f = document.createElement('vb-region') as VbRegionElement;
  f.render(region, { ...ownIds(), layoutTooltip: false }); // the popover above the row is read here (container-polish.spec.ts); layout-tip-section.ts shows the tooltip
  f.update(regionState(region, view, state, new Set(view.nodes.map((n) => n.id)), undefined, owed));
  const extra = EXTRA[id] ?? {};
  if (extra.look) lookOf(f, extra.look);
  if (extra.noteOpen) f.setNoteOpen(true);
  if (extra.dragging) f.toggleAttribute('data-dragging', true);
  if (extra.preview) f.toggleAttribute('data-preview', true);
  if (extra.shown) f.noteShown = true;
  return f;
}

/** One board's frames on the canvas; the cog's menu drawn open where EXTRA asks for it. */
function frames(board: Containers): HTMLElement {
  const box = el('div', 'g-frames vb-ground');
  const drawn = board.view.regions.map((r) => frame(r.id, board));
  box.append(...drawn);
  for (const f of drawn) if (EXTRA[f.dataset.region!]?.menu) f.showPanel('menu', { focus: false });
  return box;
}

export function containerSamples(body: HTMLElement, fx: Fixture): void {
  body.append(group('Notes on a container, and moving it',
    'A drag on the grip, the title or the count moves the container; Comment, beside the cog, opens its note. '
    + '"Hover", "Focus" and "Pressed" draw the grip and Comment in that look (hovered, the grip and the title '
    + 'tint together). A note gives Comment a badge "1": '
    + 'bright while unsent, quiet once sent. "Hover" has the note preview open as the pointer opens it, "Focus" '
    + 'as keyboard focus does; "Note sent" shows its note in the container. "Note open" is how '
    + 'the title line looks while its bubble is up. The cog\'s menu is open on "At rest" (Put container back '
    + 'disabled: not moved) and on "Moved" (enabled).', frames(fx.containers)));
  body.append(group('Container note states',
    '"Answered": the agent replied to the sent note, so Comment has no badge. "Long note": the note block '
    + 'cuts its text at 3 lines and offers "Show all", with Edit and Remove while unsent. "Narrow": the badge '
    + 'on a frame near the smallest width. Changed words in the bubble ask "Discard your changes?" in the '
    + 'shell\'s own confirm dialog, which is not part of this pattern.', frames(fx.containerNotes)));
}
