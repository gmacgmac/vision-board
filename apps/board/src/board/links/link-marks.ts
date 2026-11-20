// Link labels' short tags (field report batch 3 ruling 3, point 646, linkLabels flag): where a link's label fits
// nowhere on or beside its line (`Route.labelAt.fits` false), a short tag sits on the line near the source: its first
// words and an ellipsis (`labelAt.short`), on the canvas colour with a hairline border, in a 24px target. Hovering or
// focusing it floats the whole label above everything; in print the tag shows the whole label, wrapped in the room the
// layout gives it (`labelAt.room`).
// Never a bare dot. The tags are buttons in their own layer of the world, outside the connectors' SVG (which is hidden
// from assistive tech): each is reachable by Tab after the cards, named with its link and label, and its tip follows
// the shared hover tip (packages/ui/src/tip/hover-tip.ts, WCAG 1.4.13: hoverable, persistent, Esc dismisses). The tip
// and the tag's words are for the eye; the name carries the words. Only a tag whose place or words changed is
// written, as the connectors are (wires.ts).
import type { Route } from '#layout';
import { labelSize } from '#layout';
import { bindHoverTip } from '#ui';
import * as cardsWords from '../words/cards.ts';

export interface LinkMarks {
  /** One short tag per route whose label did not fit, in route order. */
  draw(routes: readonly Route[]): void;
  clear(): void;
}

interface Mark { host: HTMLElement; look: string }

/** The tag's name: the link and its whole label. */
export const markName = (r: Route): string => cardsWords.linkFromTo(r.from, r.to, r.label ?? '');

/** The routes that take a short tag. */
export const marked = (routes: readonly Route[]): Route[] => routes.filter((r) => r.label && r.labelAt && !r.labelAt.fits);

function create(): HTMLElement {
  const host = document.createElement('span');
  host.className = 'vb-link-mark';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'vb-link-mark-btn';
  // The tag's words on screen, and the whole label shown in their place in print.
  for (const cls of ['vb-link-short', 'vb-link-whole']) button.append(Object.assign(document.createElement('span'), { className: cls }));
  const tip = document.createElement('span');
  tip.className = 'vb-tip vb-link-tip';
  tip.setAttribute('aria-hidden', 'true');
  host.append(button, tip);
  bindHoverTip(host, { anchor: '.vb-link-mark-btn', tip: '.vb-link-tip', group: ':host', attr: 'data-tip-open' });
  return host;
}

/** Write `r`'s tag into `host`: its place, name and words. Returns the short words' element, to fit once in the page. */
function write(host: HTMLElement, r: Route): HTMLElement {
  const at = r.labelAt!;
  const short = at.short ?? r.label!;
  host.style.transform = `translate(${at.x}px, ${at.y}px)`;
  const button = host.querySelector('button')!;
  button.setAttribute('aria-label', markName(r));
  const [cut, whole] = button.children as HTMLCollectionOf<HTMLElement>;
  // No wider than the layout kept for it (labelSize), as a tag on its line is.
  cut!.textContent = short;
  cut!.style.maxWidth = `${labelSize(short).w}px`;
  cut!.style.letterSpacing = '';
  whole!.textContent = r.label!;
  // On paper: wrapped in the room the layout found clear of the cards and the arrowhead, centred on it (VERIFY_01 fix).
  whole!.style.maxWidth = at.room ? `${at.room.w}px` : '';
  host.style.setProperty('--vb-room-dx', `${at.room ? at.room.x - at.x : 0}px`);
  host.querySelector('.vb-link-tip')!.textContent = r.label!;
  return cut!;
}

/** Close a tag's letters up when the page's font runs its words wider than the layout kept for them (a read: call it
 *  once the writes are done), as fitLabel squeezes a label on its line; the ellipsis cut is the last resort. */
function fit(cut: HTMLElement): void {
  const over = cut.scrollWidth - cut.clientWidth;
  if (over > 0) cut.style.letterSpacing = `${-(over / Math.max(1, cut.textContent!.length)).toFixed(2)}px`;
}

export function createLinkMarks(layer: HTMLElement): LinkMarks {
  const marks = new Map<string, Mark>();
  return {
    draw(routes) {
      const want = marked(routes);
      const live = new Set(want.map((r) => `${r.from}>${r.to}`));
      for (const [key, m] of marks) {
        if (live.has(key)) continue;
        m.host.remove();
        marks.delete(key);
      }
      let prev: Element | null = null;
      const fresh: HTMLElement[] = [];
      for (const r of want) {
        const key = `${r.from}>${r.to}`;
        let m = marks.get(key);
        if (!m) marks.set(key, (m = { host: create(), look: '' }));
        const at = r.labelAt!;
        const look = `${at.x},${at.y}|${at.short ?? ''}|${at.room ? `${at.room.x},${at.room.w}` : ''}|${r.label}`;
        if (m.look !== look) {
          fresh.push(write(m.host, r));
          m.look = look;
        }
        const next: Element | null = prev ? prev.nextElementSibling : layer.firstElementChild;
        if (next !== m.host) layer.insertBefore(m.host, next);
        prev = m.host;
      }
      layer.hidden = marks.size === 0;
      fresh.forEach(fit);
    },
    clear() {
      layer.replaceChildren();
      marks.clear();
      layer.hidden = true;
    },
  };
}
